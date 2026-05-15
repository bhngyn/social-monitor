"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface AuditEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const EVENT_COLORS: Record<string, string> = {
  post_first_seen: "bg-green-100 text-green-700",
  media_downloaded: "bg-blue-100 text-blue-700",
  mhtml_captured: "bg-purple-100 text-purple-700",
  screenshot_captured: "bg-indigo-100 text-indigo-700",
  hashes_computed: "bg-teal-100 text-teal-700",
  ingestion_completed: "bg-green-100 text-green-700",
  media_download_error: "bg-red-100 text-red-700",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("");
  const { t } = useI18n();

  const fetchAudit = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "50" });
    if (eventType) params.set("event_type", eventType);

    try {
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.items || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudit(); }, [page, eventType]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("auditLog")}</h1>
          <p className="text-gray-500 mt-1">{t("immutableRecord")}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{t("allEvents")}</option>
          <option value="post_first_seen">{t("postFirstSeen")}</option>
          <option value="media_downloaded">{t("mediaDownloadedEvent")}</option>
          <option value="mhtml_captured">{t("mhtmlCapturedEvent")}</option>
          <option value="screenshot_captured">{t("screenshotCaptured")}</option>
          <option value="hashes_computed">{t("hashesComputedEvent")}</option>
          <option value="ingestion_completed">{t("ingestionCompleted")}</option>
          <option value="media_download_error">{t("downloadError")}</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{total} {t("totalEvents")}</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t("loading")}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t("noAuditEvents")}</h3>
          <p className="text-gray-500 mt-1">{t("auditEventsHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center gap-4">
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${EVENT_COLORS[entry.event_type] || "bg-gray-100 text-gray-700"}`}>
                {entry.event_type.replace(/_/g, " ")}
              </span>
              <span className="text-sm text-gray-500">{entry.entity_type}</span>
              <span className="text-sm font-mono text-gray-400 truncate">{entry.entity_id.slice(0, 8)}...</span>
              <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="border px-3 py-1 rounded-lg disabled:opacity-50">{t("previous")}</button>
          <span className="px-3 py-1 text-sm text-gray-500">{t("page")} {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={page * 50 >= total} className="border px-3 py-1 rounded-lg disabled:opacity-50">{t("next")}</button>
        </div>
      )}
    </div>
  );
}
