"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getTimeline, type TimelinePost } from "@/lib/api";

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-blue-400",
  instagram: "bg-pink-500",
  facebook: "bg-blue-600",
  tiktok: "bg-gray-900",
  youtube: "bg-red-600",
};

export default function TimelinePage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [platform, setPlatform] = useState("");
  const { t, locale } = useI18n();

  const params = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    platform: platform || undefined,
    limit: 200,
  };

  const { data, error, isLoading } = useSWR<TimelinePost[]>(
    ["timeline", dateFrom, dateTo, platform],
    () => getTimeline(params),
  );
  const posts = data ?? [];
  const loading = isLoading;

  // Group posts by date
  const grouped = posts.reduce<Record<string, TimelinePost[]>>((acc, post) => {
    const date = post.post_timestamp
      ? new Date(post.post_timestamp).toLocaleDateString(locale === "es" ? "es-ES" : "en-US")
      : t("unknownDate");
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("navTimeline")}</h1>
          <p className="text-gray-500 mt-1">{t("chronologicalView")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("from")}</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("to")}</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform")}</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">{t("all")}</option>
            <option value="twitter">Twitter/X</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 text-red-600">
          {t("loadingTimeline")} — {(error as Error).message}
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">{t("loadingTimeline")}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t("noPostsToShow")}</h3>
          <p className="text-gray-500 mt-1">{t("adjustFilters")}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {Object.entries(grouped).map(([date, datePosts]) => (
            <div key={date} className="mb-8">
              <div className="relative flex items-center mb-4">
                <div className="w-12 h-8 bg-gray-100 border rounded-md flex items-center justify-center text-xs font-medium text-gray-600 z-10">
                  {date.split("/").slice(0, 2).join("/")}
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">{date}</span>
              </div>

              <div className="space-y-3 ml-12">
                {datePosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${PLATFORM_COLORS[post.platform] || "bg-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium capitalize">{post.platform}</span>
                          <span className="text-gray-500">@{post.source_username}</span>
                          {post.post_timestamp && (
                            <span className="text-gray-400">
                              {new Date(post.post_timestamp).toLocaleTimeString()}
                            </span>
                          )}
                          {post.has_media && (
                            <span className="text-gray-400">{post.media_count} {t("media")}</span>
                          )}
                        </div>
                        <p className="text-gray-900 text-sm mt-1 line-clamp-2">
                          {post.text_content || t("noText")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
