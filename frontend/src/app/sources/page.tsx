"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import {
  getSources,
  createSource,
  updateSource,
  deleteSource,
} from "@/lib/api";
import type { Source } from "@/lib/types";
import {
  formatRelativeTime,
  platformIcon,
  platformColor,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const PLATFORMS = [
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "reddit",
  "linkedin",
  "bluesky",
  "mastodon",
  "threads",
];

interface SourceFormData {
  platform: string;
  username: string;
  platform_id: string;
  profile_url: string;
  poll_interval: number;
}

const emptyForm: SourceFormData = {
  platform: "twitter",
  username: "",
  platform_id: "",
  profile_url: "",
  poll_interval: 3600,
};

export default function SourcesPage() {
  const { data: sources, mutate } = useSWR<Source[]>("sources", getSources);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [form, setForm] = useState<SourceFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const openAdd = () => {
    setEditingSource(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (source: Source) => {
    setEditingSource(source);
    setForm({
      platform: source.platform,
      username: source.username,
      platform_id: source.platform_id,
      profile_url: source.profile_url ?? "",
      poll_interval: source.poll_interval ?? 3600,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        platform: form.platform,
        username: form.username,
        platform_id: form.platform_id || form.username,
        profile_url: form.profile_url || null,
        poll_interval: form.poll_interval,
      };
      if (editingSource) {
        await updateSource(editingSource.id, payload);
      } else {
        await createSource(payload);
      }
      await mutate();
      setModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteSourceConfirm"))) return;
    try {
      await deleteSource(id);
      await mutate();
    } catch {
      alert(t("failedDeleteSource"));
    }
  };

  const handleToggleActive = async (source: Source) => {
    try {
      await updateSource(source.id, { is_active: !source.is_active });
      await mutate();
    } catch {
      alert(t("failedToggleSource"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("navSources")}</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} />
          {t("addSource")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("platform")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("user")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("displayName")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("posts")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("lastPolled")}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("active")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!sources && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t("loading")}
                </td>
              </tr>
            )}
            {sources?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t("noSourcesYet")}
                </td>
              </tr>
            )}
            {sources?.map((source) => (
              <tr key={source.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span
                    className={`text-sm font-semibold ${platformColor(
                      source.platform
                    )}`}
                  >
                    {platformIcon(source.platform)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/sources/${source.id}`}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                      {source.username?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm font-medium text-slate-800 hover:underline">
                      {source.username}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {source.display_name || "-"}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                  {source.post_count ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {source.last_polled_at
                    ? formatRelativeTime(source.last_polled_at)
                    : t("never")}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(source)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      source.is_active ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        source.is_active ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(source)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title={t("edit")}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title={t("actions")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingSource ? t("editSource") : t("addSource")}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("platform")}
                </label>
                <select
                  value={form.platform}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platform: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {platformIcon(p)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("username")}
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="@username"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("profileUrl")}
                </label>
                <input
                  type="url"
                  value={form.profile_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, profile_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("pollIntervalSeconds")}
                </label>
                <input
                  type="number"
                  min={60}
                  value={form.poll_interval}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      poll_interval: parseInt(e.target.value) || 3600,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingSource ? t("saveChanges") : t("addSource")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
