import Link from "next/link";
import {
  Shield, Bell, Activity, Zap, Eye, AlertTriangle,
  CheckCircle, ArrowRight, Code2, Users, Bot,
} from "lucide-react";

// ── Integrations ──────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { name: "Slack",       color: "bg-[#4A154B] text-white"              },
  { name: "Anthropic",   color: "bg-[#CC785C]/20 text-[#CC785C]"       },
  { name: "OpenAI",      color: "bg-emerald-500/20 text-emerald-300"   },
  { name: "LangChain",   color: "bg-blue-500/20 text-blue-300"         },
  { name: "Vercel AI",   color: "bg-white/10 text-gray-200"            },
  { name: "n8n",         color: "bg-[#EA4B71]/20 text-[#EA4B71]"       },
  { name: "Zapier",      color: "bg-[#FF4A00]/20 text-orange-300"      },
  { name: "Make.com",    color: "bg-purple-500/20 text-purple-300"     },
  { name: "CrewAI",      color: "bg-cyan-500/20 text-cyan-300"         },
  { name: "LlamaIndex",  color: "bg-yellow-500/20 text-yellow-300"     },
  { name: "AutoGen",     color: "bg-indigo-500/20 text-indigo-300"     },
  { name: "Raw HTTP",    color: "bg-gray-700 text-gray-300"            },
];

// ── Steps ─────────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: Code2,
    step: "01",
    title: "Connect in 3 lines",
    description: "Install the SDK and wrap your agent. Works with any AI framework — no architecture changes required.",
    code: `sdk = AtlasSynapseSdk(token=..., url=...)
sdk.post_trace(prompt=input, response=output)
# that's it.`,
    color: "text-violet-400",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/10",
  },
  {
    icon: Eye,
    step: "02",
    title: "Every conversation monitored",
    description: "PII is stripped at the edge before storage. Claude evaluates every trace for policy violations, harmful outputs, and anomalies.",
    color: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
  },
  {
    icon: Bell,
    step: "03",
    title: "Team alerted instantly",
    description: "Slack, email, or outbound webhook — your team gets a rich notification with the incident summary and a direct link to investigate.",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
  },
];

