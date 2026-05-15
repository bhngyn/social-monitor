"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface TopicSet {
  id: string;
  name: string;
  description: string | null;
  color: string;
  post_count: number;
  created_at: string;
}

export default function SetsPage() {
  const [sets, setSets] = useState<TopicSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#3B82F6" });
  const { t } = useI18n();

  const fetchSets = async () => {
    try {
      const res = await fetch("/api/sets");
      if (res.ok) setSets(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", description: "", color: "#3B82F6" });
      setShowCreate(false);
      fetchSets();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteSetConfirm"))) return;
    await fetch(`/api/sets/${id}`, { method: "DELETE" });
    fetchSets();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("navTopicSets")}</h1>
          <p className="text-gray-500 mt-1">{t("organizeByTopic")}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> {t("newSet")}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t("createNewSet")}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("description")}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("color")}</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-20"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("create")}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded-lg hover:bg-gray-50">{t("cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t("loading")}</div>
      ) : sets.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t("noTopicSetsYet")}</h3>
          <p className="text-gray-500 mt-1">{t("createSetHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((set) => (
            <Link
              key={set.id}
              href={`/sets/${set.id}`}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: set.color }} />
                  <h3 className="text-lg font-semibold text-gray-900">{set.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(set.id); }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {set.description && (
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{set.description}</p>
              )}
              <div className="mt-4 text-sm text-gray-500">
                {set.post_count} {set.post_count !== 1 ? t("posts") : t("post")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
