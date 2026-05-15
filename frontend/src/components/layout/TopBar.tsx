"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Play, Bell } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const pageTitleKeys: Record<string, TranslationKey> = {
  "/": "navDashboard",
  "/sources": "navSources",
  "/posts": "navPosts",
  "/timeline": "navTimeline",
  "/sets": "navTopicSets",
  "/alerts": "navAlerts",
  "/runs": "navRuns",
  "/audit": "navAuditLog",
  "/settings": "navSettings",
};

function getBreadcrumbKey(pathname: string): TranslationKey {
  if (pageTitleKeys[pathname]) return pageTitleKeys[pathname];
  const base = "/" + pathname.split("/").filter(Boolean)[0];
  return pageTitleKeys[base] || "navDashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const unreadAlerts = 0;
  const { t } = useI18n();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/posts?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-white px-6 shadow-sm">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm">
        <span className="font-medium text-slate-900">
          {t(getBreadcrumbKey(pathname))}
        </span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mx-auto w-full max-w-md">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
          onClick={() => router.push("/runs")}
        >
          <Play size={14} />
          {t("triggerIngestion")}
        </button>

        <button
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          onClick={() => router.push("/alerts")}
          aria-label={t("alerts")}
        >
          <Bell size={18} />
          {unreadAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