// ── Flow steps ────────────────────────────────────────────────────────────
const FLOW = [
  { label: "Your Agent",         sub: "any framework",       icon: Bot,           color: "bg-violet-500/20 border-violet-500/40 text-violet-300" },
  { label: "Edge Worker",        sub: "PII strip + HMAC",    icon: Shield,        color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { label: "Postgres",           sub: "trace stored",        icon: Activity,      color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" },
  { label: "Claude Evaluator",   sub: "pass / flag / alert", icon: Zap,           color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" },
  { label: "Dashboard + Alerts", sub: "Slack · email · webhook", icon: Bell,      color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
];

// ── Mock activity items ───────────────────────────────────────────────────
const MOCK_ACTIVITY = [
  { agent: "customer-support-bot", summary: "Return policy inquiry — handled correctly", status: "pass",    time: "2m ago"  },
  { agent: "booking-assistant",    summary: "Flight search completed, options presented", status: "pass",    time: "5m ago"  },
  { agent: "customer-support-bot", summary: "Agent exposed bulk customer PII to unauthenticated request", status: "alerted",  time: "8m ago"  },
  { agent: "hr-assistant",         summary: "Parental leave policy inquiry answered accurately", status: "pass",    time: "12m ago" },
  { agent: "analytics-bot",        summary: "Exported 847K records including customer PII", status: "alerted",  time: "18m ago" },
];

function statusDot(s: string) {
  if (s === "pass") return "bg-emerald-400";
  if (s === "alerted") return "bg-red-400";
  return "bg-yellow-400";
}
function statusLabel(s: string) {
  if (s === "pass") return "text-emerald-400";
  if (s === "alerted") return "text-red-400";
  return "text-yellow-400";
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-gray-950/80 backdrop-blur border-b border-gray-800/60">
        <span className="text-gradient-purple font-bold text-lg tracking-tight">Atlas Synapse</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:block">HR for Your AI</span>
          <Link
            href="/login"
            className="btn-glow text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Live monitoring for AI agents
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          <span className="text-gradient-purple">HR</span>
          <span className="text-white"> for Your AI</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Monitor your AI agents like employees. Catch policy violations, data leaks,
          and harmful outputs before your customers do — with alerts straight to Slack.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="btn-glow flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors font-medium"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ── Integrations ────────────────────────────────────────────────── */}
      <section className="pb-20 px-6">
        <p className="text-center text-sm text-gray-500 mb-6 uppercase tracking-widest">
          Works with your existing agents
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {INTEGRATIONS.map((i) => (
            <span
              key={i.name}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border border-white/5 ${i.color}`}
            >
              {i.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Three steps from zero to full agent observability. No infrastructure to manage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className={`card-hover p-6 rounded-2xl bg-gray-900 border ${s.border} shadow-lg ${s.glow}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-black text-gray-700">{s.step}</span>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${s.color}`}>{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{s.description}</p>
              {s.code && (
                <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto border border-gray-800 font-mono leading-relaxed">
                  {s.code}
                </pre>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Data flow ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900/40 border-y border-gray-800/60">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Data flow</h2>
          <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
            Every trace travels through a secure, privacy-first pipeline before reaching your dashboard.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-2">
            {FLOW.map((f, i) => (
              <div key={f.label} className="flex flex-col md:flex-row items-center gap-2">
                <div className={`card-hover flex flex-col items-center gap-2 p-5 rounded-2xl border ${f.color} bg-gray-900 min-w-[130px] text-center`}>
                  <f.icon className="w-6 h-6" />
                  <span className="font-semibold text-sm">{f.label}</span>
                  <span className="text-xs opacity-60">{f.sub}</span>
                </div>
                {i < FLOW.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-600 shrink-0 rotate-90 md:rotate-0" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-center text-gray-400">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <Shield className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <strong className="text-white block mb-1">PII stripped at the edge</strong>
              Emails, phones, credit cards redacted before leaving your agent's network
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <strong className="text-white block mb-1">Claude evaluates every trace</strong>
              Classifies: pass · anomaly · failure · scope violation · harmful output
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <Users className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <strong className="text-white block mb-1">Org-scoped data isolation</strong>
              Every query is scoped to your org — zero cross-tenant data leakage
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard preview ───────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Your dashboard</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          A real-time view of every agent conversation — with health scores, PII
          redaction status, and one-click incident investigation.
        </p>

        {/* Mock activity feed */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <span className="font-semibold text-gray-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" /> Recent Activity
            </span>
            <span className="text-xs text-gray-500">Live • refreshes every 30s</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {MOCK_ACTIVITY.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-800/40 transition-colors cursor-default"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(item.status)}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-200 text-sm">{item.agent}</span>
                  <span className="text-gray-700 text-sm mx-2">—</span>
                  <span className="text-gray-400 text-sm">{item.summary}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium ${statusLabel(item.status)}`}>{item.status}</span>
                  <span className="text-xs text-gray-600">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Agents monitored", value: "4",   sub: "across 3 platforms" },
            { label: "Traces today",     value: "127",  sub: "↑ 23% vs yesterday" },
            { label: "Pass rate",        value: "94%",  sub: "↑ 2pts this week"  },
            { label: "Open incidents",   value: "2",    sub: "1 critical"        },
          ].map((s) => (
            <div key={s.label} className="card-hover bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-xs font-medium text-gray-300 mb-0.5">{s.label}</div>
              <div className="text-xs text-gray-500">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Slack alert mockup ───────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900/40 border-y border-gray-800/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Alerts where your team already is</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            When an incident fires, your Slack channel gets a rich notification — severity,
            agent name, summary, and a direct link to investigate.
          </p>

          {/* Slack message mockup */}
          <div className="rounded-2xl bg-[#1A1D21] border border-gray-700/60 overflow-hidden shadow-2xl font-sans">
            {/* Slack top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/40 bg-[#19171D]">
              <span className="text-[#4A154B] font-bold text-sm">#alerts</span>
              <span className="text-gray-600 text-xs">— Atlas Synapse notifications</span>
            </div>

            {/* Message */}
            <div className="px-4 py-4 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                AS
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">Atlas Synapse</span>
                  <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">APP</span>
                  <span className="text-xs text-gray-500">Today at 10:42 AM</span>
                </div>

                {/* Slack attachment block */}
                <div className="rounded-lg border-l-4 border-red-500 bg-[#222529] p-4 mt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <span className="font-bold text-white text-sm">🔴 Critical — scope_violation</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Agent</div>
                      <div className="text-white font-medium">customer-support-bot</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Severity</div>
                      <div className="text-red-400 font-medium">critical</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-300 leading-relaxed border-t border-gray-700/60 pt-3">
                    Agent exposed bulk customer PII (12,847 records including emails and partial card numbers) in response to an unauthenticated export request. Immediate review required.
                  </div>

                  <div className="pt-1">
                    <button className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
                      View Incident <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Also supports email (Brevo), outbound webhooks, Zapier, and n8n
          </p>
        </div>
      </section>

      {/* ── What gets flagged ────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">What Atlas Synapse catches</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Claude reads every conversation and flags issues your team would care about.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Shield,        title: "Data leaks",          desc: "Agent sharing another customer's PII, account data, or internal records.", color: "text-red-400"    },
            { icon: AlertTriangle, title: "Policy violations",   desc: "Approving refunds above limit, making promises outside scope, bypassing controls.", color: "text-orange-400" },
            { icon: Zap,           title: "Harmful outputs",     desc: "Dangerous advice, discriminatory language, or content that could cause harm.", color: "text-yellow-400" },
            { icon: Eye,           title: "Scope violations",    desc: "Agent acting outside its defined purpose or attempting unauthorised actions.", color: "text-blue-400"   },
            { icon: Activity,      title: "Anomalies",           desc: "Unusual patterns — unexpected refusals, hallucinated facts, format drift.", color: "text-violet-400" },
            { icon: CheckCircle,   title: "SLA breaches",        desc: "Error rate exceeds your configured threshold over a rolling time window.", color: "text-emerald-400" },
          ].map((item) => (
            <div key={item.title} className="card-hover p-5 rounded-2xl bg-gray-900 border border-gray-800">
              <item.icon className={`w-5 h-5 ${item.color} mb-3`} />
              <h3 className="font-semibold text-white mb-1.5">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-8">
            <CheckCircle className="w-3.5 h-3.5" /> No infrastructure changes required
          </div>

          <h2 className="text-4xl font-bold mb-6">
            Ready to monitor your{" "}
            <span className="text-gradient-purple">AI agents</span>?
          </h2>

          <p className="text-gray-400 text-lg mb-10">
            Connect your first agent in under 5 minutes.
            Works with Slack, n8n, Zapier, Python, Node.js, and more.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="btn-glow flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors"
            >
              Get started free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/60 px-6 py-8 text-center text-gray-600 text-sm">
        <span className="text-gradient-purple font-semibold">Atlas Synapse</span>
        {" "}— HR for Your AI · {" "}
        <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
      </footer>

    </div>
  );
}
