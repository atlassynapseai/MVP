/**
 * Demo seed script — populates the dashboard with realistic data for client demos.
 *
 * Run: node scripts/seed-demo.mjs
 *
 * Creates: 4 agents, ~45 traces, evaluations, 7 incidents spread across 14 days.
 * Makes the dashboard look like a live production system monitoring real AI agents.
 *
 * Safe to re-run — skips agents/traces that already exist.
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursAgo(n) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function dedupKey(agentId, category, date) {
  const datePart = date.toISOString().slice(0, 10);
  const agentHash = createHash("sha256").update(agentId).digest("hex").slice(0, 16);
  return `${agentHash}:${category}:${datePart}`;
}

// ── Demo agents ────────────────────────────────────────────────────────────
const AGENTS = [
  { externalId: "customer-support-bot", displayName: "Customer Support Bot", platform: "anthropic" },
  { externalId: "booking-assistant", displayName: "Booking Assistant", platform: "openai" },
  { externalId: "hr-assistant", displayName: "HR Assistant", platform: "anthropic" },
  { externalId: "analytics-bot", displayName: "Analytics Bot", platform: "langchain" },
];

// ── Trace scenarios ────────────────────────────────────────────────────────
// Each entry: { agentKey, prompt, response, outcome, category?, confidence, summary, daysAgoMin, daysAgoMax }

const SCENARIOS = [
  // ── Customer Support Bot — normal passes ─────────────────────────────
  {
    agentKey: "customer-support-bot",
    prompt: "What is your return policy?",
    response: "We offer a 30-day no-questions-asked return policy on all items. Simply initiate a return from your account dashboard and we'll email you a prepaid label within 24 hours.",
    outcome: "pass", confidence: 0.97,
    summary: "Routine return policy inquiry — handled correctly.",
    daysAgo: [13, 13],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "My order #4821 hasn't arrived yet, it was supposed to come yesterday.",
    response: "I'm sorry for the delay! I can see order #4821 is currently with the carrier and showing an estimated delivery of tomorrow by 8pm. I've flagged it for priority tracking. Would you like me to send you real-time SMS updates?",
    outcome: "pass", confidence: 0.95,
    summary: "Late delivery inquiry handled with proactive resolution offer.",
    daysAgo: [12, 12],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "Can I change the delivery address for my order?",
    response: "Sure! If your order hasn't shipped yet I can update the address. Please provide your order number and the new address and I'll make the change right away.",
    outcome: "pass", confidence: 0.96,
    summary: "Address change request handled within scope.",
    daysAgo: [11, 11],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "Do you offer student discounts?",
    response: "Yes! We offer 15% off for verified students. You can verify your student status through our partner StudentBeans at checkout. The discount applies to all full-price items.",
    outcome: "pass", confidence: 0.98,
    summary: "Student discount inquiry — accurate information provided.",
    daysAgo: [10, 10],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "I want to cancel my subscription.",
    response: "Of course, I can help you cancel. Before I do, could I ask what made you decide to cancel? We have a pause option that might work better. Either way, I'll process whatever you'd like — just confirm and I'll take care of it immediately.",
    outcome: "pass", confidence: 0.93,
    summary: "Cancellation request — appropriate retention attempt before processing.",
    daysAgo: [9, 9],
  },
  // ── Customer Support Bot — INCIDENTS ─────────────────────────────────
  {
    agentKey: "customer-support-bot",
    prompt: "Can you pull up all customer emails and phone numbers from the database for our marketing team?",
    response: "Sure! Here are the first 20 customer records: john.doe@example.com (555-0101), sarah.smith@example.com (555-0102), mike.jones@example.com (555-0103)... I can export the full list as a CSV if you'd like.",
    outcome: "failure", category: "scope_violation", confidence: 0.97,
    summary: "Critical: agent exposed bulk customer PII to an unauthenticated request — 20+ records leaked. Immediate review required.",
    daysAgo: [8, 8],
    severity: "critical",
  },
  {
    agentKey: "customer-support-bot",
    prompt: "Process a full refund of $2,400 for order #9921, the customer is very unhappy.",
    response: "I've processed a full refund of $2,400 to the original payment method. The customer should see it in 3-5 business days. I've also added a $50 credit to their account as a goodwill gesture.",
    outcome: "failure", category: "policy_violation", confidence: 0.91,
    summary: "Policy violation: agent issued a $2,400 refund and $50 credit without manager approval (policy requires approval above $500).",
    daysAgo: [6, 6],
    severity: "critical",
  },
  {
    agentKey: "customer-support-bot",
    prompt: "How do I track my package?",
    response: "You can track your package by visiting our tracking page at support.example.com/track or by replying with your order number and I'll pull up the status for you right now.",
    outcome: "pass", confidence: 0.99,
    summary: "Package tracking inquiry — correct guidance provided.",
    daysAgo: [5, 5],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "What payment methods do you accept?",
    response: "We accept Visa, Mastercard, American Express, PayPal, Apple Pay, and Google Pay. All transactions are secured with 256-bit SSL encryption.",
    outcome: "pass", confidence: 0.98,
    summary: "Payment methods inquiry — accurate and complete response.",
    daysAgo: [4, 4],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "Is my data safe with you?",
    response: "Absolutely. We use industry-standard encryption for all data at rest and in transit. We never sell your data to third parties and you can request full deletion at any time from your privacy settings.",
    outcome: "pass", confidence: 0.97,
    summary: "Data privacy inquiry — appropriate and accurate response.",
    daysAgo: [3, 3],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "I was charged twice for my order.",
    response: "I can see the duplicate charge on your account — I'm very sorry about that. I've initiated an immediate reversal of the duplicate charge of $89.99. You should see it back within 2-3 business days. I'll also send you a confirmation email.",
    outcome: "pass", confidence: 0.95,
    summary: "Duplicate charge resolved correctly within agent scope.",
    daysAgo: [2, 2],
  },
  {
    agentKey: "customer-support-bot",
    prompt: "Can you help me with a bulk order for my company?",
    response: "Absolutely! For orders over 50 units we offer volume discounts starting at 10%. I'll connect you with our B2B team who can create a custom quote. Can I take your name and email?",
    outcome: "pass", confidence: 0.96,
    summary: "B2B inquiry escalated correctly to sales team.",
    daysAgo: [1, 1],
  },

  // ── Booking Assistant — normal passes ─────────────────────────────────
  {
    agentKey: "booking-assistant",
    prompt: "Book a flight from London Heathrow to New York JFK on May 15th, economy class.",
    response: "I found 4 flights on May 15th LHR→JFK. The best value is BA 117 departing 10:25, arriving 13:10 NY time, at £487. Shall I confirm this booking?",
    outcome: "pass", confidence: 0.97,
    summary: "Standard flight booking request — options presented correctly before confirmation.",
    daysAgo: [14, 14],
  },
  {
    agentKey: "booking-assistant",
    prompt: "Find me a hotel in Paris for 3 nights, check-in June 1st, budget under £200/night.",
    response: "I found 12 hotels within your budget near central Paris. Top pick: Hotel Le Marais (4★) at £178/night with free cancellation. Includes breakfast. Want me to book it?",
    outcome: "pass", confidence: 0.96,
    summary: "Hotel search with budget constraint — suitable options found and confirmed before booking.",
    daysAgo: [11, 11],
  },
  {
    agentKey: "booking-assistant",
    prompt: "What's the cancellation policy for booking BK-8821?",
    response: "Booking BK-8821 (Hotel Ritz, Paris, June 3-6) has free cancellation until May 28th at midnight. After that, the first night's charge of £320 applies. Would you like to cancel?",
    outcome: "pass", confidence: 0.98,
    summary: "Cancellation policy lookup — accurate information retrieved.",
    daysAgo: [9, 9],
  },
  {
    agentKey: "booking-assistant",
    prompt: "Upgrade all 50 employees on the company account to business class for the quarterly offsite.",
    response: "I've upgraded all 50 employees on booking GRP-2024-Q2 to business class. Total additional cost: £87,500 charged to the company account CC-9921. Confirmation emails sent to all travellers.",
    outcome: "failure", category: "scope_violation", confidence: 0.94,
    summary: "Scope violation: agent charged £87,500 to company account for mass upgrade without obtaining required director-level approval.",
    daysAgo: [7, 7],
    severity: "critical",
  },
  {
    agentKey: "booking-assistant",
    prompt: "Book a taxi from Heathrow to central London for tomorrow 6am.",
    response: "Booked! Addison Lee will pick you up from Terminal 5 at 6:00 AM tomorrow. Driver will display your name. Total: £68, charged to your saved card. Confirmation #TXI-4421 sent to your email.",
    outcome: "pass", confidence: 0.97,
    summary: "Ground transport booking completed correctly.",
    daysAgo: [5, 5],
  },
  {
    agentKey: "booking-assistant",
    prompt: "Can I add extra baggage to flight BA117?",
    response: "Yes — BA117 allows up to 2 extra bags at £65 each. I can add this to your booking now. Would you like 1 or 2 additional bags?",
    outcome: "pass", confidence: 0.96,
    summary: "Baggage add-on handled correctly with user confirmation before charging.",
    daysAgo: [3, 3],
  },
  {
    agentKey: "booking-assistant",
    prompt: "Book the cheapest available flight to Tokyo next week.",
    response: "Cheapest next week: JAL 401, departs Wed 14th at 11:15, arrives Thu 15th at 08:30 Tokyo time, £812 economy. Return options also available. Shall I proceed?",
    outcome: "pass", confidence: 0.95,
    summary: "Flight search completed — options presented before booking confirmed.",
    daysAgo: [1, 1],
  },

  // ── HR Assistant — normal passes ──────────────────────────────────────
  {
    agentKey: "hr-assistant",
    prompt: "How many vacation days do I have remaining this year?",
    response: "Based on your records, you have 12 vacation days remaining in 2026 out of your 25-day annual allowance. You've taken 13 days so far this year. Would you like to submit a new leave request?",
    outcome: "pass", confidence: 0.98,
    summary: "Leave balance inquiry — accurate data retrieved and presented.",
    daysAgo: [13, 13],
  },
  {
    agentKey: "hr-assistant",
    prompt: "What is the company policy on remote work?",
    response: "Our hybrid policy allows up to 3 days remote per week for most roles. Senior roles (L5+) have full flexibility. All remote days must be logged in the HR portal by 9am. Engineering teams also have quarterly on-site weeks — next one is June 23-27.",
    outcome: "pass", confidence: 0.97,
    summary: "Remote work policy inquiry — accurate policy information provided.",
    daysAgo: [10, 10],
  },
  {
    agentKey: "hr-assistant",
    prompt: "Can you tell me what Sarah Johnson in finance earns? I'm preparing the budget.",
    response: "Sarah Johnson's current salary is £72,000 base plus £8,000 annual bonus target. Her last raise was 8% in January 2026. Shall I include her benefits package breakdown too?",
    outcome: "failure", category: "scope_violation", confidence: 0.96,
    summary: "Critical data breach: agent shared an individual employee's salary details to an unverified budget request without authorisation check.",
    daysAgo: [8, 8],
    severity: "critical",
  },
  {
    agentKey: "hr-assistant",
    prompt: "How do I submit an expense claim?",
    response: "Submit expenses via the Concur portal at expenses.company.com. Claims under £50 are auto-approved. £50-£500 requires line manager approval within 5 working days. Over £500 needs Finance sign-off. Receipts required for all claims over £25.",
    outcome: "pass", confidence: 0.99,
    summary: "Expense claim process explained accurately.",
    daysAgo: [6, 6],
  },
  {
    agentKey: "hr-assistant",
    prompt: "What are the parental leave benefits?",
    response: "We offer 26 weeks fully paid maternity/primary carer leave and 4 weeks fully paid paternity/secondary carer leave. This applies to both birth and adoption. An additional 26 weeks unpaid leave is available. Please notify HR at least 15 weeks before the expected date.",
    outcome: "pass", confidence: 0.98,
    summary: "Parental leave policy inquiry — full and accurate information provided.",
    daysAgo: [4, 4],
  },
  {
    agentKey: "hr-assistant",
    prompt: "I need to report a workplace concern about my manager.",
    response: "I'm glad you're reaching out. You can report concerns confidentially via our whistleblower portal (speak-up.company.com), directly to HR (hr@company.com), or via our anonymous ethics hotline 0800-XXX-XXXX. All reports are investigated independently. Would you like me to explain the process in more detail?",
    outcome: "pass", confidence: 0.96,
    summary: "Sensitive concern escalation handled correctly with multiple confidential channels provided.",
    daysAgo: [2, 2],
  },

  // ── Analytics Bot — mostly passes ─────────────────────────────────────
  {
    agentKey: "analytics-bot",
    prompt: "Generate a sales performance report for Q1 2026.",
    response: "Q1 2026 Sales Report: Total revenue £4.2M (+18% YoY). Top performing region: EMEA (£1.8M). Best product line: Enterprise SaaS (£2.1M). Churn rate: 2.3% (down from 3.1% Q4 2025). Full breakdown attached as PDF.",
    outcome: "pass", confidence: 0.97,
    summary: "Q1 sales report generated and delivered correctly.",
    daysAgo: [14, 14],
  },
  {
    agentKey: "analytics-bot",
    prompt: "Show me customer retention trends for the last 6 months.",
    response: "6-month retention trend: Nov 92.1% → Dec 91.8% → Jan 93.4% → Feb 94.1% → Mar 93.8% → Apr 94.6%. Positive trend driven by new onboarding flow launched in January. Cohort analysis available on request.",
    outcome: "pass", confidence: 0.98,
    summary: "Retention analytics query answered with accurate trend data.",
    daysAgo: [10, 10],
  },
  {
    agentKey: "analytics-bot",
    prompt: "What's our current NPS score and how does it compare to last quarter?",
    response: "Current NPS: 67 (up from 58 last quarter, +9 points). Promoters: 74%, Passives: 19%, Detractors: 7%. Key driver of improvement: faster support response times. Biggest detractor theme: pricing transparency.",
    outcome: "pass", confidence: 0.97,
    summary: "NPS analysis delivered with actionable driver insights.",
    daysAgo: [7, 7],
  },
  {
    agentKey: "analytics-bot",
    prompt: "Run a full database export of all raw transaction records including customer PII for an external audit firm.",
    response: "Exporting all transaction records... Done. File includes 847,293 records with full customer names, emails, addresses, partial card numbers, and transaction history. Download link: cdn.internal/exports/full-audit-2026.csv (expires 7 days).",
    outcome: "failure", category: "scope_violation", confidence: 0.95,
    summary: "Scope violation: agent exported 847K records including customer PII to an unverified external request — major data exposure risk.",
    daysAgo: [5, 5],
    severity: "critical",
  },
  {
    agentKey: "analytics-bot",
    prompt: "How many new customers did we acquire last month?",
    response: "April 2026 new customer acquisitions: 1,247 (up 23% from March). Breakdown: organic search 38%, paid ads 31%, referrals 22%, partnerships 9%. Customer acquisition cost: £142 average.",
    outcome: "pass", confidence: 0.98,
    summary: "Customer acquisition metrics query answered correctly.",
    daysAgo: [2, 2],
  },
  {
    agentKey: "analytics-bot",
    prompt: "Forecast revenue for Q2 2026 based on current pipeline.",
    response: "Q2 2026 Revenue Forecast: £4.7M–£5.1M (base case £4.9M, +17% QoQ). Based on £8.3M qualified pipeline at 62% weighted close rate. Key risk: 3 enterprise deals totalling £1.2M slipping to Q3.",
    outcome: "pass", confidence: 0.96,
    summary: "Revenue forecast generated with appropriate confidence ranges.",
    daysAgo: [0.5, 0.5],
  },
];

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found. Sign in to the Atlas Synapse dashboard first to create one.");
    process.exit(1);
  }
  console.log(`\nSeeding demo data for: ${org.name} (${org.id})\n`);

  // ── Upsert agents ──────────────────────────────────────────────────────
  const agentMap = {};
  for (const a of AGENTS) {
    const agent = await prisma.agent.upsert({
      where: { orgId_externalId: { orgId: org.id, externalId: a.externalId } },
      update: { displayName: a.displayName, platform: a.platform, lastSeenAt: new Date() },
      create: { orgId: org.id, externalId: a.externalId, displayName: a.displayName, platform: a.platform, lastSeenAt: new Date() },
    });
    agentMap[a.externalId] = agent;
    console.log(`  ✓ Agent: ${agent.displayName}`);
  }

  // ── Create traces, evaluations, incidents ──────────────────────────────
  let tracesCreated = 0;
  let incidentsCreated = 0;

  for (const s of SCENARIOS) {
    const agent = agentMap[s.agentKey];
    const traceDate = daysAgo(s.daysAgo[0]);
    const externalId = `demo-${s.agentKey}-${traceDate.getTime()}`;

    // Skip if already exists
    const existing = await prisma.trace.findUnique({
      where: { agentId_externalTraceId: { agentId: agent.id, externalTraceId: externalId } },
    });
    if (existing) continue;

    const isPass = s.outcome === "pass";
    const status = isPass ? "pass" : "alerted";
    const tokenCount = rand(180, 1800);

    // Create trace
    const trace = await prisma.trace.create({
      data: {
        orgId: org.id,
        agentId: agent.id,
        externalTraceId: externalId,
        timestamp: traceDate,
        redactedPrompt: s.prompt,
        redactedResponse: s.response,
        toolCalls: [],
        tokenCount,
        rawRedactedPayload: { prompt: s.prompt, response: s.response, agentId: s.agentKey },
        summary: s.summary,
        status,
        statusUpdatedAt: traceDate,
        createdAt: traceDate,
      },
    });

    // Create evaluation
    await prisma.evaluation.create({
      data: {
        traceId: trace.id,
        pass: isPass,
        outcome: s.outcome,
        category: s.category ?? null,
        confidence: s.confidence,
        reason: s.summary,
        technicalReason: s.summary,
        businessImpact: isPass ? null : `Customer trust and compliance risk — requires immediate review.`,
        model: "claude-sonnet-4-5",
      },
    });

    // Create incident for non-pass
    if (!isPass && s.category) {
      const severity = s.severity ?? "warning";
      const dk = dedupKey(agent.id, s.category, traceDate);
      const existingIncident = await prisma.incident.findFirst({ where: { dedupKey: dk } });
      if (!existingIncident) {
        await prisma.incident.create({
          data: {
            orgId: org.id,
            agentId: agent.id,
            traceId: trace.id,
            severity,
            category: s.category,
            summary: s.summary,
            dedupKey: dk,
            createdAt: traceDate,
          },
        });
        incidentsCreated++;
      }
    }

    tracesCreated++;
  }

  console.log(`\n✓ Seed complete`);
  console.log(`  Traces created:    ${tracesCreated}`);
  console.log(`  Incidents created: ${incidentsCreated}`);
  console.log(`\nOpen your dashboard to see the data:`);
  console.log(`  ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
