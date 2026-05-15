"use client";

import { useState, useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Tag,
  MessageSquare,
  ExternalLink,
  Plus,
  Check,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Post, TopicSet } from "@/lib/types";

interface PostCardActionsProps {
  post: Post;
  availableSets?: TopicSet[];
  onMutate?: () => void;
  onToggleNotes: () => void;
}

const PASTEL_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function randomPastel() {
  return PASTEL_PALETTE[Math.floor(Math.random() * PASTEL_PALETTE.length)];
}

export function PostCardActions({
  post,
  availableSets = [],
  onMutate,
  onToggleNotes,
}: PostCardActionsProps) {
  const { t } = useI18n();
  const [tagOpen, setTagOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  const filteredSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableSets;
    return availableSets.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableSets, query]);

  async function toggleSet(set: TopicSet, isMember: boolean) {
    if (busyId) return;
    setBusyId(set.id);
    try {
      if (isMember) {
        await apiFetch(`/sets/${set.id}/posts/${post.id}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch(`/sets/${set.id}/posts`, {
          method: "POST",
          body: JSON.stringify({ post_ids: [post.id] }),
        });
      }
      onMutate?.();
    } catch {
      /* noop */
    } finally {
      setBusyId(null);
    }
  }

  async function createAndAssign(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const name = newName.trim();
    if (!name || savingNew) return;
    setSavingNew(true);
    try {
      const created = await apiFetch<TopicSet>("/sets", {
        method: "POST",
        body: JSON.stringify({ name, color: randomPastel() }),
      });
      await apiFetch(`/sets/${created.id}/posts`, {
        method: "POST",
        body: JSON.stringify({ post_ids: [post.id] }),
      });
      setNewName("");
      setCreating(false);
      onMutate?.();
    } catch {
      /* noop */
    } finally {
      setSavingNew(false);
    }
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="flex items-center gap-1"
      onClick={stop}
    >
      <Popover.Root open={tagOpen} onOpenChange={setTagOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={t("addToSet")}
            title={t("addToSet")}
            className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Tag size={12} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={6}
            onClick={stop}
            className="z-50 w-64 rounded-md border border-border bg-card p-2 text-card-foreground shadow-lg outline-none"
          >
            <div className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1">
              <Search size={12} className="text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("setName")}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="mt-2 max-h-56 overflow-y-auto">
              {filteredSets.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">
                  {t("noSetsYet")}
                </p>
              )}
              <ul>
                {filteredSets.map((s) => {
                  const isMember = post.set_ids?.includes(s.id);
                  const isBusy = busyId === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleSet(s, !!isMember)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="flex-1 truncate">{s.name}</span>
                        {isMember && (
                          <Check
                            size={12}
                            className="shrink-0 text-blue-600 dark:text-blue-400"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-2 border-t border-border pt-2">
              {!creating ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="inline-flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus size={12} />
                  {t("createNewSetAction")}
                </button>
              ) : (
                <form onSubmit={createAndAssign} className="flex gap-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("setName")}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newName.trim() || savingNew}
                    className="rounded bg-foreground px-2 py-1 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {t("save")}
                  </button>
                </form>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleNotes();
        }}
        aria-label={t("addNote")}
        title={t("addNote")}
        className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MessageSquare size={12} />
      </button>

      {post.post_url && (
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          aria-label={t("original")}
          title={t("original")}
          className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
