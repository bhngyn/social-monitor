"use client";

import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Repeat2,
  ExternalLink,
  FolderPlus,
} from "lucide-react";
import type { Post, TopicSet } from "@/lib/types";
import { formatRelativeTime, platformIcon, platformColor } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface PostCardProps {
  post: Post;
  selected: boolean;
  onSelect: (postId: string, checked: boolean) => void;
  onAddToSet: (postId: string, setId: string) => void;
  availableSets?: TopicSet[];
}

export function PostCard({
  post,
  selected,
  onSelect,
  onAddToSet,
  availableSets = [],
}: PostCardProps) {
  const { t } = useI18n();
  const engagement = post.engagement ?? {};
  const likes = engagement.likes ?? engagement.favorites ?? 0;
  const shares = engagement.shares ?? engagement.retweets ?? engagement.reposts ?? 0;
  const comments = engagement.comments ?? engagement.replies ?? 0;

  const firstImage = post.media_files?.find(
    (f) => f.media_type === "image" || f.mime_type?.startsWith("image/")
  );

  const thumbnailSrc = firstImage
    ? firstImage.file_path
      ? `/api/files/${firstImage.file_path}`
      : firstImage.original_url
    : null;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(post.id, e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold ${platformColor(post.platform)}`}
            >
              {platformIcon(post.platform)}
            </span>
            <span className="text-sm font-medium text-slate-800 truncate">
              {post.source_username ?? post.platform_post_id}
            </span>
            <span className="text-xs text-slate-400">
              {formatRelativeTime(post.post_timestamp)}
            </span>
          </div>

          {/* Content */}
          <Link href={`/posts/${post.id}`}>
            <p className="mt-2 text-sm text-slate-700 line-clamp-3 cursor-pointer hover:text-slate-900">
              {post.text_content}
            </p>
          </Link>

          {/* Inline thumbnail */}
          {thumbnailSrc && (
            <Link href={`/posts/${post.id}`}>
              <img
                src={thumbnailSrc}
                alt=""
                className="mt-3 h-40 w-full rounded-md object-cover"
              />
            </Link>
          )}

          {/* Engagement */}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
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

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative group">
              <button className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                <FolderPlus size={12} />
                {t("addToSet")}
              </button>
              {availableSets.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 hidden w-48 rounded-md border bg-white shadow-lg group-hover:block">
                  {availableSets.map((set) => (
                    <button
                      key={set.id}
                      onClick={() => onAddToSet(post.id, set.id)}
                      className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {set.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={12} />
                {t("original")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
