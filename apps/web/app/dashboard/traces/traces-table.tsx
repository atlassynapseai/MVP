"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface TraceRow {
  id: string;
  createdAt: string;
  status: string;
  redactedPrompt: string;
  redactedResponse: string;
  summary: string | null;
  agent: { id: string; displayName: string };
  evaluation: { outcome: string; confidence: number } | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    alerted: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    translated: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    failed: "bg-red-900/40 text-red-400 border-red-800",
    received: "bg-gray-800 text-gray-400 border-gray-700",
    processing: "bg-blue-900/40 text-blue-400 border-blue-800",
    evaluated: "bg-purple-900/40 text-purple-400 border-purple-800",
  };
  const style = styles[status] ?? "bg-gray-800 text-gray-400 border-gray-700";
  return <span className={`px-2 py-0.5 text-xs rounded border ${style}`}>{status}</span>;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "pass") return <span className="text-emerald-400 text-xs">Pass</span>;
  if (outcome === "anomaly") return <span className="text-yellow-400 text-xs">Anomaly</span>;
  if (outcome === "failure") return <span className="text-red-400 text-xs">Failure</span>;
  return <span className="text-gray-500 text-xs">—</span>;
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

export function TracesTable({ traces, agentNames }: { traces: TraceRow[]; agentNames: string[] }) {
  const [search, setSearch] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");

  const filtered = useMemo(() => {
    return traces.filter((t) => {
      if (filterAgent && t.agent.displayName !== filterAgent) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterOutcome) {
        if (!t.evaluation) return false;
        if (t.evaluation.outcome !== filterOutcome) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          t.redactedPrompt.toLowerCase().includes(q) ||
          t.redactedResponse.toLowerCase().includes(q) ||
          (t.summary?.toLowerCase().includes(q) ?? false) ||
          t.agent.displayName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [traces, search, filterAgent, filterStatus, filterOutcome]);

  const statuses = ["received", "processing", "pass", "evaluated", "translated", "alerted", "failed"];
  const outcomes = ["pass", "anomaly", "failure"];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompt, response, summary…"
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-700 transition-colors"
        />
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="px-3 py-1.5 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 focus:outline-none focus:border-purple-700"
        >
          <option value="">All agents</option>
          {agentNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 focus:outline-none focus:border-purple-700"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="px-3 py-1.5 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 focus:outline-none focus:border-purple-700"
        >
          <option value="">All outcomes</option>
          {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          onClick={() => window.location.href = "/api/export?type=traces"}
          className="px-3 py-1.5 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <p className="text-xs text-gray-600">{filtered.length} of {traces.length} traces</p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No traces match your filters.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">When</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Input</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Output</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Eval</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trace) => (
                <tr key={trace.id} className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">
                    <Link href={`/dashboard/agents/${trace.agent.id}`} className="hover:text-purple-300 transition-colors">
                      {trace.agent.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    <Link href={`/dashboard/traces/${trace.id}`} className="hover:text-purple-300 transition-colors">
                      {timeAgo(trace.createdAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[160px]">
                    <span className="truncate block" title={trace.redactedPrompt}>
                      {trace.redactedPrompt.slice(0, 80)}{trace.redactedPrompt.length > 80 && "…"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[160px]">
                    <span className="truncate block" title={trace.redactedResponse}>
                      {trace.redactedResponse.slice(0, 80)}{trace.redactedResponse.length > 80 && "…"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {trace.evaluation ? (
                      <div className="flex items-center gap-1">
                        <OutcomeBadge outcome={trace.evaluation.outcome} />
                        <span className="text-gray-600 text-xs">{Math.round(trace.evaluation.confidence * 100)}%</span>
                      </div>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={trace.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
