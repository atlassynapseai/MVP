"use client";
import { basePath } from "@/lib/app-path";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Copy, Check } from "lucide-react";

interface Props {
  hasConnection: boolean;
  orgId: string;
}

type Step = 1 | 2 | 3;
type Tab = "python" | "nodejs" | "n8n" | "zapier" | "http";

const INGEST_URL = "https://atlas-synapse-edge.atlassynapseai.workers.dev";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "python",  label: "Python",   sub: "Anthropic · OpenAI · LangChain · CrewAI · more" },
  { id: "nodejs",  label: "Node.js",  sub: "Vercel AI SDK · OpenAI · any JS agent"           },
  { id: "n8n",     label: "n8n",      sub: "no-code workflow automation"                      },
  { id: "zapier",  label: "Zapier",   sub: "no-code · any Zap"                                },
  { id: "http",    label: "Any HTTP", sub: "Make.com · curl · any language"                   },
];

function CodeBlock({ code, onCopy }: { code: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }
  return (
    <div className="relative group">
      <pre className="text-xs bg-gray-950 rounded-lg p-4 border border-gray-800 text-gray-300 overflow-x-auto font-mono leading-relaxed whitespace-pre">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function TabContent({ tab, token }: { tab: Tab; token: string | null }) {
  const t = token ?? "YOUR_PROJECT_TOKEN";
  const url = INGEST_URL;

  if (tab === "python") return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["Anthropic", "OpenAI", "LangChain", "CrewAI", "LlamaIndex", "AutoGen", "any framework"].map((f) => (
          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">{f}</span>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">1 — Install</p>
        <CodeBlock code="pip install atlas-synapse" />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">2 — Add to your agent (works with any framework)</p>
        <CodeBlock code={`from atlas_synapse import AtlasSynapseSdk, TracePayload
from datetime import datetime, timezone
import secrets

sdk = AtlasSynapseSdk(
    project_token="${t}",
    ingest_url="${url}",
    agent_name="my-agent",         # name shown in your dashboard
)

# ── After your agent runs — add these 3 lines ──────────────
sdk.post_trace(TracePayload(
    agent_id="my-agent",
    external_trace_id=secrets.token_hex(8),   # unique per run
    timestamp=datetime.now(timezone.utc).isoformat(),
    prompt=user_input,                         # what the user sent
    response=agent_output,                     # what your agent replied
    platform="anthropic",                      # or "openai", "langchain", etc.
))`} />
      </div>

      <div className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-300">Anthropic agent — zero-change wrap</p>
        <CodeBlock code={`from atlas_synapse import AtlasSynapseSdk, wrap_agent

sdk = AtlasSynapseSdk(
    project_token="${t}",
    ingest_url="${url}",
    agent_name="my-anthropic-agent",
)

# Wrap once — every run auto-posts a trace
agent = wrap_agent(your_existing_agent, sdk)`} />
      </div>
    </div>
  );

  if (tab === "nodejs") return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["Vercel AI SDK", "OpenAI JS", "Anthropic JS", "any Node.js agent"].map((f) => (
          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">{f}</span>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">1 — Install</p>
        <CodeBlock code="npm install atlas-synapse" />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">2 — Any Node.js agent</p>
        <CodeBlock code={`import { AtlasSynapseClient } from "atlas-synapse";

const atlas = new AtlasSynapseClient({
  token: "${t}",
  agentName: "my-agent",
});

// After your agent runs — add this one line:
await atlas.trace({ prompt: userMessage, response: agentReply, platform: "openai" });`} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Vercel AI SDK — wrap generateText</p>
        <CodeBlock code={`import { AtlasSynapseClient, wrapVercelAI } from "atlas-synapse";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const atlas = new AtlasSynapseClient({ token: "${t}", agentName: "my-agent" });

// Replace generateText with wrapVercelAI — no other changes
const { text } = await wrapVercelAI(
  atlas,
  () => generateText({ model: openai("gpt-4o"), prompt: userPrompt }),
  { prompt: userPrompt },
);`} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Vercel AI SDK — streamText</p>
        <CodeBlock code={`import { vercelOnFinish } from "atlas-synapse";

const stream = streamText({
  model: openai("gpt-4o"),
  prompt: userPrompt,
  onFinish: vercelOnFinish(atlas, { prompt: userPrompt }),  // add this line
});`} />
      </div>
    </div>
  );

  if (tab === "n8n") return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Import our ready-made n8n workflow template. Add a single HTTP Request node to the end of any existing workflow — no code required.
      </p>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">1 — Download the template</p>
        <a
          href={`${basePath}/templates/n8n-atlas-reporter.json`}
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EA4B71]/10 border border-[#EA4B71]/30 text-[#EA4B71] text-sm font-medium hover:bg-[#EA4B71]/20 transition-colors"
        >
          Download n8n template
        </a>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">2 — Import in n8n</p>
        <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
          <li>In n8n: <strong className="text-gray-200">Settings → Import Workflow</strong></li>
          <li>Select the downloaded JSON file</li>
          <li>In the HTTP Request node, set <code className="text-violet-300 bg-gray-800 px-1 rounded">projectToken</code> to your token below</li>
          <li>Connect the reporter node at the <strong className="text-gray-200">end</strong> of your workflow</li>
        </ol>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Or — manual HTTP Request node</p>
        <CodeBlock code={`URL:    ${url}/ingest
Method: POST
Body:
{
  "projectToken": "${t}",
  "agentId":      "{{ $node['YourAgent'].data.agentName }}",
  "externalTraceId": "{{ $now.toISO() }}-{{ $runIndex }}",
  "timestamp":    "{{ $now.toISO() }}",
  "prompt":       "{{ $node['YourAgent'].data.input }}",
  "response":     "{{ $node['YourAgent'].data.output }}",
  "platform":     "n8n"
}`} />
        <p className="text-xs text-gray-500 mt-2">Note: omit <code className="text-gray-400">tokenCount</code> — n8n has no native token count.</p>
      </div>
    </div>
  );

  if (tab === "zapier") return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Use the Atlas Synapse "Send Agent Trace" Zapier action. Add it as the last step in any Zap that runs an AI agent.
      </p>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Steps</p>
        <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
          <li>In your Zap, add a new action step</li>
          <li>Search for <strong className="text-gray-200">Atlas Synapse AI</strong></li>
          <li>Choose action: <strong className="text-gray-200">Send Agent Trace</strong></li>
          <li>Authenticate with your project token</li>
          <li>Map your Zap&apos;s fields to: Agent Name, Prompt, Response</li>
        </ol>
      </div>

      <div className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-4">
        <p className="text-xs font-semibold text-gray-300 mb-2">Your project token</p>
        <code className="text-sm text-gray-100 break-all font-mono">{t}</code>
      </div>

      <p className="text-sm text-gray-500">
        Alternatively, use a <strong className="text-gray-400">Webhooks by Zapier</strong> POST step with the HTTP payload shown in the &quot;Any HTTP&quot; tab.
      </p>
    </div>
  );

  if (tab === "http") return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["Make.com", "curl", "Go", "Ruby", "PHP", "Java", "any language"].map((f) => (
          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300 border border-gray-700">{f}</span>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Endpoint</p>
        <CodeBlock code={`POST ${url}/ingest\nContent-Type: application/json`} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Payload</p>
        <CodeBlock code={`{
  "projectToken":    "${t}",
  "agentId":         "my-agent",          // shown in your dashboard
  "externalTraceId": "unique-run-id",     // unique string per run
  "timestamp":       "2026-04-30T10:00:00Z",
  "prompt":          "user message here",
  "response":        "agent reply here",
  "platform":        "custom",            // any string, e.g. "make", "ruby"

  // optional:
  "toolCalls": [
    { "name": "search", "input": { "query": "..." }, "output": "..." }
  ],
  "tokenCount": 512,
  "costCents":  4.2
}`} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">curl example</p>
        <CodeBlock code={`curl -X POST ${url}/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectToken": "${t}",
    "agentId": "my-agent",
    "externalTraceId": "run-001",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "prompt": "What is the return policy?",
    "response": "We offer 30-day returns on all items.",
    "platform": "custom"
  }'`} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Make.com — HTTP module settings</p>
        <CodeBlock code={`URL:              ${url}/ingest
Method:           POST
Body type:        Raw (application/json)
Content-Type:     application/json
Body:
{
  "projectToken": "${t}",
  "agentId":      "{{agentName}}",
  "externalTraceId": "{{now}}",
  "timestamp":    "{{formatDate(now; 'YYYY-MM-DDTHH:mm:ss[Z]')}}",
  "prompt":       "{{userInput}}",
  "response":     "{{agentOutput}}",
  "platform":     "make"
}`} />
      </div>
    </div>
  );

  return null;
}

export function OnboardingWizard({ hasConnection }: Props) {
  const [step, setStep] = useState<Step>(hasConnection ? 2 : 1);
  const [token, setToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("python");
  const [tokenCopied, setTokenCopied] = useState(false);

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

  function copyToken() {
    if (!token) return;
    void navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  const steps: { label: string; done: boolean }[] = [
    { label: "Create a token",        done: step > 1 || hasConnection },
    { label: "Connect your agent",    done: step > 2                  },
    { label: "You're live",           done: step > 3                  },
  ];

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
              s.done
                ? "bg-emerald-900/60 text-emerald-400 border-emerald-700"
                : step === i + 1
                ? "bg-violet-900/60 text-violet-300 border-violet-700"
                : "bg-gray-800 text-gray-500 border-gray-700"
            }`}>
              {s.done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={`hidden sm:inline transition-colors ${
              s.done ? "text-emerald-400" : step === i + 1 ? "text-gray-200" : "text-gray-600"
            }`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-gray-700 mx-1 hidden sm:inline">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1 — create token */}
      {step === 1 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">Step 1 — Create your project token</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            A project token authenticates your AI agent when it sends traces to Atlas Synapse.
            It&apos;s shown <strong className="text-gray-200">once only</strong> — copy it immediately after creation.
          </p>
          {error && <p className="text-sm text-red-400 bg-red-950/30 rounded p-2">{error}</p>}
          <button
            onClick={createToken}
            disabled={creating}
            className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create token"}
          </button>
        </div>
      )}

      {/* Step 2 — connect agent */}
      {step === 2 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100">Step 2 — Connect your agent</h2>

          {/* Token banner */}
          {token && (
            <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Your project token — copy now, shown once</p>
                <button onClick={copyToken} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  {tokenCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <code className="text-sm text-gray-100 break-all font-mono">{token}</code>
            </div>
          )}

          {/* Integration tabs */}
          <div>
            <p className="text-sm text-gray-400 mb-3">
              Choose how your agent is built — Atlas Synapse works with all of them:
            </p>

            {/* Tab selector */}
            <div className="flex flex-wrap gap-2 mb-5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    tab === t.id
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab subtitle */}
            <p className="text-xs text-gray-500 mb-4">
              {TABS.find((t) => t.id === tab)?.sub}
            </p>

            {/* Tab content */}
            <TabContent tab={tab} token={token} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-800">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              I&apos;ve sent a trace →
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — done */}
      {step === 3 && (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/10 p-8 space-y-4 text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-semibold text-gray-100">You&apos;re live!</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Your agent is now monitored by Atlas Synapse. Every conversation is logged,
            PII is stripped automatically, and your team gets alerted instantly when something
            goes wrong — via Slack, email, or webhook.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link href="/dashboard" className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
              Go to Dashboard →
            </Link>
            <Link href="/dashboard/traces" className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors">
              View Traces
            </Link>
            <Link href="/dashboard/settings" className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors">
              Set up alerts
            </Link>
          </div>
        </div>
      )}

      {step < 3 && (
        <p className="text-xs text-gray-600">
          Already integrated?{" "}
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 underline">
            Skip to dashboard
          </Link>
        </p>
      )}
    </div>
  );
}
