"use client";
import { basePath } from "@/lib/app-path";

import { useState } from "react";
import Link from "next/link";

interface Props {
  hasConnection: boolean;
  orgId: string;
}

type Step = 1 | 2 | 3;

export function OnboardingWizard({ hasConnection }: Props) {
  const [step, setStep] = useState<Step>(hasConnection ? 2 : 1);
  const [token, setToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createToken() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/connections`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create token");
      const data = (await res.json()) as { token: string };
      setToken(data.token);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  const steps: { label: string; done: boolean }[] = [
    { label: "Create a Connection token", done: step > 1 || hasConnection },
    { label: "Install the SDK & send a trace", done: step > 2 },
    { label: "See your agent in Atlas Synapse", done: step > 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${s.done
                  ? "bg-emerald-900/60 text-emerald-400 border-emerald-700"
                  : step === i + 1
                    ? "bg-purple-900/60 text-purple-300 border-purple-700"
                    : "bg-gray-800 text-gray-500 border-gray-700"
                }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span
              className={`hidden sm:inline ${s.done ? "text-emerald-400" : step === i + 1 ? "text-gray-200" : "text-gray-600"
                }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-gray-700 mx-1 hidden sm:inline">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Step panels */}
      {step === 1 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">Step 1 — Create a Connection token</h2>
          <p className="text-sm text-gray-400">
            A Connection token authenticates your AI agent when sending traces. You&apos;ll only see it once —
            copy it immediately.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={createToken}
            disabled={creating}
            className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create token"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">Step 2 — Install the SDK &amp; send a trace</h2>

          {token && (
            <div className="rounded border border-emerald-800 bg-emerald-950/30 p-3">
              <p className="text-xs text-emerald-400 mb-1 font-semibold uppercase tracking-wide">Your token (copy now — shown once)</p>
              <code className="text-sm text-gray-100 break-all font-mono">{token}</code>
            </div>
          )}

          <p className="text-sm text-gray-400">Install the Python SDK:</p>
          <pre className="text-xs bg-gray-950 rounded p-3 border border-gray-800 text-gray-300 overflow-x-auto">
            {`pip install atlas-synapse`}
          </pre>

          <p className="text-sm text-gray-400">Send your first trace:</p>
          <pre className="text-xs bg-gray-950 rounded p-3 border border-gray-800 text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {`import anthropic
from atlas_synapse import AtlasSynapseClient

atlas = AtlasSynapseClient(token="${token ?? "YOUR_TOKEN_HERE"}")
client = anthropic.Anthropic()

with atlas.trace() as trace:
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": "Hello!"}],
    )
    trace.record(
        prompt="Hello!",
        response=response.content[0].text,
        token_count=response.usage.input_tokens + response.usage.output_tokens,
    )`}
          </pre>

          <p className="text-sm text-gray-400">
            Or use the{" "}
            <a
              href="https://github.com/AtlasSynapse/MVP"
              className="text-purple-400 hover:text-purple-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              N8N template
            </a>{" "}
            for no-code workflows.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
            >
              I&apos;ve sent a trace →
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/10 p-6 space-y-4 text-center">
          <div className="text-4xl">🎉</div>
          <h2 className="text-lg font-semibold text-gray-100">You&apos;re all set!</h2>
          <p className="text-sm text-gray-400">
            Head to your dashboard — your first agent and trace should appear within seconds of
            sending.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link
              href={`/dashboard`}
              className="px-5 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
            >
              Go to Dashboard →
            </Link>
            <Link
              href={`/dashboard/traces`}
              className="px-5 py-2 rounded border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              View Traces
            </Link>
          </div>
        </div>
      )}

      {/* Skip link */}
      {step < 3 && (
        <p className="text-xs text-gray-600">
          Already set up?{" "}
          <Link href={`/dashboard`} className="text-gray-500 hover:text-gray-300 underline">
            Skip to dashboard
          </Link>
        </p>
      )}
    </div>
  );
}
