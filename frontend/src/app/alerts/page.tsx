"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Alert {
  id: string;
  name: string;
  keyword_pattern: string;
  platform_filter: string[] | null;
  notify_via: string;
  webhook_url: string | null;
  is_active: boolean;
  event_count: number;
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    keyword_pattern: "",
    notify_via: "browser",
    webhook_url: "",
  });
  const { t } = useI18n();

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) setAlerts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      keyword_pattern: form.keyword_pattern,
      notify_via: form.notify_via,
    };
    if (form.webhook_url) body.webhook_url = form.webhook_url;
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm({ name: "", keyword_pattern: "", notify_via: "browser", webhook_url: "" });
      setShowCreate(false);
      fetchAlerts();
    }
  };

  const toggleActive = async (alert: Alert) => {
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !alert.is_active }),
    });
    fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteAlertConfirm"))) return;
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    fetchAlerts();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("navAlerts")}</h1>
          <p className="text-gray-500 mt-1">{t("getNotifiedKeywords")}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> {t("newAlert")}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t("createAlert")}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("keywordPattern")}</label>
              <input type="text" required value={form.keyword_pattern} onChange={(e) => setForm({ ...form, keyword_pattern: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., elecciones|votación" />
              <p className="text-xs text-gray-400 mt-1">{t("supportsRegex")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("notifyVia")}</label>
              <select value={form.notify_via} onChange={(e) => setForm({ ...form, notify_via: e.target.value })} className="border rounded-lg px-3 py-2">
                <option value="browser">{t("browserNotification")}</option>
                <option value="webhook">{t("webhook")}</option>
              </select>
            </div>
            {form.notify_via === "webhook" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("webhookUrl")}</label>
                <input type="url" value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("create")}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded-lg hover:bg-gray-50">{t("cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t("loading")}</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t("noAlertsConfigure")}</h3>
          <p className="text-gray-500 mt-1">{t("createAlertHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleActive(alert)}
                  className={`w-10 h-6 rounded-full transition-colors ${alert.is_active ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${alert.is_active ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <div>
                  <h3 className="font-medium text-gray-900">{alert.name}</h3>
                  <p className="text-sm text-gray-500">
                    {t("pattern")}: <code className="bg-gray-100 px-1 rounded">{alert.keyword_pattern}</code>
                    {" "}&middot; {alert.notify_via}
                    {" "}&middot; {alert.event_count} {t("triggered")}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(alert.id)} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
