"use client";

import { useEffect, useState } from "react";
import { HardDrive, Trash2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface StorageStats {
  drive: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    used_percent: number;
  };
  archive_bytes: number;
  by_platform: Record<string, number>;
  by_media_type: Record<string, number>;
}

interface RetentionPolicy {
  id: string;
  name: string;
  target_type: string;
  target_id: string | null;
  max_age_days: number | null;
  max_storage_bytes: number | null;
  media_types: string[] | null;
  action: string;
  is_active: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    target_type: "global",
    max_age_days: "",
    action: "delete_media",
  });
  const { t } = useI18n();

  useEffect(() => {
    Promise.all([
      fetch("/api/storage/stats").then((r) => r.ok ? r.json() : null),
      fetch("/api/storage/retention-policies").then((r) => r.ok ? r.json() : []),
    ]).then(([s, p]) => {
      setStats(s);
      setPolicies(p);
      setLoading(false);
    });
  }, []);

  const createPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      target_type: form.target_type,
      action: form.action,
    };
    if (form.max_age_days) body.max_age_days = parseInt(form.max_age_days);
    const res = await fetch("/api/storage/retention-policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreate(false);
      const updated = await fetch("/api/storage/retention-policies").then((r) => r.json());
      setPolicies(updated);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm(t("deleteRetentionConfirm"))) return;
    await fetch(`/api/storage/retention-policies/${id}`, { method: "DELETE" });
    setPolicies(policies.filter((p) => p.id !== id));
  };

  if (loading) return <div className="p-6 text-center text-gray-500">{t("loading")}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("storageManagement")}</h1>

      {/* Drive Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <HardDrive className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">{t("driveTotal")}</p>
            <p className="text-2xl font-bold">{formatBytes(stats.drive.total_bytes)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-sm text-gray-500">{t("used")}</p>
            <p className="text-2xl font-bold">{formatBytes(stats.drive.used_bytes)}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${stats.drive.used_percent}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{stats.drive.used_percent}% {t("used").toLowerCase()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-sm text-gray-500">{t("freeSpace")}</p>
            <p className="text-2xl font-bold">{formatBytes(stats.drive.free_bytes)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-sm text-gray-500">{t("archiveSize")}</p>
            <p className="text-2xl font-bold">{formatBytes(stats.archive_bytes)}</p>
          </div>
        </div>
      )}

      {/* Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">{t("byPlatform")}</h2>
            <div className="space-y-3">
              {Object.entries(stats.by_platform).map(([platform, bytes]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="capitalize text-gray-700">{platform}</span>
                  <span className="text-gray-500">{formatBytes(bytes)}</span>
                </div>
              ))}
              {Object.keys(stats.by_platform).length === 0 && (
                <p className="text-gray-400">{t("noDataYet")}</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">{t("byMediaType")}</h2>
            <div className="space-y-3">
              {Object.entries(stats.by_media_type).map(([type, bytes]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize text-gray-700">{type}</span>
                  <span className="text-gray-500">{formatBytes(bytes)}</span>
                </div>
              ))}
              {Object.keys(stats.by_media_type).length === 0 && (
                <p className="text-gray-400">{t("noDataYet")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Retention Policies */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("retentionPolicies")}</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 border px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
          <Plus className="w-4 h-4" /> {t("addPolicy")}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
          <form onSubmit={createPolicy} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("scope")}</label>
                <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="global">{t("global")}</option>
                  <option value="platform">{t("platform")}</option>
                  <option value="source">{t("source")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("maxAgeDays")}</label>
                <input type="number" value={form.max_age_days} onChange={(e) => setForm({ ...form, max_age_days: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., 90" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("action")}</label>
                <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="delete_media">{t("deleteMediaOnly")}</option>
                  <option value="delete_all">{t("deleteEverything")}</option>
                  <option value="compress">{t("compress")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">{t("create")}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded-lg">{t("cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{policy.name}</span>
              <span className="text-sm text-gray-500 ml-3">
                {policy.target_type} &middot; {policy.action.replace("_", " ")}
                {policy.max_age_days && ` &middot; ${policy.max_age_days} days`}
              </span>
            </div>
            <button onClick={() => deletePolicy(policy.id)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {policies.length === 0 && (
          <p className="text-gray-400 text-center py-4">{t("noRetentionPolicies")}</p>
        )}
      </div>
    </div>
  );
}
