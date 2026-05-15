"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { X, ChevronDown } from "lucide-react";
import { getSources } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { platformIcon } from "@/lib/utils";
import type { Source } from "@/lib/types";

interface SourcePickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function SourcePicker({ selectedIds, onChange }: SourcePickerProps) {
  const { t } = useI18n();
  const { data: sources } = useSWR<Source[]>("sources", () => getSources(), {
    revalidateOnFocus: false,
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const allSources = sources ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedSources = useMemo(
    () => allSources.filter((s) => selectedSet.has(s.id)),
    [allSources, selectedSet]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = allSources.filter((s) => !selectedSet.has(s.id));
    if (!q) return available.slice(0, 30);
    return available
      .filter((s) => {
        const name = (s.display_name || "").toLowerCase();
        const user = (s.username || "").toLowerCase();
        return name.includes(q) || user.includes(q);
      })
      .slice(0, 30);
  }, [allSources, query, selectedSet]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function add(id: string) {
    if (selectedSet.has(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(matches.length - 1, h + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[highlight];
      if (pick) add(pick.id);
      return;
    }
    if (e.key === "Backspace" && query === "" && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, -1));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {selectedSources.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedSources.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              <span className="text-muted-foreground">
                {platformIcon(s.platform)}
              </span>
              <span className="max-w-[120px] truncate">
                {s.username || s.display_name || s.platform_id}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label={t("delete")}
                className="rounded text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("selectSources")}
          className="w-full rounded-md border border-border bg-card px-2 py-1.5 pr-7 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("source")}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {t("noSourcesYet")}
            </p>
          ) : (
            <ul>
              {matches.map((s, idx) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => add(s.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                      idx === highlight
                        ? "bg-muted text-foreground"
                        : "text-card-foreground"
                    }`}
                  >
                    <span className="text-muted-foreground">
                      {platformIcon(s.platform)}
                    </span>
                    <span className="flex-1 truncate">
                      {s.username || s.display_name || s.platform_id}
                    </span>
                    {s.display_name && s.username && (
                      <span className="truncate text-muted-foreground">
                        {s.display_name}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
