import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.note import PostNote
from app.models.post import Post

router = APIRouter()


@router.get("/posts/{post_id}/notes")
async def list_notes(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(PostNote).where(PostNote.post_id == post_id).order_by(PostNote.created_at.desc())
    )
    return result.scalars().all()


@router.post("/posts/{post_id}/notes", status_code=201)
async def create_note(post_id: uuid.UUID, data: dict, db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    note = PostNote(post_id=post_id, text=data["text"])
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.patch("/notes/{note_id}")
async def update_note(note_id: uuid.UUID, data: dict, db: AsyncSession = Depends(get_db)):
    note = await db.get(PostNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if "text" in data:
        note.text = data["text"]
    note.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    note = await db.get(PostNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
