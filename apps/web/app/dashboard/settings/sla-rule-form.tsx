"use client";

import { useState } from "react";

interface SlaRule {
  id: string;
  maxErrorRatePct: number;
  windowMinutes: number;
  enabled: boolean;
  agentId: string | null;
  agent?: { id: string; displayName: string } | null;
}

interface Props {
  initialRules: SlaRule[];
}

export function SlaRuleForm({ initialRules }: Props) {
  const [rules, setRules] = useState<SlaRule[]>(initialRules);
  const [maxErrorRatePct, setMaxErrorRatePct] = useState(20);
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sla-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxErrorRatePct, windowMinutes, agentId: null, enabled: true }),
      });
      if (!res.ok) { setMessage("Save failed"); return; }
      const rule = await res.json() as SlaRule;
      setRules((prev) => {
        const idx = prev.findIndex((r) => r.agentId === null);
        if (idx >= 0) { const next = [...prev]; next[idx] = rule; return next; }
        return [...prev, rule];
      });
      setMessage("Saved");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(agentId: string | null) {
    const params = agentId ? `?agentId=${agentId}` : "";
    const res = await fetch(`/api/sla-rules${params}`, { method: "DELETE" });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.agentId !== agentId));
    }
  }

  async function toggle(rule: SlaRule) {
    const res = await fetch("/api/sla-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxErrorRatePct: rule.maxErrorRatePct,
        windowMinutes: rule.windowMinutes,
        agentId: rule.agentId,
        enabled: !rule.enabled,
      }),
    });
    if (res.ok) {
      const updated = await res.json() as SlaRule;
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    }
  }

  const orgRule = rules.find((r) => r.agentId === null);

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-200">Org-wide SLA Rule</h3>
        <p className="text-xs text-gray-400">
          Alert when error rate exceeds threshold over a rolling window. Applies to all agents unless overridden per-agent.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max Error Rate (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxErrorRatePct}
              onChange={(e) => setMaxErrorRatePct(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Window (minutes)</label>
            <input
              type="number"
              min={5}
              max={1440}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded font-medium"
          >
            {saving ? "Saving…" : "Save Rule"}
          </button>
          {message && <span className="text-xs text-green-400">{message}</span>}
        </div>
      </div>

      {rules.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-200 mb-3">Active Rules</h3>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-800 last:border-0">
                <div>
                  <span className="text-gray-200">
                    {rule.agent?.displayName ?? "All agents"}
                  </span>
                  <span className="text-gray-400 ml-2">
                    — max {rule.maxErrorRatePct}% errors / {rule.windowMinutes} min
                  </span>
                  {!rule.enabled && <span className="ml-2 text-xs text-yellow-500">(paused)</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggle(rule)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    {rule.enabled ? "Pause" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.agentId)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orgRule && (
        <p className="text-xs text-gray-500">
          Current rule: alert when &gt;{orgRule.maxErrorRatePct}% of traces are failures over {orgRule.windowMinutes} min. Minimum 5 traces required.
        </p>
      )}
    </div>
  );
}
