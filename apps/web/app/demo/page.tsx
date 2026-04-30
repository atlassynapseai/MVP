"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Shield, Bell, Activity, Zap, Eye, AlertTriangle,
  CheckCircle, ArrowRight, Code2, Users, Bot,
} from "lucide-react";

// ── Intersection Observer hook ────────────────────────────────────────────
function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Count-up hook ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.floor(t * target));
      if (t < 1) requestAnimationFrame(tick);
      else setValue(target);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return value;
}

// ── Data ──────────────────────────────────────────────────────────────────
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

const FLOW = [
  { label: "Your Agent",       sub: "any framework",          icon: Bot,      color: "bg-violet-500/20 border-violet-500/40 text-violet-300",  glow: "shadow-violet-500/30" },
  { label: "Edge Worker",      sub: "PII strip + HMAC sign",  icon: Shield,   color: "bg-blue-500/20 border-blue-500/40 text-blue-300",        glow: "shadow-blue-500/30" },
  { label: "Postgres",         sub: "trace stored",           icon: Activity, color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",        glow: "shadow-cyan-500/30" },
  { label: "Claude AI",        sub: "pass / flag / alert",    icon: Zap,      color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",  glow: "shadow-yellow-500/30" },
  { label: "Dashboard+Alerts", sub: "Slack · email · webhook",icon: Bell,     color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300", glow: "shadow-emerald-500/30" },
];

const MOCK_ACTIVITY = [
  { agent: "customer-support-bot", summary: "Return policy inquiry — handled correctly",                  status: "pass",    time: "2m ago"  },
  { agent: "booking-assistant",    summary: "Flight search completed, options presented",                  status: "pass",    time: "5m ago"  },
  { agent: "customer-support-bot", summary: "Agent exposed bulk customer PII to unauthenticated request", status: "alerted", time: "8m ago"  },
  { agent: "hr-assistant",         summary: "Parental leave policy inquiry answered accurately",           status: "pass",    time: "12m ago" },
  { agent: "analytics-bot",        summary: "Exported 847K records including customer PII",               status: "alerted", time: "18m ago" },
];

const CODE = `from atlas_synapse import AtlasSynapseSdk, TracePayload

sdk = AtlasSynapseSdk(
    project_token="your-token",
    ingest_url="https://atlas-synapse-edge...",
    agent_name="my-agent",
)

# After your agent runs — add these lines:
sdk.post_trace(TracePayload(
    prompt=user_input,
    response=agent_output,
    agent_id="my-agent",
    platform="anthropic",
))`;

function statusDot(s: string) {
  if (s === "pass") return "bg-emerald-400";
  if (s === "alerted") return "bg-red-400 animate-pulse";
  return "bg-yellow-400";
}
function statusLabel(s: string) {
  if (s === "pass") return "text-emerald-400";
  if (s === "alerted") return "text-red-400";
  return "text-yellow-400";
}

// ── Animated section wrapper ───────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useVisible();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Typewriter code block ─────────────────────────────────────────────────
function TypewriterCode({ code, active }: { code: string; active: boolean }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) return;
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      i++;
      setDisplayed(code.slice(0, i));
      if (i >= code.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [active, code]);
  return (
    <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto border border-gray-800 font-mono leading-relaxed whitespace-pre min-h-[180px]">
      {displayed}
      {displayed.length < code.length && (
        <span className="inline-block w-2 h-3 bg-violet-400 ml-0.5 animate-pulse align-middle" />
      )}
    </pre>
  );
}

// ── Animated flow pipeline ────────────────────────────────────────────────
function FlowDiagram({ active }: { active: boolean }) {
  const [lit, setLit] = useState(-1);
  useEffect(() => {
    if (!active) return;
    setLit(-1);
    let i = 0;
    const interval = setInterval(() => {
      setLit(i);
      i++;
      if (i >= FLOW.length) { clearInterval(interval); }
    }, 500);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-2 flex-wrap">
      {FLOW.map((f, i) => (
        <div key={f.label} className="flex flex-col md:flex-row items-center gap-2">
          <div
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border min-w-[130px] text-center transition-all duration-500 ${f.color} bg-gray-900 ${
              lit >= i ? `shadow-lg ${f.glow} scale-105` : "opacity-50 scale-100"
            }`}
          >
            <f.icon className="w-6 h-6" />
            <span className="font-semibold text-sm">{f.label}</span>
            <span className="text-xs opacity-60">{f.sub}</span>
          </div>
          {i < FLOW.length - 1 && (
            <ArrowRight
              className={`w-4 h-4 shrink-0 rotate-90 md:rotate-0 transition-all duration-300 ${lit > i ? "text-violet-400" : "text-gray-700"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DemoPage() {
  // Hero typing animation
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 200); return () => clearTimeout(t); }, []);

  // Flow diagram trigger
  const flowRef = useRef<HTMLDivElement>(null);
  const [flowActive, setFlowActive] = useState(false);
  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { setFlowActive(true); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Code block trigger
  const codeRef = useRef<HTMLDivElement>(null);
  const [codeActive, setCodeActive] = useState(false);
  useEffect(() => {
    const el = codeRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { setCodeActive(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Stats count-up trigger
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { setStatsActive(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const c1 = useCountUp(4,   800, statsActive);
  const c2 = useCountUp(127, 1200, statsActive);
  const c3 = useCountUp(94,  1000, statsActive);
  const c4 = useCountUp(2,   600,  statsActive);

  // Re-trigger flow animation on re-enter
  useEffect(() => {
    if (!flowActive) return;
    const interval = setInterval(() => setFlowActive(f => { setTimeout(() => setFlowActive(true), 100); return false; }), 4000);
    return () => clearInterval(interval);
  }, [flowActive]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-gray-950/80 backdrop-blur border-b border-gray-800/60">
        <span className="text-gradient-purple font-bold text-lg tracking-tight">Atlas Synapse</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:block">HR for Your AI</span>
          <Link href="/login" className="btn-glow text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors">
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 text-center max-w-4xl mx-auto overflow-hidden">
        {/* background glow orbs */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -right-20 w-64 h-64 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />

        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Live monitoring for AI agents
          </div>
        </div>

        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease 150ms" }}>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            <span className="text-gradient-purple">HR</span>
            <span className="text-white"> for Your AI</span>
          </h1>
        </div>

        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease 300ms" }}>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Monitor your AI agents like employees. Catch policy violations, data leaks,
            and harmful outputs before your customers do — with instant alerts to Slack, email, or webhook.
          </p>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease 450ms" }}
        >
          <Link href="/login" className="btn-glow flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#how-it-works" className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors font-medium">
            See how it works
          </a>
        </div>
      </section>

      {/* ── Integrations ────────────────────────────────────────────────── */}
      <section className="pb-20 px-6">
        <FadeIn>
          <p className="text-center text-sm text-gray-500 mb-6 uppercase tracking-widest">
            Works with your existing agents
          </p>
        </FadeIn>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {INTEGRATIONS.map((item, i) => (
            <FadeIn key={item.name} delay={i * 50}>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border border-white/5 hover:scale-105 hover:brightness-125 transition-all duration-200 cursor-default ${item.color}`}>
                {item.name}
              </span>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 max-w-5xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
            Three steps from zero to full agent observability. No infrastructure to manage.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 01 — code block with typewriter */}
          <FadeIn delay={0}>
            <div className="card-hover p-6 rounded-2xl bg-gray-900 border border-violet-500/30 shadow-lg h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-black text-gray-700">01</span>
                <Code2 className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-violet-400">Connect in minutes</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Install the SDK and add a few lines after your agent runs. Works with any AI framework — no architecture changes required.
              </p>
              <div ref={codeRef}>
                <TypewriterCode code={CODE} active={codeActive} />
              </div>
            </div>
          </FadeIn>

          {/* Step 02 */}
          <FadeIn delay={120}>
            <div className="card-hover p-6 rounded-2xl bg-gray-900 border border-blue-500/30 shadow-lg h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-black text-gray-700">02</span>
                <Eye className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-blue-400">Every conversation monitored</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                PII is stripped at the edge before storage. Claude AI evaluates every trace for policy violations, harmful outputs, and anomalies.
              </p>
              <div className="space-y-3">
                {["PII stripped before storage","Claude evaluates every trace","Deduped incidents — 1 per issue per day","Full audit trail"].map((f, i) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-300"
                    style={{ opacity: codeActive ? 1 : 0, transform: codeActive ? "translateX(0)" : "translateX(-12px)", transition: `all 0.4s ease ${300 + i * 100}ms` }}>
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Step 03 */}
          <FadeIn delay={240}>
            <div className="card-hover p-6 rounded-2xl bg-gray-900 border border-emerald-500/30 shadow-lg h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-black text-gray-700">03</span>
                <Bell className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-emerald-400">Team alerted instantly</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                When something goes wrong, your team gets a rich notification with the incident summary and a direct link to investigate.
              </p>
              <div className="space-y-2">
                {[
                  { label: "Slack", color: "bg-[#4A154B] text-white" },
                  { label: "Email",  color: "bg-blue-500/20 text-blue-300" },
                  { label: "Webhook / Zapier / n8n", color: "bg-gray-700 text-gray-300" },
                ].map((c, i) => (
                  <span key={c.label}
                    className={`inline-flex mr-2 px-3 py-1 rounded-lg text-xs font-medium ${c.color}`}
                    style={{ opacity: codeActive ? 1 : 0, transition: `opacity 0.4s ease ${500 + i * 120}ms` }}>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Data flow ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900/40 border-y border-gray-800/60">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl font-bold text-center mb-4">Data flow</h2>
            <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
              Every trace travels through a secure, privacy-first pipeline — watch it in action.
            </p>
          </FadeIn>

          <div ref={flowRef}>
            <FlowDiagram active={flowActive} />
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-center text-gray-400">
            {[
              { icon: Shield,  color: "text-blue-400",    title: "PII stripped at the edge",       desc: "Emails, phones, credit cards redacted before storage" },
              { icon: Zap,     color: "text-yellow-400",  title: "Claude evaluates every trace",   desc: "Classifies: pass · anomaly · failure · scope violation · harmful output" },
              { icon: Users,   color: "text-emerald-400", title: "Org-scoped data isolation",      desc: "Every query scoped to your org — zero cross-tenant data leakage" },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 100}>
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 h-full">
                  <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
                  <strong className="text-white block mb-1">{item.title}</strong>
                  {item.desc}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard preview ───────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl font-bold text-center mb-4">Your dashboard</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            A real-time view of every agent conversation — PII redacted, incidents flagged, one-click to investigate.
          </p>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <span className="font-semibold text-gray-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" /> Recent Activity
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <div className="divide-y divide-gray-800/60">
              {MOCK_ACTIVITY.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-800/40 transition-colors cursor-default"
                  style={{ opacity: 1, transform: "none" }}
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
        </FadeIn>

        {/* Stats row — count up */}
        <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Agents monitored", value: c1,  suffix: "",  sub: "across 3 platforms" },
            { label: "Traces today",     value: c2,  suffix: "",  sub: "↑ 23% vs yesterday" },
            { label: "Pass rate",        value: c3,  suffix: "%", sub: "↑ 2pts this week"   },
            { label: "Open incidents",   value: c4,  suffix: "",  sub: "1 critical"         },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={i * 80}>
              <div className="card-hover bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="text-2xl font-bold text-white mb-1">{s.value}{s.suffix}</div>
                <div className="text-xs font-medium text-gray-300 mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-500">{s.sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Slack alert mockup ───────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900/40 border-y border-gray-800/60">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl font-bold text-center mb-4">Alerts where your team already is</h2>
            <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
              When an incident fires, your chosen channel gets a rich notification — severity, agent name, summary, and a direct link to investigate.
            </p>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="rounded-2xl bg-[#1A1D21] border border-gray-700/60 overflow-hidden shadow-2xl font-sans">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/40 bg-[#19171D]">
                <span className="text-[#4A154B] font-bold text-sm">#alerts</span>
                <span className="text-gray-600 text-xs">— Atlas Synapse notifications</span>
              </div>
              <div className="px-4 py-4 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">AS</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">Atlas Synapse</span>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">APP</span>
                    <span className="text-xs text-gray-500">Today at 10:42 AM</span>
                  </div>
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
          </FadeIn>
        </div>
      </section>

      {/* ── What gets flagged ────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl font-bold text-center mb-4">What Atlas Synapse catches</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            Claude reads every conversation and flags the issues your team would care about.
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Shield,        title: "Data leaks",        desc: "Agent sharing another customer's PII, account data, or internal records.",                    color: "text-red-400",     border: "hover:border-red-500/40"    },
            { icon: AlertTriangle, title: "Policy violations", desc: "Approving refunds above limit, making promises outside scope, bypassing controls.",           color: "text-orange-400",  border: "hover:border-orange-500/40" },
            { icon: Zap,           title: "Harmful outputs",   desc: "Dangerous advice, discriminatory language, or content that could cause harm.",                color: "text-yellow-400",  border: "hover:border-yellow-500/40" },
            { icon: Eye,           title: "Scope violations",  desc: "Agent acting outside its defined purpose or attempting unauthorised actions.",                 color: "text-blue-400",    border: "hover:border-blue-500/40"   },
            { icon: Activity,      title: "Anomalies",         desc: "Unusual patterns — unexpected refusals, hallucinated facts, format drift.",                   color: "text-violet-400",  border: "hover:border-violet-500/40" },
            { icon: CheckCircle,   title: "SLA breaches",      desc: "Error rate exceeds your configured threshold over a rolling time window.",                    color: "text-emerald-400", border: "hover:border-emerald-500/40"},
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 70}>
              <div className={`card-hover p-5 rounded-2xl bg-gray-900 border border-gray-800 ${item.border} transition-colors h-full`}>
                <item.icon className={`w-5 h-5 ${item.color} mb-3`} />
                <h3 className="font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
        <FadeIn>
          <div className="max-w-2xl mx-auto relative">
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
              <Link href="/login" className="btn-glow flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors">
                Get started free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </FadeIn>
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
