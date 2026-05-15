import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.media import MediaFile
from app.models.post import Post
from app.models.topic_set import SetMembership

router = APIRouter()


def _parse_uuid_csv(value: str | None, field_name: str) -> list[uuid.UUID]:
    """Parse a comma-separated list of UUIDs. Raises 400 if any value is invalid."""
    if not value:
        return []
    parsed: list[uuid.UUID] = []
    for raw in value.split(","):
        raw = raw.strip()
        if not raw:
            continue
        try:
            parsed.append(uuid.UUID(raw))
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid UUID '{raw}' in {field_name}: {exc}",
            )
    return parsed


def _parse_csv(value: str | None) -> list[str]:
    """Parse a generic comma-separated list of trimmed, non-empty strings."""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@router.get("")
async def list_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    platform: str | None = Query(None, description="Single platform or comma-separated list"),
    source_id: str | None = Query(None, description="Single UUID or comma-separated list (OR semantics)"),
    set_id: str | None = Query(None, description="Single UUID or comma-separated list (OR semantics)"),
    untagged: bool = Query(False, description="If true, return only posts with no set memberships"),
    q: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    has_media: bool | None = Query(None),
    has_video: bool | None = Query(None),
    sort: str = Query("newest"),
    db: AsyncSession = Depends(get_db),
):
    # Parse CSV params up-front so validation errors surface before any query work.
    platforms = _parse_csv(platform)
    source_ids = _parse_uuid_csv(source_id, "source_id")
    set_ids = _parse_uuid_csv(set_id, "set_id")

    # Decision: if both set_id and untagged=true are passed, the request is logically
    # contradictory (asking for posts in specific sets AND posts in no set). Return an
    # empty result set rather than 400 — keeps clients defensive code simpler and lets
    # the UI render an empty state. Documented here so the choice is intentional.
    if set_ids and untagged:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "per_page": per_page,
        }

    query = select(Post).options(
        selectinload(Post.media_files),
        selectinload(Post.set_memberships),
    )
    count_query = select(func.count(func.distinct(Post.id)))

    # Filters
    if platforms:
        if len(platforms) == 1:
            query = query.where(Post.platform == platforms[0])
            count_query = count_query.where(Post.platform == platforms[0])
        else:
            query = query.where(Post.platform.in_(platforms))
            count_query = count_query.where(Post.platform.in_(platforms))
    if source_ids:
        if len(source_ids) == 1:
            query = query.where(Post.source_id == source_ids[0])
            count_query = count_query.where(Post.source_id == source_ids[0])
        else:
            query = query.where(Post.source_id.in_(source_ids))
            count_query = count_query.where(Post.source_id.in_(source_ids))
    if set_ids:
        # Use a correlated EXISTS subquery so the row set doesn't fan out across
        # multiple SetMembership matches (a post in 3 of the requested sets would
        # otherwise appear 3 times).
        membership_subq = (
            select(SetMembership.id)
            .where(SetMembership.post_id == Post.id)
            .where(SetMembership.set_id.in_(set_ids))
        )
        query = query.where(membership_subq.exists())
        count_query = count_query.where(membership_subq.exists())
    if untagged:
        no_membership_subq = (
            select(SetMembership.id)
            .where(SetMembership.post_id == Post.id)
        )
        query = query.where(~no_membership_subq.exists())
        count_query = count_query.where(~no_membership_subq.exists())
    if q:
        ts_query = or_(
            text("to_tsvector('spanish', coalesce(posts.text_content, '')) @@ plainto_tsquery('spanish', :q)"),
            text("to_tsvector('english', coalesce(posts.text_content, '')) @@ plainto_tsquery('english', :q)"),
        )
        query = query.where(ts_query).params(q=q)
        count_query = count_query.where(ts_query).params(q=q)
    if date_from:
        query = query.where(Post.post_timestamp >= date_from)
        count_query = count_query.where(Post.post_timestamp >= date_from)
    if date_to:
        query = query.where(Post.post_timestamp <= date_to)
        count_query = count_query.where(Post.post_timestamp <= date_to)
    if has_media is True:
        query = query.where(Post.media_downloaded.is_(True))
        count_query = count_query.where(Post.media_downloaded.is_(True))
    if has_video is True:
        media_sub = select(MediaFile.post_id).where(MediaFile.media_type == "video").distinct()
        query = query.where(Post.id.in_(media_sub))
        count_query = count_query.where(Post.id.in_(media_sub))

    # Sorting
    if sort == "oldest":
        query = query.order_by(Post.post_timestamp.asc())
    elif sort == "engagement":
        query = query.order_by(text("(engagement->>'likes')::int DESC NULLS LAST"))
    else:
        query = query.order_by(Post.post_timestamp.desc().nullslast())

    # Pagination
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    posts = result.scalars().unique().all()

    return {
        "items": [_serialize_post(p) for p in posts],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{post_id}")
async def get_post(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.media_files),
            selectinload(Post.notes),
            selectinload(Post.expanded_links),
            selectinload(Post.set_memberships),
            selectinload(Post.source),
        )
        .where(Post.id == post_id)
    )
    post = result.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return _serialize_post_detail(post)


def _serialize_post(post: Post) -> dict:
    return {
        "id": str(post.id),
        "source_id": str(post.source_id),
        "platform": post.platform,
        "platform_post_id": post.platform_post_id,
        "post_url": post.post_url,
        "text_content": post.text_content,
        "content_language": post.content_language,
        "post_timestamp": post.post_timestamp.isoformat() if post.post_timestamp else None,
        "engagement": post.engagement,
        "platform_data": post.platform_data,
        "media_downloaded": post.media_downloaded,
        "mhtml_captured": post.mhtml_captured,
        "screenshot_captured": post.screenshot_captured,
        "mhtml_path": post.mhtml_path,
        "screenshot_path": post.screenshot_path,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "media_files": [
            {
                "id": str(m.id),
                "media_type": m.media_type,
                "file_path": m.file_path,
                "mime_type": m.mime_type,
                "width": m.width,
                "height": m.height,
                "duration_secs": m.duration_secs,
                "ordinal": m.ordinal,
            }
            for m in (post.media_files or [])
        ],
        "set_ids": [str(sm.set_id) for sm in (post.set_memberships or [])],
    }


def _serialize_post_detail(post: Post) -> dict:
    data = _serialize_post(post)
    data["raw_metadata"] = post.raw_metadata
    data["hashes_computed"] = post.hashes_computed
    data["updated_at"] = post.updated_at.isoformat() if post.updated_at else None
    data["notes"] = [
        {
            "id": str(n.id),
            "text": n.text,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        for n in (post.notes or [])
    ]
    data["expanded_links"] = [
        {
            "short_url": link.short_url,
            "expanded_url": link.expanded_url,
            "domain": link.domain,
        }
        for link in (post.expanded_links or [])
    ]
    if post.source:
        data["source_username"] = post.source.username
        data["source_display_name"] = post.source.display_name
        data["source_avatar_url"] = post.source.avatar_url
    return data
