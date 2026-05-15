"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, perPage, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const { t } = useI18n();

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
      <p className="text-sm text-slate-500">
        {t("showing")} <span className="font-medium text-slate-700">{start}</span>
        {" - "}
        <span className="font-medium text-slate-700">{end}</span> {t("of")}{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={16} />
          {t("previous")}
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("next")}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
