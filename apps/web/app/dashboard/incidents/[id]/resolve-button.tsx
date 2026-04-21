"use client";
import { basePath } from "@/lib/app-path";

import { useState } from "react";

interface Props {
  incidentId: string;
  initialResolved: boolean;
}

export function ResolveButton({ incidentId, initialResolved }: Props) {
  const [resolved, setResolved] = useState(initialResolved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/incidents/${incidentId}/resolve`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { resolved: boolean };
        setResolved(data.resolved);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-1.5 text-xs rounded border transition-colors disabled:opacity-50 ${
        resolved
          ? "bg-emerald-900/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60"
          : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200"
      }`}
    >
      {loading ? "…" : resolved ? "✓ Resolved" : "Mark Resolved"}
    </button>
  );
}
