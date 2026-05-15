"""Download media files (images via httpx, videos via yt-dlp)."""

import hashlib
import os
import shutil
import signal
import subprocess
import tempfile
import uuid
from pathlib import Path

import httpx

from app.worker.celery_app import celery_app

ALLOWED_RESOLUTIONS = {"240", "360", "480", "720", "1080", "1440", "2160", "best"}


@celery_app.task(
    name="app.worker.tasks.media_download.download_post_media",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="media",
)
def download_post_media(self, post_id: str):
    """Download all media for a post."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from datetime import datetime, timezone

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.post import Post
        from app.models.media import MediaFile
        from app.models.audit import AuditLog

        post = session.get(Post, uuid.UUID(post_id))
        if not post:
            return {"error": "Post not found"}

        archive_root = os.environ.get("ARCHIVE_ROOT", "/data/archive")
        post_dir = Path(archive_root) / post.platform / post.platform_post_id / "media"
        post_dir.mkdir(parents=True, exist_ok=True)

        # Get source config for download controls
        source = post.source
        config = source.config or {} if source else {}
        download_video = config.get("download_video", True)
        download_images = config.get("download_images", True)
        max_video_duration = int(os.environ.get("MAX_VIDEO_DURATION", "0"))
        max_video_filesize = os.environ.get("MAX_VIDEO_FILESIZE", "524288000")
        max_video_resolution = os.environ.get("MAX_VIDEO_RESOLUTION", "best")
        if max_video_resolution not in ALLOWED_RESOLUTIONS:
            max_video_resolution = "best"

        # Extract media URLs from raw metadata
        media_urls = _extract_media_urls(post.platform, post.raw_metadata, post.platform_data)

        for idx, media_info in enumerate(media_urls):
            url = media_info["url"]
            media_type = media_info["type"]

            try:
                if media_type == "video" and download_video:
                    file_path = _download_video(
                        url, post_dir, post.platform_post_id, idx,
                        max_filesize=max_video_filesize,
                        max_resolution=max_video_resolution,
                        max_duration=max_video_duration,
                    )
                elif media_type in ("image", "gif") and download_images:
                    file_path = _download_image(url, post_dir, idx)
                else:
                    continue

                if file_path and file_path.exists():
                    rel_path = str(file_path.relative_to(archive_root))
                    stat = file_path.stat()

                    media_file = MediaFile(
                        post_id=post.id,
                        media_type=media_type,
                        original_url=url,
                        file_path=rel_path,
                        file_size=stat.st_size,
                        mime_type=media_info.get("mime_type"),
                        width=media_info.get("width"),
                        height=media_info.get("height"),
                        duration_secs=media_info.get("duration"),
                        ordinal=idx,
                    )
                    session.add(media_file)

            except Exception as e:
                # Log error but continue with other media
                from app.models.audit import AuditLog
                audit = AuditLog(
                    event_type="media_download_error",
                    entity_type="post",
                    entity_id=post_id,
                    details={"url": url, "error": str(e), "index": idx},
                )
                session.add(audit)

        post.media_downloaded = True
        post.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            event_type="media_downloaded",
            entity_type="post",
            entity_id=post_id,
            details={"media_count": len(media_urls)},
        )
        session.add(audit)
        session.commit()

        # Trigger hash computation
        from app.worker.tasks.hashing import compute_hashes
        compute_hashes.delay(post_id)

        return {"post_id": post_id, "media_downloaded": len(media_urls)}


def _download_image(url: str, dest_dir: Path, index: int) -> Path | None:
    """Download an image file via HTTP."""
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()

        # Determine extension from content-type or URL
        content_type = response.headers.get("content-type", "")
        ext = _ext_from_content_type(content_type) or _ext_from_url(url) or ".jpg"

        file_path = dest_dir / f"image_{index:03d}{ext}"
        file_path.write_bytes(response.content)
        return file_path


def _download_video(
    url: str,
    dest_dir: Path,
    post_id: str,
    index: int,
    max_filesize: str = "524288000",
    max_resolution: str = "best",
    max_duration: int = 0,
) -> Path | None:
    """Download a video using yt-dlp."""
    if max_resolution not in ALLOWED_RESOLUTIONS:
        max_resolution = "best"

    with tempfile.TemporaryDirectory(prefix="sm_video_") as tmp_dir:
        output_template = os.path.join(tmp_dir, f"video_{index:03d}.%(ext)s")

        if max_resolution != "best":
            format_str = f"bestvideo[height<={max_resolution}]+bestaudio/best[height<={max_resolution}]/best"
        else:
            format_str = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"

        cmd = [
            "nice", "-n", "10",
            "yt-dlp",
            "--no-playlist",
            "--no-overwrites",
            "--output", output_template,
            "--format", format_str,
            "--merge-output-format", "mp4",
            "--max-filesize", str(max_filesize),
            "--concurrent-fragments", "2",
            "--retries", "3",
            "--socket-timeout", "30",
        ]
        if max_duration > 0:
            cmd += ["--match-filter", f"duration <= {max_duration}"]
        cmd.append(url)

        # Use a process group so we can kill any orphaned ffmpeg children on timeout.
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        try:
            _, stderr = proc.communicate(timeout=600)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass
            proc.wait()
            raise RuntimeError("yt-dlp timed out after 600s")

        if proc.returncode != 0:
            raise RuntimeError(f"yt-dlp failed: {(stderr or '')[:500]}")

        downloaded_files = list(Path(tmp_dir).glob("video_*"))
        if not downloaded_files:
            return None

        src = downloaded_files[0]
        dst = dest_dir / src.name
        shutil.move(str(src), str(dst))
        return dst


def _extract_media_urls(platform: str, raw_metadata: dict, platform_data: dict) -> list[dict]:
    """Extract media URLs from raw Apify data based on platform.

    Field paths match actual Apify actor output schemas.
    """
    urls: list[dict] = []

    if platform == "twitter":
        # Apify tweet-scraper: entities.media[] array
        entities = raw_metadata.get("entities") or {}
        for media in entities.get("media", []):
            media_type = media.get("type", "")
            if media_type == "video":
                # Best quality variant from video_info
                variants = media.get("video_info", {}).get("variants", [])
                video_variants = [v for v in variants if v.get("bitrate") is not None]
                if video_variants:
                    best = max(video_variants, key=lambda v: v.get("bitrate", 0))
                    urls.append({"url": best.get("url", ""), "type": "video"})
            elif media_type == "animated_gif":
                variants = media.get("video_info", {}).get("variants", [])
                if variants:
                    urls.append({"url": variants[0].get("url", ""), "type": "gif"})
                else:
                    urls.append({"url": media.get("media_url_https", ""), "type": "gif"})
            elif media_type == "photo":
                urls.append({
                    "url": media.get("media_url_https", ""),
                    "type": "image",
                    "width": media.get("sizes", {}).get("large", {}).get("w"),
                    "height": media.get("sizes", {}).get("large", {}).get("h"),
                })
        # Some Apify actors put media at top level
        if not urls:
            for media in raw_metadata.get("media", []):
                if isinstance(media, dict):
                    urls.append({
                        "url": media.get("media_url_https") or media.get("url", ""),
                        "type": "video" if media.get("type") == "video" else "image",
                    })

    elif platform == "instagram":
        # Apify instagram-scraper: displayUrl for main, childPosts[] for carousels
        child_posts = raw_metadata.get("childPosts") or []
        if child_posts:
            # Carousel — each child has displayUrl and optionally videoUrl
            for i, child in enumerate(child_posts):
                if child.get("videoUrl"):
                    urls.append({
                        "url": child["videoUrl"],
                        "type": "video",
                        "width": child.get("dimensionsWidth"),
                        "height": child.get("dimensionsHeight"),
                    })
                elif child.get("displayUrl"):
                    urls.append({
                        "url": child["displayUrl"],
                        "type": "image",
                        "width": child.get("dimensionsWidth"),
                        "height": child.get("dimensionsHeight"),
                    })
        else:
            # Single post — video or image
            if raw_metadata.get("videoUrl"):
                urls.append({
                    "url": raw_metadata["videoUrl"],
                    "type": "video",
                    "width": raw_metadata.get("dimensionsWidth"),
                    "height": raw_metadata.get("dimensionsHeight"),
                })
            elif raw_metadata.get("displayUrl"):
                urls.append({
                    "url": raw_metadata["displayUrl"],
                    "type": "image",
                    "width": raw_metadata.get("dimensionsWidth"),
                    "height": raw_metadata.get("dimensionsHeight"),
                })

    elif platform == "tiktok":
        # Apify tiktok-scraper: videoMeta.downloadAddr or webVideoUrl
        video_meta = raw_metadata.get("videoMeta") or {}
        download_url = video_meta.get("downloadAddr")
        if download_url:
            urls.append({
                "url": download_url,
                "type": "video",
                "width": video_meta.get("width"),
                "height": video_meta.get("height"),
                "duration": video_meta.get("duration"),
            })
        elif raw_metadata.get("webVideoUrl"):
            # Fallback to page URL — yt-dlp can handle it
            urls.append({"url": raw_metadata["webVideoUrl"], "type": "video"})
        # Cover image as thumbnail
        cover = raw_metadata.get("coverUrl") or raw_metadata.get("originalCoverUrl")
        if cover:
            urls.append({"url": cover, "type": "image"})

    elif platform == "youtube":
        # yt-dlp handles YouTube URLs natively
        video_url = raw_metadata.get("url")
        video_id = raw_metadata.get("id") or raw_metadata.get("videoId")
        if video_url:
            urls.append({"url": video_url, "type": "video"})
        elif video_id:
            urls.append({"url": f"https://www.youtube.com/watch?v={video_id}", "type": "video"})
        # Thumbnail
        thumb = raw_metadata.get("thumbnailUrl")
        if thumb:
            urls.append({"url": thumb, "type": "image"})

    elif platform == "facebook":
        # Apify facebook-posts-scraper: postImages[], postVideos[]
        for img in raw_metadata.get("postImages", []):
            img_url = img.get("image") if isinstance(img, dict) else img
            if img_url:
                urls.append({
                    "url": img_url,
                    "type": "image",
                    "width": img.get("width") if isinstance(img, dict) else None,
                    "height": img.get("height") if isinstance(img, dict) else None,
                })
        for vid in raw_metadata.get("postVideos", []):
            vid_url = vid.get("videoUrl") if isinstance(vid, dict) else vid
            if vid_url:
                urls.append({
                    "url": vid_url,
                    "type": "video",
                    "duration": vid.get("videoLength") if isinstance(vid, dict) else None,
                })
        # Fallback: older schemas use "images" and "videoUrl"
        if not urls:
            for img in raw_metadata.get("images", []):
                img_url = img if isinstance(img, str) else (img.get("url", "") if isinstance(img, dict) else "")
                if img_url:
                    urls.append({"url": img_url, "type": "image"})
            if raw_metadata.get("videoUrl"):
                urls.append({"url": raw_metadata["videoUrl"], "type": "video"})

    return [u for u in urls if u.get("url")]


def _ext_from_content_type(content_type: str) -> str | None:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
    }
    return mapping.get(content_type.split(";")[0].strip())


def _ext_from_url(url: str) -> str | None:
    from urllib.parse import urlparse
    path = urlparse(url).path
    if "." in path:
        ext = "." + path.rsplit(".", 1)[-1].lower()
        if len(ext) <= 5:
            return ext
    return None
