"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  LayoutList,
  LayoutGrid,
  Search,
  FolderPlus,
  X,
} from "lucide-react";
import { getPosts, getSets, apiFetch } from "@/lib/api";
import type { PostListResponse, TopicSet } from "@/lib/types";
import { PostCard } from "@/components/posts/PostCard";
import { platformIcon } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const PLATFORMS = [
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "reddit",
  "linkedin",
  "bluesky",
  "mastodon",
  "threads",
];

export default function PostsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hasMedia, setHasMedia] = useState(false);
  const [sortBy, setSortBy] = useState("posted_at");
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  const params: Record<string, string | number | boolean | undefined> = {
    page,
    per_page: 20,
    q: searchQuery || undefined,
    platform: platforms.length > 0 ? platforms.join(",") : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    has_media: hasMedia ? true : undefined,
    sort: sortBy,
  };

  const { data: postsPage } = useSWR<PostListResponse>(
    ["posts", JSON.stringify(params)],
    () => getPosts(params)
  );

  const { data: sets } = useSWR<TopicSet[]>("sets", getSets);

  const posts = postsPage?.items ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    setPage(1);
  };

  const handleSelect = useCallback((postId: string, checked: boolean) => {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (checked) next.add(postId);
      else next.delete(postId);
      return next;
    });
  }, []);

  const handleAddToSet = async (postId: string, setId: string) => {
    try {
      await apiFetch(`/sets/${setId}/posts`, {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
      });
    } catch {
      alert(t("failedAddToSet"));
    }
  };

  const handleBulkAddToSet = async (setId: string) => {
    const ids = Array.from(selectedPosts);
    try {
      await Promise.all(
        ids.map((postId) =>
          apiFetch(`/sets/${setId}/posts`, {
            method: "POST",
            body: JSON.stringify({ post_id: postId }),
          })
        )
      );
      setSelectedPosts(new Set());
    } catch {
      alert(t("failedAddToSet"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("navPosts")}</h1>
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setViewMode("feed")}
            className={`rounded p-1.5 transition-colors ${
              viewMode === "feed"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
            title={t("feedView")}
          >
            <LayoutList size={16} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
            title={t("gridView")}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          {t("search")}
        </button>
      </form>

      <div className="flex gap-6">
        {/* Filter Panel */}
        <aside className="w-56 shrink-0 space-y-5">
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {/* Platform checkboxes */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {t("platform")}
              </h3>
              <div className="space-y-1.5">
                {PLATFORMS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={platforms.includes(p)}
                      onChange={() => togglePlatform(p)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                    />
                    {platformIcon(p)}
                  </label>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {t("dateRange")}
              </h3>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
            </div>

            {/* Has media */}
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasMedia}
                onChange={(e) => {
                  setHasMedia(e.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
              />
              {t("hasMedia")}
            </label>

            {/* Sort */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {t("sort")}
              </h3>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="posted_at">{t("newestFirst")}</option>
                <option value="-posted_at">{t("oldestFirst")}</option>
                <option value="collected_at">{t("recentlyCollected")}</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Bulk action bar */}
          {selectedPosts.size > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
              <span className="text-sm font-medium text-blue-800">
                {selectedPosts.size} {t("selected")}
              </span>
              <div className="relative group">
                <button className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                  <FolderPlus size={13} />
                  {t("addToSet")}
                </button>
                {sets && sets.length > 0 && (
                  <div className="absolute left-0 top-full z-10 mt-1 hidden w-48 rounded-md border bg-white shadow-lg group-hover:block">
                    {sets.map((set) => (
                      <button
                        key={set.id}
                        onClick={() => handleBulkAddToSet(set.id)}
                        className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {set.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedPosts(new Set())}
                className="ml-auto text-blue-500 hover:text-blue-700"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Feed view */}
          {viewMode === "feed" && (
            <div className="space-y-4">
              {posts.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">
                  {t("noPostsFound")}
                </p>
              )}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  selected={selectedPosts.has(post.id)}
                  onSelect={handleSelect}
                  onAddToSet={handleAddToSet}
                  availableSets={sets}
                />
              ))}
            </div>
          )}

          {/* Grid view */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {posts.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-slate-400">
                  {t("noPostsFound")}
                </p>
              )}
              {posts.map((post) => {
                const thumb = post.media_files?.find(
                  (f) =>
                    f.media_type === "image" ||
                    f.mime_type?.startsWith("image/")
                );
                const thumbSrc = thumb
                  ? thumb.file_path
                    ? `/api/files/${thumb.file_path}`
                    : thumb.original_url
                  : null;

                return (
                  <a
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="group relative overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-slate-100 px-3">
                        <p className="text-xs text-slate-400 line-clamp-4 text-center">
                          {post.text_content}
                        </p>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-[11px] text-slate-500 truncate">
                        {post.source_username ?? post.platform}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {postsPage && postsPage.total > (postsPage.per_page ?? 20) && (() => {
            const totalPages = Math.ceil(postsPage.total / (postsPage.per_page ?? 20));
            return (
              <div className="mt-6 flex items-center justify-center gap-2">
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
            );
          })()}
        </div>
      </div>
    </div>
  );
}
