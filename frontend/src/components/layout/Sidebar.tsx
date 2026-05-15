"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  FolderOpen,
  Bell,
  Play,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useReviewState, isPostNew } from "@/lib/review-state";
import { getPosts } from "@/lib/api";
import type { PostListResponse } from "@/lib/types";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: "/", labelKey: "navDashboard", icon: LayoutDashboard },
  { href: "/sources", labelKey: "navSources", icon: Users },
  { href: "/posts", labelKey: "navPosts", icon: FileText },
  { href: "/timeline", labelKey: "navTimeline", icon: Clock },
  { href: "/sets", labelKey: "navTopicSets", icon: FolderOpen },
  { href: "/alerts", labelKey: "navAlerts", icon: Bell },
  { href: "/runs", labelKey: "navRuns", icon: Play },
  { href: "/audit", labelKey: "navAuditLog", icon: Shield },
  { href: "/settings", labelKey: "navSettings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();
  const reviewMap = useReviewState();

  // Fetch a recent sample to compute "new" badge count for Posts nav item
  const { data: recentPosts } = useSWR<PostListResponse>(
    "sidebar-recent",
    () => getPosts({ per_page: 200 }),
    { revalidateOnFocus: false }
  );

  const newCount = recentPosts
    ? recentPosts.items.filter((p) => isPostNew(p, reviewMap)).length
    : 0;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col bg-slate-900 text-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-slate-700 px-4">
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">
            {t("appName")}
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const label = t(item.labelKey);
          const isPostsItem = item.href === "/posts";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}

              {/* Badge: expanded → pill with count; collapsed → red dot */}
              {isPostsItem && newCount > 0 && (
                collapsed ? (
                  <span className="absolute left-8 top-1 h-2 w-2 rounded-full bg-red-500" />
                ) : (
                  <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                    {newCount > 99 ? "99+" : newCount}
                  </span>
                )
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
