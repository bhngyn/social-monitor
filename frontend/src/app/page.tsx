"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Users,
  FileText,
  CalendarDays,
  HardDrive,
  Play,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { apiFetch, getSources, getPosts, getStorageStats } from "@/lib/api";
import type { Source, PostListResponse, StorageStats } from "@/lib/types";
import { formatRelativeTime, formatBytes, platformIcon, platformColor } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const { t } = useI18n();

  const { data: sources } = useSWR<Source[]>("sources", getSources);
  const { data: postsPage } = useSWR<PostListResponse>("posts-1", () =>
    getPosts({ per_page: 10 })
  );
  const { data: postsTotal } = useSWR<PostListResponse>("posts-total", () =>
    getPosts({ per_page: 1 })
  );
  const { data: storage } = useSWR<StorageStats>("storage", getStorageStats);

  const totalSources = sources?.length ?? 0;
  const totalPosts = postsTotal?.total ?? 0;
  const postsToday = 0;
  const storageUsed = storage?.archive_bytes ?? 0;
  const recentPosts = postsPage?.items ?? [];

  const handleTriggerIngestion = async () => {
    setIngesting(true);
    setIngestMsg(null);
    try {
      await apiFetch("/ingest/trigger", { method: "POST" });
      setIngestMsg(t("ingestionTriggered"));
    } catch {
      setIngestMsg(t("ingestionFailed"));
    } finally {
      setIngesting(false);
    }
  };

  const cards = [
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
      value: postsToday,
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-lg shadow-sm p-6 flex items-start gap-4"
            >
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <Icon size={22} className={card.color} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trigger Ingestion */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleTriggerIngestion}
          disabled={ingesting}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {ingesting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          {t("triggerIngestion")}
        </button>
        {ingestMsg && (
          <span className="text-sm text-slate-600">{ingestMsg}</span>
        )}
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {t("recentActivity")}
        </h2>
        <div className="space-y-3">
          {recentPosts.length === 0 && (
            <p className="text-sm text-slate-500">{t("noRecentPosts")}</p>
          )}
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${platformColor(
                      post.platform
                    )}`}
                  >
                    {platformIcon(post.platform)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {post.source_username ?? post.platform_post_id}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(post.post_timestamp)}
                  </span>
                </div>
                <ExternalLink size={14} className="text-slate-400" />
              </div>
              <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                {post.text_content}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
