"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Loader2,
  FolderPlus,
} from "lucide-react";
import { getPost, getSets, apiFetch } from "@/lib/api";
import type { Post, TopicSet } from "@/lib/types";
import { formatRelativeTime, platformIcon, platformColor } from "@/lib/utils";
import { MediaViewer } from "@/components/posts/MediaViewer";
import { useI18n } from "@/lib/i18n";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const { t } = useI18n();

  const { data: post, mutate } = useSWR<Post>(`post-${postId}`, () =>
    getPost(postId)
  );
  const { data: sets } = useSWR<TopicSet[]>("sets", getSets);

  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [addToSetOpen, setAddToSetOpen] = useState(false);

  if (!post) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const engagement = post.engagement ?? {};
  const likes = engagement.likes ?? engagement.favorites ?? 0;
  const shares =
    engagement.shares ?? engagement.retweets ?? engagement.reposts ?? 0;
  const comments = engagement.comments ?? engagement.replies ?? 0;
  const views = engagement.views ?? 0;

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await apiFetch(`/posts/${postId}/notes`, {
        method: "POST",
        body: JSON.stringify({ text: noteText }),
      });
      setNoteText("");
      await mutate();
    } catch {
      alert(t("failedAddNote"));
    } finally {
      setSavingNote(false);
    }
  };

  const handleAddToSet = async (setId: string) => {
    try {
      await apiFetch(`/sets/${setId}/posts`, {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
      });
      setAddToSetOpen(false);
      await mutate();
    } catch {
      alert(t("failedAddToSet"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> {t("backToPosts")}
        </Link>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-6">
        {/* Left panel (60%) */}
        <div className="w-3/5 space-y-6">
          {/* Post content */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-sm font-bold ${platformColor(post.platform)}`}
              >
                {platformIcon(post.platform)}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {post.source_username ?? post.platform_post_id}
              </span>
              <span className="text-xs text-slate-400">
                {formatRelativeTime(post.post_timestamp)}
              </span>
              {post.post_url && (
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-slate-400 hover:text-slate-600"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap">
              {post.text_content}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {t("postMetadata")}
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400 uppercase">{t("platformLabel")}</dt>
                <dd className="font-medium text-slate-700">
                  {platformIcon(post.platform)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">
                  {t("platformIdLabel")}
                </dt>
                <dd className="font-mono text-xs text-slate-600">
                  {post.platform_post_id}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">{t("posted")}</dt>
                <dd className="text-slate-700">
                  {post.post_timestamp
                    ? new Date(post.post_timestamp).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">{t("archived")}</dt>
                <dd className="text-slate-700">
                  {new Date(post.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">
                  {t("mediaDownloaded")}
                </dt>
                <dd className="text-slate-700">
                  {post.media_downloaded ? t("yes") : t("no")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">
                  {t("mhtmlCaptured")}
                </dt>
                <dd className="text-slate-700">
                  {post.mhtml_captured ? t("yes") : t("no")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">
                  {t("screenshot")}
                </dt>
                <dd className="text-slate-700">
                  {post.screenshot_captured ? t("yes") : t("no")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">
                  {t("hashesComputed")}
                </dt>
                <dd className="text-slate-700">
                  {post.hashes_computed ? t("yes") : t("no")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Engagement */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {t("engagement")}
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Heart size={16} className="text-red-400" />
                <span className="font-medium">{likes.toLocaleString()}</span>
                <span className="text-xs text-slate-400">{t("likes")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Repeat2 size={16} className="text-green-500" />
                <span className="font-medium">{shares.toLocaleString()}</span>
                <span className="text-xs text-slate-400">{t("shares")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <MessageCircle size={16} className="text-blue-400" />
                <span className="font-medium">
                  {comments.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">{t("comments")}</span>
              </div>
              {views > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Eye size={16} className="text-purple-400" />
                  <span className="font-medium">{views.toLocaleString()}</span>
                  <span className="text-xs text-slate-400">{t("views")}</span>
                </div>
              )}
            </div>
            {Object.keys(engagement).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap gap-3">
                  {Object.entries(engagement).map(([key, val]) => (
                    <div key={key} className="text-xs text-slate-500">
                      <span className="capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      :{" "}
                      <span className="font-medium text-slate-700">
                        {val.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Platform Data */}
          {Object.keys(post.platform_data ?? {}).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {t("platformData")}
              </h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(post.platform_data).map(([key, val]) => (
                  <div key={key} className="text-xs text-slate-500">
                    <span className="capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    :{" "}
                    <span className="font-medium text-slate-700">
                      {typeof val === "object"
                        ? JSON.stringify(val)
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topic Sets */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {t("topicSets")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {post.set_ids?.length > 0 ? (
                post.set_ids.map((setId) => {
                  const set = sets?.find((s) => s.id === setId);
                  return (
                    <Link
                      key={setId}
                      href={`/sets/${setId}`}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: set?.color
                          ? `${set.color}20`
                          : "#e2e8f0",
                        color: set?.color ?? "#475569",
                      }}
                    >
                      {set?.name ?? `Set ${setId.slice(0, 8)}`}
                    </Link>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400">
                  {t("notInAnySets")}
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => setAddToSetOpen(!addToSetOpen)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
                >
                  <FolderPlus size={12} />
                  {t("addToSet")}
                </button>
                {addToSetOpen && sets && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-md border bg-white shadow-lg">
                    {sets.map((set) => (
                      <button
                        key={set.id}
                        onClick={() => handleAddToSet(set.id)}
                        className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {set.name}
                      </button>
                    ))}
                    {sets.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">
                        {t("noSetsAvailable")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {t("notes")} ({post.notes_count})
            </h3>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("addNote")}
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddNote();
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                {t("add")}
              </button>
            </div>
          </div>

          {/* Raw JSON */}
          <div className="bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setRawJsonOpen(!rawJsonOpen)}
              className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-slate-700"
            >
              {t("rawJson")}
              {rawJsonOpen ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {rawJsonOpen && (
              <div className="border-t border-slate-100 px-6 pb-6">
                <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-50 p-4 text-xs text-slate-700">
                  {JSON.stringify(post, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right panel (40%) - Media */}
        <div className="w-2/5">
          <div className="sticky top-20">
            <MediaViewer
              mediaFiles={post.media_files ?? []}
              mhtmlPath={post.mhtml_path}
              screenshotPath={post.screenshot_path}
            />
            {(!post.media_files || post.media_files.length === 0) &&
              !post.mhtml_path &&
              !post.screenshot_path && (
                <div className="rounded-lg bg-white shadow-sm p-8 text-center">
                  <p className="text-sm text-slate-400">
                    {t("noMediaFiles")}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
