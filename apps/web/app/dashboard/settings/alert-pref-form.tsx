"use client";

import { useState } from "react";

interface AlertPrefFormProps {
  initialMode: "immediate" | "off";
  initialSeverityFloor: "warning" | "critical";
  initialSlackWebhookUrl?: string;
}

export function AlertPrefForm({ initialMode, initialSeverityFloor, initialSlackWebhookUrl }: AlertPrefFormProps) {
  const [mode, setMode] = useState<"immediate" | "off">(initialMode);
  const [severityFloor, setSeverityFloor] = useState<"warning" | "critical">(initialSeverityFloor);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(initialSlackWebhookUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    try {
      const res = await fetch("/api/alert-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, severityFloor, slackWebhookUrl }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Email Alerts</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode("immediate")}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              mode === "immediate"
                ? "bg-purple-900/60 border-purple-700 text-purple-300"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            Immediate
          </button>
          <button
            type="button"
            onClick={() => setMode("off")}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              mode === "off"
                ? "bg-gray-800 border-gray-600 text-gray-300"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            Off
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {mode === "immediate"
            ? "You'll receive an email as soon as an incident is detected."
            : "No alert emails will be sent."}
        </p>
      </div>

      {mode === "immediate" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Severity Threshold</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSeverityFloor("warning")}
              className={`px-4 py-2 text-sm rounded border transition-colors ${
                severityFloor === "warning"
                  ? "bg-yellow-900/40 border-yellow-800 text-yellow-400"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              Warning &amp; above
            </button>
            <button
              type="button"
              onClick={() => setSeverityFloor("critical")}
              className={`px-4 py-2 text-sm rounded border transition-colors ${
                severityFloor === "critical"
                  ? "bg-red-900/40 border-red-800 text-red-400"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              Critical only
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {severityFloor === "warning"
              ? "Alerts for all incidents (warnings and critical)."
              : "Alerts only for critical incidents."}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Slack Webhook <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={slackWebhookUrl}
          onChange={(e) => setSlackWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          className="w-full px-3 py-2 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-700 transition-colors"
        />
        <p className="text-xs text-gray-500 mt-1">
          Incidents will be posted to this Slack channel when alerts fire.{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300"
          >
            How to create a webhook →
          </a>
        </p>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-400">Failed to save. Please try again.</p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save Settings"}
      </button>
    </form>
  );
}
