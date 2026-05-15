"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Globe,
} from "lucide-react";
import { clsx } from "clsx";
import { useI18n, type TranslationKey } from "@/lib/i18n";

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
  const { locale, setLocale, t } = useI18n();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "es" : "en");
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
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language toggle */}
      <div className="border-t border-slate-700 px-2 py-3">
        <button
          onClick={toggleLocale}
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? t("language") : undefined}
        >
          <Globe size={20} className="shrink-0" />
          {!collapsed && (
            <span>{locale === "en" ? "Español" : "English"}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
