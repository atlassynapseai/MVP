"use client";
import { basePath } from "@/lib/app-path";

import { useState } from "react";

interface Connection {
  id: string;
  type: string;
  status: string;
  createdAt: Date | string;
  revokedAt?: Date | string | null;
}

interface Props {
  initialConnections: Connection[];
}

function timeAgo(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffD === 0) return "today";
  if (diffD === 1) return "yesterday";
  return `${diffD}d ago`;
}

export function ConnectionsClient({ initialConnections }: Props) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setNewToken(null);
    try {
      const res = await fetch(`${basePath}/api/connections`, { method: "POST" });
      if (!res.ok) { setError("Failed to create connection."); return; }
      const data = await res.json() as { connection: Connection; token: string };
      setConnections((prev) => [data.connection, ...prev]);
      setNewToken(data.token);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/connections/${id}`, { method: "DELETE" });
      if (!res.ok) { setError("Failed to revoke connection."); return; }
      setConnections((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: "revoked", revokedAt: new Date() } : c)
      );
      if (newToken) setNewToken(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* New token banner */}
      {newToken && (
        <div className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-4">
          <p className="text-sm font-medium text-emerald-300 mb-2">
            New project token — copy it now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-gray-900 border border-gray-700 rounded px-3 py-2 text-emerald-200 break-all">
              {newToken}
            </code>
            <button
              onClick={copyToken}
              className="shrink-0 px-3 py-2 text-xs rounded border border-emerald-700 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Use this token as <code className="text-gray-400">projectToken</code> in your SDK or ingest payload.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Create button */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">
          {connections.filter((c) => c.status === "active").length} active connection{connections.filter((c) => c.status === "active").length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "Creating…" : "New Connection"}
        </button>
      </div>

      {/* Connections list */}
      {connections.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500 text-sm">
          No connections yet. Create one to start sending traces.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn) => (
                <tr key={conn.id} className="border-b border-gray-800 bg-gray-950 last:border-0">
                  <td className="px-4 py-3 text-gray-300 capitalize">{conn.type}</td>
                  <td className="px-4 py-3">
                    {conn.status === "active" ? (
                      <span className="px-2 py-0.5 text-xs rounded border bg-emerald-900/40 text-emerald-400 border-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded border bg-gray-800 text-gray-500 border-gray-700">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{timeAgo(conn.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {conn.status === "active" && (
                      <button
                        onClick={() => handleRevoke(conn.id)}
                        disabled={revoking === conn.id}
                        className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                      >
                        {revoking === conn.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage snippet */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick start</h2>
        <pre className="text-xs text-gray-400 overflow-x-auto leading-relaxed">{`curl -X POST https://atlas-synapse-edge.atlassynapseai.workers.dev/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectToken": "<your-token>",
    "agentId": "my-agent",
    "externalTraceId": "trace-001",
    "timestamp": "2024-01-01T00:00:00Z",
    "prompt": "User request here",
    "response": "Agent response here",
    "toolCalls": [],
    "platform": "generic"
  }'`}</pre>
      </div>
    </div>
  );
}
