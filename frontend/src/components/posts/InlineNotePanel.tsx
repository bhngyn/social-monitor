"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/utils";
import type { PostNote } from "@/lib/types";

interface InlineNotePanelProps {
  postId: string;
  onMutate?: () => void;
}

export function InlineNotePanel({ postId, onMutate }: InlineNotePanelProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    data: notes,
    mutate: revalidateNotes,
    isLoading,
  } = useSWR<PostNote[]>(
    ["notes", postId],
    () => apiFetch<PostNote[]>(`/posts/${postId}/notes`),
    { revalidateOnFocus: false }
  );

  const visible = notes?.slice(0, 2) ?? [];
  const totalCount = notes?.length ?? 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await apiFetch(`/posts/${postId}/notes`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setDraft("");
      await revalidateNotes();
      onMutate?.();
    } catch {
      // best-effort UX; swallow for now
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
      await revalidateNotes();
      onMutate?.();
    } catch {
      /* noop */
    }
  }

  return (
    <div
      className="mt-3 rounded-b-lg border-t border-border bg-muted/50 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {isLoading && (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      )}

      {!isLoading && visible.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("notes")}: 0</p>
      )}

      <ul className="space-y-2">
        {visible.map((note) => (
          <li
            key={note.id}
            className="flex items-start justify-between gap-2 rounded border border-border bg-card p-2 text-sm text-card-foreground"
          >
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words">{note.text}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {formatRelativeTime(note.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => handleDelete(note.id, e)}
              aria-label={t("delete")}
              title={t("delete")}
              className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>

      {totalCount > visible.length && (
        <div className="mt-2">
          <Link
            href={`/posts/${postId}`}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            Show all {totalCount} {t("notes").toLowerCase()}
          </Link>
        </div>
      )}

      <form className="mt-3 flex flex-col gap-2" onSubmit={handleSave}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("writeNote")}
          rows={2}
          className="w-full resize-none rounded border border-border bg-card px-2 py-1.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!draft.trim() || saving}
            className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {saving ? t("loading") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
