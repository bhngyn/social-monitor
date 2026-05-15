"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
  Search,
  Play,
  Bell,
  Globe,
  Sun,
  Moon,
  Laptop,
  Keyboard,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { getAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { ShortcutOverlay } from "@/components/shared/ShortcutOverlay";

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

type ThemeOption = "light" | "dark" | "system";

const THEME_CYCLE: ThemeOption[] = ["light", "dark", "system"];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  // Bell: count active alerts as proxy for "unread"
  const { data: alerts } = useSWR<Alert[]>("topbar-alerts", getAlerts, {
    revalidateOnFocus: false,
  });
  const unreadAlerts = alerts ? alerts.filter((a) => a.is_active).length : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/posts?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "es" : "en");
  };

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme as ThemeOption);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  const ThemeIcon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Laptop;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-6 shadow-sm">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm">
          <span className="font-medium text-foreground">
            {t(getBreadcrumbKey(pathname))}
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mx-auto w-full max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-md border border-border bg-muted py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:bg-card focus:outline-none focus:ring-1 focus:ring-border"
            />
          </div>
        </form>

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          title={t("language")}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Globe size={14} />
          <span>{locale === "en" ? "EN" : "ES"}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={t("theme")}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          aria-label={t("theme")}
        >
          <ThemeIcon size={14} />
        </button>

        {/* Keyboard shortcuts */}
        <button
          onClick={() => setShortcutOpen(true)}
          title={t("showShortcuts")}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          aria-label={t("keyboardShortcuts")}
        >
          <Keyboard size={14} />
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            onClick={() => router.push("/runs")}
          >
            <Play size={14} />
            {t("triggerIngestion")}
          </button>

          <button
            className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => router.push("/alerts")}
            aria-label={t("alerts")}
          >
            <Bell size={18} />
            {unreadAlerts > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                aria-label={`${unreadAlerts} active alerts`}
              >
                {unreadAlerts}
              </span>
            )}
          </button>
        </div>
      </header>

      <ShortcutOverlay open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
    </>
  );
}
