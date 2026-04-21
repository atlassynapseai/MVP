"use client";
import { basePath } from "@/lib/app-path";

import { useState } from "react";

type WebhookEvent = "incident.created" | "incident.resolved";

export interface SerializedWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface WebhookFormProps {
  initialWebhooks: SerializedWebhook[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function WebhookForm({ initialWebhooks }: WebhookFormProps) {
  const [webhooks, setWebhooks] = useState<SerializedWebhook[]>(initialWebhooks);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>(["incident.created"]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<{ id: string; secret: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allEvents: WebhookEvent[] = ["incident.created", "incident.resolved"];

  function toggleEvent(event: WebhookEvent) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedEvents.length === 0) {
      setErrorMsg("Select at least one event.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch(`${basePath}/api/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events: selectedEvents }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? "Failed to create webhook.");
        setStatus("error");
        return;
      }

      const data = await res.json() as { webhook: SerializedWebhook & { secret: string } };
      setWebhooks((prev) => [data.webhook, ...prev]);
      setRevealedSecret({ id: data.webhook.id, secret: data.webhook.secret });
      setUrl("");
      setSelectedEvents(["incident.created"]);
      setStatus("idle");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`${basePath}/api/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
        if (revealedSecret?.id === id) setRevealedSecret(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing webhooks */}
      {webhooks.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">URL</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Events</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => (
                <tr
                  key={wh.id}
                  className="border-b border-gray-800 bg-gray-950 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-200 max-w-xs">
                    <span className="truncate block font-mono text-xs">{wh.url}</span>
                    {revealedSecret?.id === wh.id && (
                      <div className="mt-2 p-2 rounded bg-yellow-900/30 border border-yellow-800">
                        <p className="text-xs text-yellow-400 font-semibold mb-1">
                          Copy this secret — it will only be shown once.
                        </p>
                        <code className="block text-xs text-yellow-200 break-all select-all">
                          {revealedSecret.secret}
                        </code>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {wh.events.join(", ")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(wh.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(wh.id)}
                      disabled={deletingId === wh.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {deletingId === wh.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {webhooks.length === 0 && (
        <p className="text-sm text-gray-500">No webhooks configured yet.</p>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Endpoint URL
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/atlas"
            className="w-full px-3 py-2 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-700 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Events</label>
          <div className="flex gap-4">
            {allEvents.map((ev) => (
              <label key={ev} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                  className="accent-purple-500"
                />
                <span className="text-sm text-gray-300">{ev}</span>
              </label>
            ))}
          </div>
        </div>

        {status === "error" && (
          <p className="text-sm text-red-400">{errorMsg || "Failed to create webhook."}</p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {status === "saving" ? "Adding…" : "Add Webhook"}
        </button>
      </form>
    </div>
  );
}
