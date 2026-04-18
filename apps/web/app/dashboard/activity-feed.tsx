"use client";

import { useEffect, useState } from "react";
import { basePath } from "@/lib/app-path";
interface ActivityTrace {
  id: string;
  createdAt: string;
  summary: string | null;
  status: string;
  agent: { displayName: string };
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function statusColor(status: string): string {
  if (status === "pass") return "text-emerald-400";
  if (status === "alerted" || status === "translated") return "text-yellow-400";
  if (status === "failed") return "text-red-400";
  return "text-gray-500";
}

export function ActivityFeed() {
  const [traces, setTraces] = useState<ActivityTrace[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchActivity() {
    try {
      const res = await fetch(`/api/activity`);
      if (res.ok) {
        const data = await res.json() as { traces: ActivityTrace[] };
        setTraces(data.traces);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchActivity();
    const interval = setInterval(() => void fetchActivity(), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4 text-center">
        No agent activity yet. Send your first trace to see it here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {traces.map((trace) => (
        <a
          key={trace.id}
          href={`${basePath}/dashboard/traces/${trace.id}`}
          className="flex items-start gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium text-gray-200 text-sm">{trace.agent.displayName}</span>
            <span className="text-gray-600 text-sm mx-2">—</span>
            <span className="text-gray-400 text-sm">
              {trace.summary ?? (trace.status === "received" ? "Trace received, evaluation pending…" : `Status: ${trace.status}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs ${statusColor(trace.status)}`}>{trace.status}</span>
            <span className="text-xs text-gray-600">{timeAgo(trace.createdAt)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
