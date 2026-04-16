"use client";

import { useState } from "react";
import { INCIDENT_CATEGORIES, CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";

interface FeedbackFormProps {
  incidentId: string;
  alreadySubmitted: boolean;
}

export function FeedbackForm({ incidentId, alreadySubmitted }: FeedbackFormProps) {
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [correctCategory, setCorrectCategory] = useState<string>("");
  const [correctSeverity, setCorrectSeverity] = useState<string>("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  if (alreadySubmitted || status === "done") {
    return (
      <p className="text-sm text-emerald-400">Feedback submitted. Thank you.</p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (correct === null) return;
    setStatus("submitting");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          correct,
          correctCategory: correctCategory || undefined,
          correctSeverity: correctSeverity || undefined,
          note: note.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        setStatus("done");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-gray-300 mb-2 font-medium">Was this a real incident?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCorrect(true)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              correct === true
                ? "bg-emerald-900/60 border-emerald-700 text-emerald-300"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            Yes, real incident
          </button>
          <button
            type="button"
            onClick={() => setCorrect(false)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              correct === false
                ? "bg-red-900/40 border-red-800 text-red-300"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            No, false alarm
          </button>
        </div>
      </div>

      {correct === false && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Correct category (optional)</label>
            <select
              value={correctCategory}
              onChange={(e) => setCorrectCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-600"
            >
              <option value="">— Select category —</option>
              {(INCIDENT_CATEGORIES as IncidentCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
              <option value="none">None — not an incident</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Correct severity (optional)</label>
            <select
              value={correctSeverity}
              onChange={(e) => setCorrectSeverity(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-600"
            >
              <option value="">— Select severity —</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="none">None — not an incident</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Any additional context…"
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-600 resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-400">Failed to submit. Please try again.</p>
      )}

      <button
        type="submit"
        disabled={correct === null || status === "submitting"}
        className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {status === "submitting" ? "Submitting…" : "Submit Feedback"}
      </button>
    </form>
  );
}
