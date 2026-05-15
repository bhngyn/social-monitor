"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  LayoutList,
  LayoutGrid,
  Search,
  X,
  Inbox,
} from "lucide-react";
import { getPosts, getSets } from "@/lib/api";
import type { PostListResponse, TopicSet } from "@/lib/types";
import { PostCard } from "@/components/posts/PostCard";
import { SourcePicker } from "@/components/posts/SourcePicker";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShortcutOverlay } from "@/components/shared/ShortcutOverlay";
import { platformIcon } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  useReviewState,
  isPostNew,
  markAllReviewed,
  markSourceReviewed,
} from "@/lib/review-state";
import {
  useKeyboardShortcuts,
  type ShortcutMap,
} from "@/lib/use-keyboard-shortcuts";

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

const PER_PAGE = 20;

function PostsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, tf } = useI18n();

  const initialSource = searchParams.get("source_id");

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
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [untagged, setUntagged] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(
    initialSource ? [initialSource] : []
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const reviewMap = useReviewState();

  const params: Record<string, string | number | boolean | undefined> = {
    page,
    per_page: PER_PAGE,
    q: searchQuery || undefined,
    platform: platforms.length > 0 ? platforms.join(",") : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    has_media: hasMedia ? true : undefined,
    sort: sortBy,
    set_id: selectedSets.length ? selectedSets.join(",") : undefined,
    source_id: selectedSources.length
      ? selectedSources.join(",")
      : undefined,
    untagged: untagged ? true : undefined,
  };

  const { data: postsPage, mutate: mutatePosts } = useSWR<PostListResponse>(
    ["posts", JSON.stringify(params)],
    () => getPosts(params)
  );

  const { data: sets } = useSWR<TopicSet[]>("sets", getSets);

  const posts = useMemo(() => postsPage?.items ?? [], [postsPage]);

  // Reset focus when posts change
  useEffect(() => {
    setFocusedIndex(0);
  }, [posts]);

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

  const toggleSet = (id: string) => {
    setSelectedSets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setPage(1);
  };

  const handleSourcesChange = useCallback((ids: string[]) => {
    setSelectedSources(ids);
    setPage(1);
  }, []);

  const handleSelect = useCallback((postId: string, checked: boolean) => {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (checked) next.add(postId);
      else next.delete(postId);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setPlatforms([]);
    setDateFrom("");
    setDateTo("");
    setHasMedia(false);
    setSelectedSets([]);
    setUntagged(false);
    setSelectedSources([]);
    setPage(1);
  };

  // Filter count (excludes search/sort)
  const activeFilterCount =
    (platforms.length > 0 ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (hasMedia ? 1 : 0) +
    (selectedSets.length > 0 ? 1 : 0) +
    (untagged ? 1 : 0) +
    (selectedSources.length > 0 ? 1 : 0);

  // Review state
  const unreadCount = useMemo(
    () => posts.filter((p) => isPostNew(p, reviewMap)).length,
    [posts, reviewMap]
  );

  const handleMarkAllReviewed = () => {
    const sourceIds = Array.from(new Set(posts.map((p) => p.source_id)));
    markAllReviewed(sourceIds);
  };

  const scrollFocusIntoView = (postId: string) => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(
      `[data-post-card-id="${postId}"]`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest" });
  };

  const shortcuts: ShortcutMap = useMemo(() => {
    return {
      j: () => {
        if (posts.length === 0) return;
        setFocusedIndex((i) => {
          const next = Math.min(posts.length - 1, i + 1);
          const p = posts[next];
          if (p) scrollFocusIntoView(p.id);
          return next;
        });
      },
      k: () => {
        if (posts.length === 0) return;
        setFocusedIndex((i) => {
          const next = Math.max(0, i - 1);
          const p = posts[next];
          if (p) scrollFocusIntoView(p.id);
          return next;
        });
      },
      enter: () => {
        const p = posts[focusedIndex];
        if (p) router.push(`/posts/${p.id}`);
      },
      o: () => {
        const p = posts[focusedIndex];
        if (p) router.push(`/posts/${p.id}`);
      },
      "shift+o": () => {
        const p = posts[focusedIndex];
        if (p && p.post_url) window.open(p.post_url, "_blank");
      },
      x: () => {
        const p = posts[focusedIndex];
        if (!p) return;
        setSelectedPosts((prev) => {
          const next = new Set(prev);
          if (next.has(p.id)) next.delete(p.id);
          else next.add(p.id);
          return next;
        });
      },
      s: () => {
        const p = posts[focusedIndex];
        if (p) markSourceReviewed(p.source_id);
      },
      "shift+/": () => {
        setShowShortcuts((v) => !v);
      },
    };
  }, [posts, focusedIndex, router]);

  useKeyboardShortcuts(shortcuts, posts.length > 0);

  const handleCardMutate = useCallback(() => {
    mutatePosts();
  }, [mutatePosts]);

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
        <aside className="w-60 shrink-0 space-y-5">
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {activeFilterCount > 0 && (
              <p className="text-[11px] font-medium text-blue-700">
                {tf("filtersApplied", { count: activeFilterCount })}
              </p>
            )}

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
              <label className="sr-only" htmlFor="filter-date-from">
                {t("dateFrom")}
              </label>
              <input
                id="filter-date-from"
                type="date"
                value={dateFrom}
                aria-label={t("dateFrom")}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
              <label className="sr-only" htmlFor="filter-date-to">
                {t("dateTo")}
              </label>
              <input
                id="filter-date-to"
                type="date"
                value={dateTo}
                aria-label={t("dateTo")}
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

            {/* Sets */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {t("topicSets")}
              </h3>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={untagged}
                    onChange={(e) => {
                      setUntagged(e.target.checked);
                      if (e.target.checked) setSelectedSets([]);
                      setPage(1);
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  />
                  <span className="italic">{t("untagged")}</span>
                </label>
                {sets && sets.length > 0 && (
                  <div
                    className={`space-y-1.5 ${
                      untagged ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {sets.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          disabled={untagged}
                          checked={selectedSets.includes(s.id)}
                          onChange={() => toggleSet(s.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                        />
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Source */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {t("source")}
              </h3>
              <SourcePicker
                selectedIds={selectedSources}
                onChange={handleSourcesChange}
              />
            </div>

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

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {t("clearFilters")}
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Review-state banner */}
          {unreadCount > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
              <span className="text-sm font-medium text-blue-800">
                {tf("newCount", { count: unreadCount })}
              </span>
              <button
                onClick={handleMarkAllReviewed}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                {t("markAllReviewed")}
              </button>
            </div>
          )}

          {/* Bulk action bar (selection only - bulk-add-to-set lives in a separate component owned by another agent) */}
          {selectedPosts.size > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
              <span className="text-sm font-medium text-blue-800">
                {selectedPosts.size} {t("selected")}
              </span>
              <button
                onClick={() => setSelectedPosts(new Set())}
                className="ml-auto text-blue-500 hover:text-blue-700"
                aria-label={t("cancel")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Feed view */}
          {viewMode === "feed" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={t("noPostsFound")}
                  description={t("adjustFilters")}
                />
              ) : (
                posts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    selected={selectedPosts.has(post.id)}
                    focused={i === focusedIndex}
                    onSelect={handleSelect}
                    availableSets={sets}
                    onMutate={handleCardMutate}
                  />
                ))
              )}
            </div>
          )}

          {/* Grid view */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {posts.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={Inbox}
                    title={t("noPostsFound")}
                    description={t("adjustFilters")}
                  />
                </div>
              ) : (
                posts.map((post) => {
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
                        // eslint-disable-next-line @next/next/no-img-element
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
                })
              )}
            </div>
          )}

          {/* Pagination */}
          {postsPage && postsPage.total > 0 && (
            <div className="mt-6">
              <Pagination
                page={page}
                perPage={postsPage.per_page ?? PER_PAGE}
                total={postsPage.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      <ShortcutOverlay
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-slate-400">
          {/* simple inline fallback to avoid using useI18n outside the suspense */}
          Loading…
        </div>
      }
    >
      <PostsPageInner />
    </Suspense>
  );
}
