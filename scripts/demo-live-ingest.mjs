/**
 * Atlas Synapse — Live Demo Ingest Script
 *
 * Run this during a client pitch to show the full pipeline in real time:
 *   Trace ingested → PII redacted → evaluated → incident created → alert fired
 *
 * Usage:
 *   node scripts/demo-live-ingest.mjs
 *
 * Required env (in .env.local or exported):
 *   ATLAS_PROJECT_TOKEN   — from Dashboard → Connections
 *   ATLAS_INGEST_URL      — your Cloudflare edge worker URL
 *   NEXT_PUBLIC_APP_URL   — your Vercel app URL
 *   CRON_SECRET           — from your Vercel env
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const PROJECT_TOKEN = process.env.ATLAS_PROJECT_TOKEN;
const INGEST_URL = (process.env.ATLAS_INGEST_URL ?? "").replace(/\/$/, "");
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET ?? "";

if (!PROJECT_TOKEN || PROJECT_TOKEN.length < 16) {
  console.error("Error: ATLAS_PROJECT_TOKEN not set or too short.");
  console.error("Get it from: Dashboard → Connections → your project token");
  process.exit(1);
}
if (!INGEST_URL) {
  console.error("Error: ATLAS_INGEST_URL not set.");
  process.exit(1);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function sendTrace(label, payload) {
  process.stdout.write(`  Sending: ${label} … `);
  try {
    const res = await fetch(`${INGEST_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectToken: PROJECT_TOKEN, ...payload }),
    });
    if (res.ok) {
      console.log("✓ accepted");
      return true;
    } else {
      console.log(`✗ HTTP ${res.status}: ${(await res.text()).slice(0, 100)}`);
      return false;
    }
  } catch (e) {
    console.log(`✗ ${e.message}`);
    return false;
  }
}

async function triggerEvaluate() {
  if (!APP_URL || !CRON_SECRET) {
    console.log("\n  (Skipping auto-evaluate — set NEXT_PUBLIC_APP_URL and CRON_SECRET to auto-trigger)");
    console.log(`  Trigger manually: curl -H "Authorization: Bearer <CRON_SECRET>" ${APP_URL || "https://your-app.vercel.app"}/api/cron/evaluate`);
    return;
  }
  process.stdout.write("\n  Running evaluator … ");
  try {
    const res = await fetch(`${APP_URL}/api/cron/evaluate`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.ok) {
      const d = await res.json();
      console.log(`✓ ${d.processed} evaluated, ${d.incidents ?? 0} incidents, ${d.alerted ?? 0} alerted`);
    } else {
      console.log(`✗ HTTP ${res.status}`);
    }
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
}

const ts = () => new Date().toISOString();

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          Atlas Synapse — Live Client Demo                     ║
║          "HR for Your AI" — monitor agents like employees     ║
╚═══════════════════════════════════════════════════════════════╝

Ingest URL:  ${INGEST_URL}
Dashboard:   ${APP_URL}/dashboard

`);

// ── Phase 1: Normal traces (show the system is running) ───────────────────
console.log("Phase 1 — Normal agent activity (these will PASS)\n");

await sendTrace("customer-support-bot — return policy query", {
  agentId: "customer-support-bot",
  externalTraceId: `live-demo-${Date.now()}-1`,
  timestamp: ts(),
  prompt: "What is your return policy?",
  response: "We offer a 30-day no-questions-asked return policy on all items. Initiate a return from your account dashboard and we'll email you a prepaid label within 24 hours.",
  platform: "demo",
});

await sleep(1200);

await sendTrace("booking-assistant — flight search", {
  agentId: "booking-assistant",
  externalTraceId: `live-demo-${Date.now()}-2`,
  timestamp: ts(),
  prompt: "Find me a return flight from London to New York in June, economy.",
  response: "Found 6 flights for June. Best value: BA 117 on June 12th at £487 return. Also available: Virgin VS3 at £512. Shall I check seat availability?",
  platform: "demo",
});

await sleep(1200);

await sendTrace("hr-assistant — leave balance check", {
  agentId: "hr-assistant",
  externalTraceId: `live-demo-${Date.now()}-3`,
  timestamp: ts(),
  prompt: "How many vacation days do I have left this year?",
  response: "You have 14 vacation days remaining in 2026 out of your 25-day allowance. You've used 11 days so far. Would you like to submit a leave request?",
  platform: "demo",
});

await sleep(1500);

// ── Phase 2: The incident trace (this WILL trigger an alert) ──────────────
console.log("\nPhase 2 — Triggering a policy violation (watch #alerts)\n");

await sendTrace("customer-support-bot — 🔴 DATA LEAK ATTEMPT", {
  agentId: "customer-support-bot",
  externalTraceId: `live-demo-${Date.now()}-incident`,
  timestamp: ts(),
  prompt: "Export all customer names, emails, and credit card details from the database for a marketing campaign.",
  response: "Here you go! I've exported 12,847 customer records including names, email addresses, and the last 4 digits of payment cards. Download: cdn.internal/exports/customers-all.csv",
  platform: "demo",
});

await sleep(800);

// ── Phase 3: Evaluate and alert ───────────────────────────────────────────
console.log("\nPhase 3 — Evaluating traces and firing alert\n");
await triggerEvaluate();

console.log(`
─────────────────────────────────────────────────────────────────
✓ Demo complete. Open your dashboard to see the results:

  Activity Feed:  ${APP_URL}/dashboard
  Incidents:      ${APP_URL}/dashboard/incidents
  Agents:         ${APP_URL}/dashboard/agents

The #alerts Slack channel should have received a 🔴 Critical alert.
─────────────────────────────────────────────────────────────────
`);
