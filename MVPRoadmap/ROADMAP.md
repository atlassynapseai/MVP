# AtlasSynapse MVP Roadmap

> Living document. Update as priorities shift. Each phase has a clear exit condition — don't move on until it's met.

---

## Status Overview

| Phase | Name | Status |
|-------|------|--------|
| P1 | Ingest Pipeline | ✅ Complete |
| P2 | Eval Engine + Dashboard | ✅ Complete |
| P3 | Agent Integrations + Polish | ✅ Complete |
| P4 | Production Deploy + First Users | 🔲 In Progress (manual steps remain) |
| P5 | Analytics + Team Features | ✅ Complete |
| P6 | Scale + Advanced Evals | 🔲 In Progress |

---

## P1 — Ingest Pipeline ✅

**Goal:** Raw traces from agents reach the database securely.

**Built:**
- Cloudflare edge worker — receives traces, strips PII, HMAC-signs, forwards
- Next.js API route `/api/ingest` — verifies signature, saves Trace to DB
- Prisma schema — Organization, User, Connection, Agent, Trace models
- Clerk auth + webhook — provisions Org/User rows on org creation
- `@atlas/shared` — HMAC utils, PII redaction, Zod ingest schema

**Exit condition met:** curl → edge → DB trace row confirmed.

---

## P2 — Eval Engine + Dashboard ✅

**Goal:** Traces become business-readable incidents. Dashboard shows agent health.

**Built:**
- `@atlas/evaluator` — Anthropic Claude classifies traces → severity + category
- Vercel Cron (`/api/cron/evaluate`) — runs every 60s, batch-evaluates traces
- Dedup logic — one incident per recurring issue, not one per trace
- Business translation — technical errors → plain English summaries
- Resend email alerts — critical incidents trigger email
- Dashboard pages — Overview, Agents, Incidents, Incident Detail, Settings, Data Transparency
- Incident feedback form — human correct/false-alarm signal
- Alert preferences — immediate vs off, severity threshold

**Exit condition met:** trace sent → evaluated → incident in dashboard confirmed.

---

## P3 — Agent Integrations + Polish ✅

**Goal:** Real agents connect easily. Product is demo-ready.

**To build:**
- [x] Python SDK polish — publish to PyPI as `atlas-synapse`, add README + examples
- [x] n8n template — test end-to-end, document setup in 3 steps
- [x] LangChain integration — hook wrapper for LangChain agents
- [x] Connection management UI — generate/revoke project tokens in dashboard (currently only via DB seed script)
- [x] Onboarding flow — first-time user sees "connect your agent" wizard, not empty dashboard
- [x] Data Transparency page — complete (currently placeholder)
- [x] Dashboard empty states — better UX when no agents/incidents yet
- [x] Error handling UX — user-facing error pages, not raw crashes

**Exit condition:** Someone unfamiliar with the codebase can connect a real agent and see incidents in < 30 minutes, following only the UI.

---

## P4 — Production Deploy + First Users 🔲

**Goal:** App is live on a real URL. First 3–5 external users onboarded.

**To build:**
- [ ] Deploy to Vercel — production environment, custom domain
- [x] Deploy edge worker — `wrangler deploy` to Cloudflare, stable ingest URL
- [ ] Clerk production instance — switch from dev to prod Clerk app
- [ ] Supabase production project — separate from dev DB
- [x] User invite flow — org owner can invite teammates (Clerk handles this, just wire UI)
- [x] Multi-agent support — ensure dashboard scales to 10+ agents per org cleanly
- [x] Basic rate limiting — protect ingest route from abuse
- [ ] Monitoring — Vercel logs + Supabase metrics, set up alerts for cron failures
- [x] Privacy policy + terms — required before external users

**Exit condition:** 3 external users actively sending traces from real agents for ≥ 1 week.

---

## P5 — Analytics + Team Features 🔲

**Goal:** Dashboard becomes the place teams actually use to review agent performance.

**To build:**
- [x] Agent performance trends — charts: incidents over time, severity breakdown, category distribution
- [x] Trace explorer — search/filter traces by agent, date, category, severity
- [x] Incident resolution flow — mark incident as resolved, track MTTR
- [x] Team notifications — Slack integration for alerts (not just email)
- [x] Weekly digest email — summary of agent activity per org
- [x] Custom eval criteria — let users define what counts as a problem for their use case
- [x] Agent comparison — side-by-side health scores across agents
- [x] Export — CSV download of incidents/traces for compliance

**Exit condition:** Teams use the dashboard in their weekly AI review meetings without prompting.

---

## P6 — Scale + Advanced Evals 🔲

**Goal:** Platform handles enterprise workloads and advanced monitoring needs.

**To build:**
- [x] SLA monitoring — define uptime/response time thresholds per agent, alert on breach
- [x] Custom evaluator prompts — per-org eval criteria, not just global defaults
- [x] Audit log — immutable record of all agent actions (compliance)
- [ ] SSO / SAML — enterprise auth
- [ ] Higher volume ingest — queue-based (Cloudflare Queues or similar), not direct HTTP chain
- [x] Webhook outbound — let orgs subscribe to incident events (push to their systems)
- [ ] SDK for more platforms — LlamaIndex, AutoGen, CrewAI, Vercel AI SDK
- [ ] White-label / embedded — offer dashboard embeddable in other SaaS products

**Exit condition:** Platform handles 1M+ traces/month without degradation.

---

## What's NOT in Scope (MVP)

These are intentionally deferred:
- Billing / payments (Stripe)
- Self-hosted / on-prem option
- Real-time streaming (WebSockets)
- Mobile app
- Fine-tuning agents based on feedback

---

## Principles

1. **Ship phases sequentially** — don't start P4 until P3 exit condition is met
2. **Real user signal beats internal assumptions** — get external users at P4, adjust P5 based on what they actually use
3. **Don't add features, fix pain** — every P3/P4 addition should remove a real obstacle to adoption
4. **Keep the stack simple** — resist adding new services until the existing ones are fully utilized
