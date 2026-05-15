from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from app.config import settings

router = APIRouter()

MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mhtml": "multipart/related",
    ".html": "text/html",
}


@router.get("/{file_path:path}")
async def serve_file(file_path: str, request: Request):
    # Prevent path traversal. resolve() also dereferences symlinks, so a
    # symlink inside archive_root pointing outside of it will fail the
    # containment check.
    archive_root = Path(settings.archive_root).resolve()
    try:
        full_path = (archive_root / file_path).resolve()
        full_path.relative_to(archive_root)
    except (ValueError, OSError):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    suffix = full_path.suffix.lower()
    content_type = MIME_TYPES.get(suffix, "application/octet-stream")

    # Support Range requests for video seeking
    file_size = full_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header and suffix in (".mp4", ".webm", ".mov"):
        return _range_response(full_path, range_header, file_size, content_type)

    return FileResponse(
        path=str(full_path),
        media_type=content_type,
        headers={"Accept-Ranges": "bytes"},
    )


def _range_response(path: Path, range_header: str, file_size: int, content_type: str):
    try:
        range_str = range_header.replace("bytes=", "")
        start_str, end_str = range_str.split("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
    except (ValueError, IndexError):
        raise HTTPException(status_code=416, detail="Invalid range")

    if start >= file_size:
        raise HTTPException(status_code=416, detail="Range not satisfiable")

    end = min(end, file_size - 1)
    chunk_size = end - start + 1

    def iter_file():
        with open(path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                read_size = min(8192, remaining)
                data = f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        iter_file(),
        status_code=206,
        media_type=content_type,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
        },
    )
