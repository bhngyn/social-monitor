"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface IngestionRun {
  id: string;
  source_id: string | null;
  trigger_type: string;
  status: string;
  posts_found: number;
  posts_new: number;
  errors: Array<Record<string, unknown>>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const { t } = useI18n();

  const fetchRuns = async () => {
    try {
      const res = await fetch("/api/ingest/runs?per_page=50");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, []);

  const triggerAll = async () => {
    setTriggering(true);
    try {
      await fetch("/api/ingest/trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setTimeout(fetchRuns, 1000);
    } finally {
      setTriggering(false);
    }
  };

  const duration = (run: IngestionRun) => {
    if (!run.started_at || !run.completed_at) return "-";
    const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("ingestionRuns")}</h1>
          <p className="text-gray-500 mt-1">{t("historyOfRuns")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRuns} className="border px-3 py-2 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={triggerAll}
            disabled={triggering}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> {t("triggerAll")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t("loading")}</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("statusLabel")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("trigger")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("found")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("new")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("duration")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("started")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("errors")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[run.status] || ""}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{run.trigger_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{run.posts_found}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{run.posts_new}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{duration(run)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {run.started_at ? new Date(run.started_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {run.errors && run.errors.length > 0 ? (
                      <span className="text-red-600">{run.errors.length} {t("errorCount")}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">{t("noIngestionRuns")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
