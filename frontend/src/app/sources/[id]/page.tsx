"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Pencil,
  Loader2,
  Clock,
  FileText,
} from "lucide-react";
import {
  getSource,
  getPosts,
  updateSource,
  apiFetch,
} from "@/lib/api";
import type { Source, PostListResponse } from "@/lib/types";
import {
  formatRelativeTime,
  platformIcon,
  platformColor,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function SourceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { t } = useI18n();

  const { data: source, mutate: mutateSource } = useSWR<Source>(
    `source-${id}`,
    () => getSource(id)
  );

  const [page, setPage] = useState(1);
  const { data: postsPage } = useSWR<PostListResponse>(
    source ? `source-${id}-posts-${page}` : null,
    () => getPosts({ source_id: id, page, per_page: 20 })
  );

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    profile_url: "",
    poll_interval: 3600,
  });
  const [saving, setSaving] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  const openEdit = () => {
    if (!source) return;
    setEditForm({
      username: source.username,
      profile_url: source.profile_url ?? "",
      poll_interval: source.poll_interval ?? 3600,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSource(id, {
        username: editForm.username,
        profile_url: editForm.profile_url || null,
        poll_interval: editForm.poll_interval,
      } as Partial<Source>);
      await mutateSource();
      setEditing(false);
    } catch {
      alert(t("failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerIngestion = async () => {
    setIngesting(true);
    try {
      await apiFetch("/ingest/trigger", {
        method: "POST",
        body: JSON.stringify({ source_id: id }),
      });
    } catch {
      alert(t("ingestionFailed"));
    } finally {
      setIngesting(false);
    }
  };

  if (!source) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const totalPages = postsPage
    ? Math.ceil(postsPage.total / (postsPage.per_page ?? 20))
    : 0;

  return (
    <div className="space-y-8">
      <Link
        href="/sources"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> {t("backToSources")}
      </Link>

      {/* Source header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-500 overflow-hidden">
              {source.avatar_url ? (
                <img
                  src={source.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                source.username?.charAt(0)?.toUpperCase() ?? "?"
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${platformColor(source.platform)}`}
                >
                  {platformIcon(source.platform)}
                </span>
                <h1 className="text-xl font-bold text-slate-900">
                  {source.username}
                </h1>
              </div>
              {source.display_name && (
                <p className="text-sm text-slate-500">{source.display_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Pencil size={14} />
              {t("edit")}
            </button>
            <button
              onClick={handleTriggerIngestion}
              disabled={ingesting}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {ingesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {t("triggerIngestion")}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("platform")}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {platformIcon(source.platform)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("profileUrl")}</p>
            <p className="mt-1 text-sm text-slate-700 truncate">
              {source.profile_url ? (
                <a
                  href={source.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {source.profile_url} <ExternalLink size={12} />
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("lastPolled")}</p>
            <p className="mt-1 text-sm text-slate-700 inline-flex items-center gap-1">
              <Clock size={13} className="text-slate-400" />
              {source.last_polled_at
                ? formatRelativeTime(source.last_polled_at)
                : t("never")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("postCount")}</p>
            <p className="mt-1 text-sm font-medium text-slate-700 inline-flex items-center gap-1">
              <FileText size={13} className="text-slate-400" />
              {source.post_count ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("pollInterval")}</p>
            <p className="mt-1 text-sm text-slate-700">
              {source.poll_interval
                ? `${Math.round(source.poll_interval / 60)} min`
                : t("defaultPollInterval")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("status")}</p>
            <p className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  source.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {source.is_active ? t("statusActive") : t("statusPaused")}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("created")}</p>
            <p className="mt-1 text-sm text-slate-700">
              {new Date(source.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase">{t("platformId")}</p>
            <p className="mt-1 text-sm font-mono text-slate-600 truncate">
              {source.platform_id}
            </p>
          </div>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{t("editSource")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("username")}
              </label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, username: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("profileUrl")}
              </label>
              <input
                type="url"
                value={editForm.profile_url}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, profile_url: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("pollIntervalSeconds")}
              </label>
              <input
                type="number"
                min={60}
                value={editForm.poll_interval}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    poll_interval: parseInt(e.target.value) || 3600,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t("save")}
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("navPosts")}</h2>
        <div className="space-y-3">
          {postsPage?.items.length === 0 && (
            <p className="text-sm text-slate-400">
              {t("noPostsFromSource")}
            </p>
          )}
          {postsPage?.items.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(post.post_timestamp)}
                </span>
                <ExternalLink size={14} className="text-slate-400" />
              </div>
              <p className="mt-1 text-sm text-slate-700 line-clamp-2">
                {post.text_content}
              </p>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t("previous")}
            </button>
            <span className="text-sm text-slate-500">
              {t("page")} {page} {t("of")} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t("next")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
