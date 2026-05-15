"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ExportReportDialog } from "@/components/sets/ExportReportDialog";

interface TopicSet {
  id: string;
  name: string;
  description: string | null;
  color: string;
  post_count: number;
}

interface Post {
  id: string;
  platform: string;
  text_content: string | null;
  post_timestamp: string | null;
  post_url: string;
  engagement: Record<string, number>;
  media_files: Array<{ file_path: string; media_type: string }>;
}

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [set, setSet] = useState<TopicSet | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [setRes, postsRes] = await Promise.all([
          fetch(`/api/sets/${params.id}`),
          fetch(`/api/posts?set_id=${params.id}&per_page=50`),
        ]);
        if (setRes.ok) setSet(await setRes.json());
        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data.items || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleRemovePost = async (postId: string) => {
    await fetch(`/api/sets/${params.id}/posts/${postId}`, { method: "DELETE" });
    setPosts(posts.filter((p) => p.id !== postId));
  };

  if (loading) return <div className="p-6 text-center text-gray-500">{t("loading")}</div>;
  if (!set) return <div className="p-6 text-center text-gray-500">Set not found</div>;

  return (
    <div className="p-6">
      <Link href="/sets" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t("backToSets")}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: set.color }} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{set.name}</h1>
            {set.description && <p className="text-gray-500 mt-1">{set.description}</p>}
            <p className="text-sm text-gray-400 mt-1">{set.post_count} {t("posts")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Export Report button — opens rich dialog */}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> {t("export")}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="font-medium capitalize">{post.platform}</span>
                  {post.post_timestamp && (
                    <span>{new Date(post.post_timestamp).toLocaleString()}</span>
                  )}
                </div>
                <p className="text-gray-900 whitespace-pre-wrap line-clamp-4">
                  {post.text_content || t("noText")}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {Object.entries(post.engagement || {}).map(([key, val]) => (
                    val ? <span key={key}>{key}: {typeof val === 'number' ? val.toLocaleString() : val}</span> : null
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                  {t("original")}
                </a>
                <button onClick={() => handleRemovePost(post.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t("noPostsInSet")}
          </div>
        )}
      </div>

      {/* Export dialog */}
      <ExportReportDialog
        setId={String(params.id)}
        setName={set.name}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
