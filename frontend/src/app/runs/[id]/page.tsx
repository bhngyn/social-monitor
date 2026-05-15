"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RunDetail {
  id: string;
  source_id: string | null;
  trigger_type: string;
  status: string;
  apify_run_id: string | null;
  posts_found: number;
  posts_new: number;
  errors: Array<Record<string, unknown>>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function RunDetailPage() {
  const params = useParams();
  const [run, setRun] = useState<RunDetail | null>(null);

  useEffect(() => {
    fetch(`/api/ingest/runs/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setRun);
  }, [params.id]);

  if (!run) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <Link href="/runs" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Runs
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Run Detail</h1>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <p className="font-medium capitalize">{run.status}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Trigger</span>
            <p className="font-medium">{run.trigger_type}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Posts Found</span>
            <p className="font-medium">{run.posts_found}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">New Posts</span>
            <p className="font-medium">{run.posts_new}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Started</span>
            <p className="font-medium">{run.started_at ? new Date(run.started_at).toLocaleString() : "-"}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Completed</span>
            <p className="font-medium">{run.completed_at ? new Date(run.completed_at).toLocaleString() : "-"}</p>
          </div>
        </div>

        {run.apify_run_id && (
          <div>
            <span className="text-sm text-gray-500">Apify Run ID</span>
            <p className="font-mono text-sm">{run.apify_run_id}</p>
          </div>
        )}
      </div>

      {run.errors && run.errors.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Errors</h2>
          <div className="space-y-2">
            {run.errors.map((err, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <pre className="text-sm text-red-800 whitespace-pre-wrap">
                  {JSON.stringify(err, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
