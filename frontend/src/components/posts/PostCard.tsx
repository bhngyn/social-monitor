"use client";

import { memo, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Repeat2,
  MessageSquare,
  FileText,
  Camera,
  Fingerprint,
} from "lucide-react";
import type { Post, TopicSet } from "@/lib/types";
import { formatRelativeTime, platformIcon, platformColor } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useReviewState, isPostNew } from "@/lib/review-state";
import { PostCardActions } from "./PostCardActions";
import { InlineNotePanel } from "./InlineNotePanel";

interface PostCardProps {
  post: Post;
  selected: boolean;
  focused?: boolean;
  onSelect: (postId: string, checked: boolean) => void;
  availableSets?: TopicSet[];
  onMutate?: () => void;
}

function PostCardImpl({
  post,
  selected,
  focused = false,
  onSelect,
  availableSets = [],
  onMutate,
}: PostCardProps) {
  const { t, tf, locale } = useI18n();
  const reviewMap = useReviewState();
  const isNew = isPostNew(post, reviewMap);
  const [notesOpen, setNotesOpen] = useState(false);

  const engagement = post.engagement ?? {};
  const likes = engagement.likes ?? engagement.favorites ?? 0;
  const shares =
    engagement.shares ?? engagement.retweets ?? engagement.reposts ?? 0;
  const comments = engagement.comments ?? engagement.replies ?? 0;

  const firstImage = post.media_files?.find(
    (f) => f.media_type === "image" || f.mime_type?.startsWith("image/")
  );
  const thumbnailSrc = firstImage
    ? firstImage.file_path
      ? `/api/files/${firstImage.file_path}`
      : firstImage.original_url
    : null;

  const memberSets = (post.set_ids ?? [])
    .map((id) => availableSets.find((s) => s.id === id))
    .filter((s): s is TopicSet => Boolean(s));

  const notesCount = post.notes_count ?? 0;
  const notesLabel =
    notesCount === 1 ? t("oneNote") : tf("notesCount", { count: notesCount });

  const showContentLanguageChip =
    !!post.content_language &&
    post.content_language.toLowerCase() !== locale.toLowerCase();

  const ringClass = focused
    ? "ring-2 ring-blue-500"
    : selected
    ? "ring-2 ring-blue-500"
    : "";

  return (
    <div
      data-post-card-id={post.id}
      data-focused={focused ? "true" : undefined}
      className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${ringClass}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(post.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select post"
            className="mt-1 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
          />

          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold ${platformColor(post.platform)}`}
                aria-hidden
              >
                {platformIcon(post.platform)}
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {post.source_username ?? post.platform_post_id}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formatRelativeTime(post.post_timestamp)}
              </span>
              {isNew && (
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t("new")}
                </span>
              )}
              {showContentLanguageChip && (
                <span className="rounded border border-border px-1.5 text-[10px] uppercase text-muted-foreground">
                  {post.content_language}
                </span>
              )}
            </div>

            {/* Body — text + thumbnail wrapped in a Link */}
            <Link
              href={`/posts/${post.id}`}
              className="block"
              onClick={(e) => {
                // Don't navigate if a child handler called stopPropagation
                if ((e.target as HTMLElement).closest("[data-no-nav]")) {
                  e.preventDefault();
                }
              }}
            >
              {post.text_content && (
                <p className="mt-2 line-clamp-3 cursor-pointer text-sm text-foreground/90 hover:text-foreground">
                  {post.text_content}
                </p>
              )}

              {thumbnailSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailSrc}
                  alt=""
                  className="mt-3 h-40 w-full rounded-md object-cover"
                />
              )}
            </Link>

            {/* Chip row: sets + notes + capture icons */}
            {(memberSets.length > 0 ||
              notesCount > 0 ||
              post.mhtml_captured ||
              post.screenshot_captured ||
              post.hashes_computed) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {memberSets.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sets/${s.id}`}
                    onClick={(e) => e.stopPropagation()}
                    data-no-nav
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: `${s.color}22`,
                      color: s.color,
                    }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </Link>
                ))}

                {notesCount > 0 && (
                  <button
                    type="button"
                    data-no-nav
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNotesOpen((v) => !v);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MessageSquare size={12} />
                    {notesLabel}
                  </button>
                )}

                {post.mhtml_captured && (
                  <span
                    className="inline-flex items-center text-muted-foreground"
                    title={t("mhtmlCapturedBadge")}
                    aria-label={t("mhtmlCapturedBadge")}
                  >
                    <FileText size={12} />
                  </span>
                )}
                {post.screenshot_captured && (
                  <span
                    className="inline-flex items-center text-muted-foreground"
                    title={t("screenshotCaptured")}
                    aria-label={t("screenshotCaptured")}
                  >
                    <Camera size={12} />
                  </span>
                )}
                {post.hashes_computed && (
                  <span
                    className="inline-flex items-center text-muted-foreground"
                    title={t("hashesComputed")}
                    aria-label={t("hashesComputed")}
                  >
                    <Fingerprint size={12} />
                  </span>
                )}
              </div>
            )}

            {/* Footer: engagement + actions */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Heart size={13} /> {likes.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Repeat2 size={13} /> {shares.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={13} /> {comments.toLocaleString()}
                </span>
              </div>
              <div data-no-nav>
                <PostCardActions
                  post={post}
                  availableSets={availableSets}
                  onMutate={onMutate}
                  onToggleNotes={() => setNotesOpen((v) => !v)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {notesOpen && (
        <InlineNotePanel postId={post.id} onMutate={onMutate} />
      )}
    </div>
  );
}

// Memoize so changing one card's focus/selection doesn't rerender every other
// card on the page. Parents should pass stable handler references
// (useCallback) and a stable availableSets array.
export const PostCard = memo(PostCardImpl);
