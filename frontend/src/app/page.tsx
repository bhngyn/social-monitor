"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Users,
  FileText,
  CalendarDays,
  HardDrive,
  Inbox,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { getSources, getPosts, getStorageStats } from "@/lib/api";
import type { Source, Post, PostListResponse, StorageStats } from "@/lib/types";
import {
  formatRelativeTime,
  formatBytes,
  isSameDay,
  platformIcon,
  platformColor,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  useReviewState,
  isPostNew,
  markAllReviewed,
} from "@/lib/review-state";
import { EmptyState } from "@/components/shared/EmptyState";

export default function DashboardPage() {
  const { t, tf, locale } = useI18n();
  const [showRecent, setShowRecent] = useState(true);

  const { data: sources } = useSWR<Source[]>("sources", getSources);
  const { data: postsPage } = useSWR<PostListResponse>(
    "dashboard-posts-200",
    () => getPosts({ per_page: 200 })
  );
  const { data: storage } = useSWR<StorageStats>("storage", getStorageStats);

  const reviewMap = useReviewState();
  const posts = postsPage?.items ?? [];

  // Group unread posts by source
  const groups = useMemo(() => {
    if (!sources) return [];
    const sourceById = new Map(sources.map((s) => [s.id, s]));
    const bySource: Record<string, Post[]> = {};
    for (const p of posts) {
      if (!isPostNew(p, reviewMap)) continue;
      if (!sourceById.has(p.source_id)) continue;
      (bySource[p.source_id] ||= []).push(p);
    }
    return Object.entries(bySource)
      .map(([sourceId, unread]) => ({
        source: sourceById.get(sourceId)!,
        unread,
      }))
      .filter((g) => g.unread.length > 0)
      .sort((a, b) => {
        const diff = b.unread.length - a.unread.length;
        if (diff !== 0) return diff;
        return (a.source.username ?? "").localeCompare(b.source.username ?? "");
      });
  }, [sources, posts, reviewMap]);

  const totalSources = sources?.length ?? 0;
  const totalPosts = postsPage?.total ?? 0;
  const storageUsed = storage?.archive_bytes ?? 0;

  const postsToday = useMemo(() => {
    const today = new Date();
    return posts.filter((p) => isSameDay(p.post_timestamp || p.created_at, today, locale)).length;
  }, [posts, locale]);

  const recentPosts = posts.slice(0, 10);

  const handleMarkAllReviewed = () => {
    if (!sources) return;
    markAllReviewed(sources.map((s) => s.id));
  };

  const stats = [
    {
      label: t("totalSources"),
      value: totalSources,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t("totalPosts"),
      value: totalPosts.toLocaleString(),
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: t("postsToday"),
      value: postsToday.toLocaleString(),
      icon: CalendarDays,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: t("storageUsed"),
      value: formatBytes(storageUsed),
      icon: HardDrive,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("reviewQueue")}
        </h1>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllReviewed}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            {t("markAllReviewed")}
          </button>
        )}
      </div>

      {/* Review queue (per-source groups) */}
      <section>
        {groups.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("noNewPosts")}
            description={t("noNewPosts")}
          />
        ) : (
          <ul className="space-y-4">
            {groups.map(({ source, unread }) => (
              <li
                key={source.id}
                className="rounded-lg bg-white shadow-sm p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-bold ${platformColor(
                        source.platform
                      )}`}
                    >
                      {platformIcon(source.platform)}
                    </span>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      @{source.username}
                    </span>
                    <span className="text-xs text-slate-500">
                      ·{" "}
                      {tf("newCount", { count: unread.length })}
                    </span>
                  </div>
                  <Link
                    href={`/posts?source_id=${source.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    {t("review")}
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <ul className="mt-3 space-y-2">
                  {unread.slice(0, 3).map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/posts/${post.id}`}
                        className="flex items-start gap-2 rounded-md border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                          {formatRelativeTime(
                            post.post_timestamp || post.created_at
                          )}
                        </span>
                        <p className="text-sm text-slate-700 line-clamp-1 flex-1 min-w-0">
                          {post.text_content || (
                            <span className="text-slate-400 italic">
                              {t("noText")}
                            </span>
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recently captured (collapsible) */}
      <section>
        <button
          type="button"
          onClick={() => setShowRecent((v) => !v)}
          className="flex w-full items-center gap-2 text-left"
          aria-expanded={showRecent}
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {t("recentlyCaptured")}
          </h2>
          {showRecent ? (
            <ChevronUp size={16} className="text-slate-500" />
          ) : (
            <ChevronDown size={16} className="text-slate-500" />
          )}
        </button>
        {showRecent && (
          <div className="mt-4 space-y-2">
            {recentPosts.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noRecentPosts")}</p>
            ) : (
              recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-semibold ${platformColor(
                          post.platform
                        )}`}
                      >
                        {platformIcon(post.platform)}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {post.source_username ?? post.platform_post_id}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatRelativeTime(
                          post.post_timestamp || post.created_at
                        )}
                      </span>
                    </div>
                    <ExternalLink size={14} className="text-slate-400 shrink-0" />
                  </div>
                  {post.text_content && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {post.text_content}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      {/* Compact stats footer */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-3"
            >
              <div className={`rounded-md p-1.5 ${card.bg}`}>
                <Icon size={16} className={card.color} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  {card.label}
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
