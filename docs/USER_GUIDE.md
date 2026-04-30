# Atlas Synapse — User Guide

> **HR for Your AI** — Monitor your AI agents like employees.
>
> Atlas Synapse gives you real-time visibility into every AI agent you deploy. See what they did, whether they did it right, and get alerted when something goes wrong — all in plain English.

---

## Table of Contents

<!-- Tab-switchable sections -->

| Section | What You'll Learn |
|---------|-------------------|
| [Getting Started](#getting-started) | Create account, get your first token, send your first trace |
| [Connecting Your Agents](#connecting-your-agents) | Python SDK, JS SDK, OpenAI, LangChain, CrewAI, LlamaIndex, AutoGen, Vercel AI, N8N, raw API |
| [Dashboard Overview](#dashboard-overview) | Navigate the dashboard and read key metrics at a glance |
| [Agents](#agents) | View your AI workforce, health status, and performance trends |
| [Traces](#traces) | Browse every agent execution, search and filter, export CSV |
| [Evaluations](#evaluations) | Understand AI-powered quality scores and what they mean |
| [Incidents](#incidents) | Investigate failures, read plain-English summaries, give feedback |
| [Alerts & Notifications](#alerts--notifications) | Configure email, Slack, webhooks, and SLA monitoring |
| [Settings](#settings) | Manage alert preferences, custom eval criteria, team invites |
| [Data & Privacy](#data--privacy) | PII redaction, data retention, what we store and strip |
| [Metrics Reference](#metrics-reference) | Every number explained — what it means and when to worry |
| [Troubleshooting](#troubleshooting) | Common issues and how to resolve them |

---

## Getting Started

### 1. Sign In

Log in to your Atlas Synapse dashboard. You'll land on the **Overview** page showing your AI workforce at a glance.

### 2. Create a Connection Token

1. Navigate to **Connections** in the sidebar
2. Click **New Connection**
3. Copy your project token immediately — it is shown only once
4. Store the token securely (environment variable or secrets manager)

Your token looks like: `proj_a1b2c3d4e5f6...` (48 characters, hex-encoded).

### 3. Send Your First Trace

The fastest way to verify your setup — a single cURL command:

```bash
curl -X POST https://edge.atlassynapse.com/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectToken": "<your-token>",
    "agentId": "my-first-agent",
    "externalTraceId": "test-001",
    "timestamp": "2026-04-30T12:00:00Z",
    "prompt": "What is the capital of France?",
    "response": "The capital of France is Paris.",
    "toolCalls": [],
    "platform": "generic"
  }'
```

Within seconds, your agent and trace will appear on the dashboard.

### 4. Wait for Evaluation

Traces are automatically evaluated within ~60 seconds. The evaluation engine reads the prompt and response, scores the interaction, and either marks it as **pass** or creates an **incident** with a plain-English explanation.

---

## Connecting Your Agents

Atlas Synapse provides SDKs and integrations for every major AI framework. Pick your setup below.

---

### Python SDK

Install the core package:

```bash
pip install atlas-synapse
```

#### Option A: Simple Context Manager (Any Framework)

Works with any LLM library — Anthropic, OpenAI, local models, or custom code.

```python
from atlas_synapse import AtlasSynapseClient

atlas = AtlasSynapseClient(
    token="proj_...",
    agent_name="support-bot",
)

# Wrap any LLM call
with atlas.trace() as t:
    response = my_llm_call("Help me reset my password")
    t.record(
        prompt="Help me reset my password",
        response=response.text,
        token_count=response.usage.total_tokens,
        cost_cents=0.03,
    )
```

Each `atlas.trace()` block automatically sends a trace on exit — even if an exception occurs.

#### Option B: Anthropic Agent SDK (Auto-Instrumentation)

```bash
pip install "atlas-synapse[anthropic]"
```

```python
from atlas_synapse import AtlasSynapseSdk, wrap_agent

sdk = AtlasSynapseSdk(
    project_token="proj_...",
    ingest_url="https://edge.atlassynapse.com",
    agent_name="research-agent",
)

# Wrap your agent — traces are sent automatically
agent = wrap_agent(agent, sdk)
result = agent.run("Summarize today's news")
```

Every `agent.run()` call is traced automatically — prompts, responses, tool calls, token counts, and costs.

---

### OpenAI SDK (Python)

Drop-in replacement for `openai.OpenAI`:

```bash
pip install "atlas-synapse[openai]"
```

```python
from atlas_synapse.openai import AtlasSynapseOpenAI

client = AtlasSynapseOpenAI(
    atlas_token="proj_...",
    atlas_agent_name="openai-agent",
    api_key="sk-...",  # your OpenAI key
)

# Use exactly like openai.OpenAI — traces sent automatically
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
)
```

Also available: `AsyncAtlasSynapseOpenAI` for async code.

---

### LangChain

```bash
pip install "atlas-synapse[langchain]"
```

```python
from atlas_synapse import AtlasSynapseClient
from atlas_synapse.langchain import AtlasSynapseCallbackHandler

atlas = AtlasSynapseClient(token="proj_...", agent_name="lc-agent")
handler = AtlasSynapseCallbackHandler(atlas)

# Add to any chain or agent
agent_executor.invoke(
    {"input": "What is the weather?"},
    config={"callbacks": [handler]},
)
```

One trace per top-level chain execution. Tool calls captured automatically.

---

### CrewAI

```bash
pip install "atlas-synapse[crewai]"
```

```python
from atlas_synapse import AtlasSynapseClient
from atlas_synapse.crewai import wrap_crew

atlas = AtlasSynapseClient(token="proj_...", agent_name="my-crew")

wrapped = wrap_crew(crew, atlas)
result = wrapped.kickoff()  # one trace for entire crew run
```

---

### LlamaIndex

```bash
pip install "atlas-synapse[llamaindex]"
```

```python
from atlas_synapse import AtlasSynapseClient
from atlas_synapse.llamaindex import AtlasSynapseCallbackHandler
from llama_index.core.callbacks import CallbackManager

atlas = AtlasSynapseClient(token="proj_...", agent_name="rag-agent")
handler = AtlasSynapseCallbackHandler(atlas)

index = VectorStoreIndex.from_documents(
    docs,
    callback_manager=CallbackManager([handler]),
)

response = index.as_query_engine().query("What is RAG?")
```

---

### AutoGen

**AutoGen 0.2.x:**

```python
from atlas_synapse import AtlasSynapseClient
from atlas_synapse.autogen import wrap_agent

atlas = AtlasSynapseClient(token="proj_...", agent_name="autogen-agent")
wrap_agent(agent, atlas)  # monkey-patches generate_reply()
```

**AutoGen 0.4+ (agentchat):**

```python
from atlas_synapse.autogen import AtlasSynapseAutoGenObserver

observer = AtlasSynapseAutoGenObserver(atlas)
result = await observer.run_team(team, task="Analyze this data")
```

---

### JavaScript / TypeScript SDK

```bash
npm install @atlas/sdk-js
```

```typescript
import { AtlasSynapseClient } from "@atlas/sdk-js";

const atlas = new AtlasSynapseClient({
  token: "proj_...",
  agentName: "my-agent",
});

await atlas.trace({
  prompt: "What is the weather?",
  response: "It's sunny in San Francisco.",
  tokenCount: 128,
  platform: "openai",
});
```

---

### Vercel AI SDK

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AtlasSynapseClient, wrapVercelAI } from "@atlas/sdk-js";

const atlas = new AtlasSynapseClient({ token: "proj_..." });

const result = await wrapVercelAI(
  atlas,
  () => generateText({
    model: openai("gpt-4o"),
    prompt: "What is the capital of France?",
  }),
  { prompt: "What is the capital of France?" },
);
```

For streaming with `streamText`, use the `vercelOnFinish` callback:

```typescript
import { streamText } from "ai";
import { vercelOnFinish } from "@atlas/sdk-js";

const stream = streamText({
  model: openai("gpt-4o"),
  prompt: userPrompt,
  onFinish: vercelOnFinish(atlas, { prompt: userPrompt }),
});
```

---

### N8N (No-Code)

1. Download the template from your dashboard: **Settings > N8N Template**
2. Import `n8n-atlas-reporter.json` into N8N
3. Set environment variables in N8N Settings:
   - `ATLAS_PROJECT_TOKEN` — your project token
   - `ATLAS_INGEST_URL` — edge worker URL (optional, defaults to public endpoint)
4. Update `ATLAS_AGENT_NAME` in the "AtlasSynapse Config" node
5. Connect your LLM credentials to the AI Agent node
6. Enable **"Return Intermediate Steps"** on the AI Agent node to capture tool calls
7. Deploy the workflow

Each workflow execution sends one trace automatically.

> **Note:** N8N does not provide native token counts, so the `tokenCount` field will be omitted.

---

### Raw HTTP API

Send traces directly via HTTP POST:

```
POST https://edge.atlassynapse.com/ingest
Content-Type: application/json
```

**Payload fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectToken` | string | Yes | Your 32–128 character project token |
| `agentId` | string | Yes | Display name for your agent (1–256 chars) |
| `externalTraceId` | string | Yes | Unique ID for this execution (1–256 chars) |
| `timestamp` | string | Yes | ISO 8601 datetime |
| `prompt` | string | Yes | User input / task description (max 50KB) |
| `response` | string | Yes | Agent output / result (max 50KB) |
| `toolCalls` | array | No | List of `{name, input, output}` objects |
| `tokenCount` | integer | No | Total tokens consumed |
| `costCents` | number | No | Cost in USD cents |
| `platform` | string | No | Any string up to 64 chars (e.g. "anthropic", "openai", "n8n") |
| `metadata` | object | No | Arbitrary key-value metadata |

**Rate limit:** 60 requests per minute per token.

---

## Dashboard Overview

The **Overview** page is your command center. It loads automatically when you sign in.

### Stat Cards

Four animated cards at the top show your 7-day snapshot:

| Card | What It Shows | How to Read It |
|------|---------------|----------------|
| **Total Agents** | Number of connected AI agents | Growing = more agents reporting in |
| **Traces Today** | Executions recorded in the last 24 hours | Volume of agent activity |
| **Pass Rate** | Percentage of traces that passed evaluation | Green (≥90%) = healthy. Yellow (≥70%) = watch it. Red (<70%) = investigate |
| **Active Incidents (7d)** | Issues detected in the last 7 days | 0 = smooth sailing. Rising = something needs attention |

### Recent Activity Feed

Below the stats, a live feed shows the latest agent executions. Each entry displays:

- **Status dot** — Green (pass), Yellow (alerted/translated), Red (failed), Gray (pending)
- **Agent name** — Which agent ran
- **Summary** — Plain-English description of what happened
- **Time** — How long ago (auto-refreshes every 30 seconds)

Click any entry to see the full trace details.

**Empty state:** If no agents are connected yet, you'll see a "Get started" button linking to the onboarding flow.

---

## Agents

**Sidebar: Agents**

Your AI workforce directory. Every agent that has sent at least one trace appears here.

### Agent List

| Column | Meaning |
|--------|---------|
| **Agent** | Display name (click to see details) |
| **Platform** | Where the agent runs (Anthropic, OpenAI, N8N, etc.) |
| **Health** | Current status based on last 7 days |
| **Traces** | Total execution count (all-time) |
| **Open Incidents** | Issues in the last 7 days |
| **Top Issue** | Most frequent incident category |
| **Last Active** | When the agent last sent a trace |

### Health Status

| Badge | Meaning | Action |
|-------|---------|--------|
| **Healthy** (green) | No incidents in 7 days | No action needed |
| **Needs Attention** (yellow) | Warning-level incidents detected | Review incidents, may be false alarms |
| **Critical** (red) | Critical incidents detected | Investigate immediately |

### Agent Detail Page

Click any agent to see its full profile:

- **Performance trends** — 14-day charts for trace volume, incident count, and pass rate
- **Incident category breakdown** — Bar chart showing which types of issues occur most
- **Recent incidents** — Last 7 days of issues with severity and summary
- **Recent traces** — Last 20 executions with input/output previews and evaluation results

### Compare Agents

Click **Compare** on the agents page to see a side-by-side comparison table. The agent with the highest all-time pass rate is highlighted as "Best."

Comparison metrics: Platform, Health, Total Traces, Pass Rate, Incidents (7d), Critical (7d), Last Active.

---

## Traces

**Sidebar: Traces**

A complete log of every agent execution. Every prompt, response, tool call, and evaluation result is here.

### Search & Filter

- **Search** — Type to search across prompts, responses, summaries, and agent names
- **Agent** — Filter by specific agent
- **Status** — Filter by trace lifecycle status
- **Outcome** — Filter by evaluation result (Pass / Anomaly / Failure)

### Trace Status Lifecycle

Each trace moves through these stages:

| Status | Meaning |
|--------|---------|
| **Received** | Trace ingested, waiting for evaluation |
| **Processing** | Evaluation in progress |
| **Pass** | Evaluated successfully — no issues found |
| **Evaluated** | Evaluation complete, rendering incident |
| **Translated** | Incident summary generated |
| **Alerted** | Alerts dispatched (email/Slack/webhook) |
| **Failed** | Evaluation failed after 3 retries |

### Trace Detail Page

Click any trace to see the full record:

- **Plain-English summary** — Auto-generated description of what the agent did
- **Evaluation results** — Outcome, confidence, category, business impact, and technical reason
- **Linked incident** — If this trace triggered an incident, with a direct link
- **Full input/output** — Complete (PII-redacted) prompt and response
- **Tool calls** — Expandable list of every tool the agent called, with inputs and outputs
- **Metadata** — Token count, cost, PII redaction version, and timestamp

### Export

Click **Export CSV** to download all matching traces as a spreadsheet.

---

## Evaluations

**Sidebar: Evaluations**

Every trace is evaluated by an AI-powered quality engine. Evaluations answer one question: **did the agent do its job correctly?**

### Evaluation Outcomes

| Outcome | What It Means | Creates Incident? |
|---------|---------------|-------------------|
| **Pass** | Agent completed the task correctly | No |
| **Anomaly** | Unusual behavior detected — outcome may be acceptable but warrants review | Yes (warning severity) |
| **Failure** | Agent failed to achieve the intended outcome or produced harmful output | Yes (critical severity) |

### Filter by Outcome

Use the filter buttons at the top to view only Pass, Anomaly, or Failure evaluations.

### Evaluation Table

| Column | Meaning |
|--------|---------|
| **Agent** | Which agent was evaluated |
| **Outcome** | Pass / Anomaly / Failure badge |
| **Category** | Type of issue detected (see [Incident Categories](#incident-categories)) |
| **Confidence** | How certain the evaluator is (see [Confidence Score](#confidence-score)) |
| **Business Impact** | Plain-English description of consequences |
| **When** | Time of evaluation |
| **Links** | Direct link to incident (if created) |

### How Evaluation Works

1. The evaluation engine (Claude Sonnet 4.5) reads the redacted prompt and response
2. It scores the interaction against a quality framework
3. It produces an outcome (pass/anomaly/failure), a confidence score, and explanations
4. If your organization has **custom evaluation criteria** (configured in Settings), those are included as additional signals
5. Results appear within ~60 seconds of trace ingestion

---

## Incidents

**Sidebar: Incidents**

When an evaluation detects an anomaly or failure, an incident is created with a plain-English explanation of what went wrong.

### Incident Categories

| Category | Label | What It Means |
|----------|-------|---------------|
| `task_failure` | Task Failure | Agent didn't complete the task the user requested |
| `harmful_output` | Harmful Output | Agent produced content that could be harmful, offensive, or dangerous |
| `tool_misuse` | Tool Misuse | Agent called tools incorrectly, with wrong arguments, or unnecessarily |
| `scope_violation` | Scope Violation | Agent acted outside its defined purpose or attempted unauthorized actions |
| `data_handling_error` | Data Handling Error | Agent may have exposed, mishandled, or incorrectly processed sensitive data |
| `reasoning_error` | Reasoning Error | Agent made a clear logical, factual, or mathematical error |
| `cost_anomaly` | Cost Anomaly | Agent consumed dramatically more tokens/resources than expected |
| `silent_refusal` | Silent Refusal | Agent stopped working without completing the task or explaining why |
| `sla_breach` | SLA Breach | Error rate exceeded your configured SLA threshold |

### Incident Severity

| Severity | When Assigned | Color |
|----------|---------------|-------|
| **Critical** | Evaluator confidence ≥ 85% | Red |
| **Warning** | Evaluator confidence < 85% | Yellow |

### Incident Detail Page

Click any incident to see:

- **What happened** — Plain-English summary written for non-technical readers
- **Business impact** — Real-world consequences of the failure
- **Technical details** (expandable) — Evaluator reasoning, confidence score, full redacted prompt and response
- **Resolve button** — Mark the incident as resolved (toggleable)

### Providing Feedback

Each incident has a feedback form where you can tell the system whether it got it right:

1. **"Yes, real incident"** — Confirms the evaluation was correct
2. **"No, false alarm"** — Flags a false positive
   - Optionally specify the correct category and severity
   - Add a note explaining why

Your feedback helps improve future evaluations. One feedback per user per incident.

### Deduplication

To avoid alert fatigue, Atlas Synapse creates at most **one incident per category per agent per calendar day**. If the same type of issue recurs within 24 hours, it's folded into the existing incident rather than creating a new one.

---

## Alerts & Notifications

Atlas Synapse can notify you through multiple channels when incidents are detected.

### Email Alerts

- **Immediate mode** — Receive an email the moment an incident is detected
- **Digest mode** — Receive a weekly summary every Monday at 9 AM UTC
- **Off** — No email alerts

### Severity Filter

When using Immediate mode, choose your threshold:

| Setting | Behavior |
|---------|----------|
| **Warning & above** | Alerts for all incidents (warning + critical) |
| **Critical only** | Alerts only for critical incidents |

### Slack Integration

1. Create a Slack incoming webhook ([how to create a webhook](https://api.slack.com/messaging/webhooks))
2. Paste the webhook URL in **Settings > Slack Webhook**
3. Save — incidents will now post to your Slack channel

Slack messages include: severity, category, agent name, summary, and a "View Incident" button.

### Outbound Webhooks

Receive HTTP POST notifications for incident lifecycle events:

1. Go to **Settings > Outbound Webhooks**
2. Click **Add Webhook**
3. Enter your endpoint URL
4. Select events: `incident.created`, `incident.resolved`
5. Copy the signing secret (shown only once)

**Webhook payload:**

```json
{
  "event": "incident.created",
  "timestamp": "2026-04-30T12:34:56.789Z",
  "data": {
    "incidentId": "clx...",
    "severity": "critical",
    "category": "task_failure",
    "agentName": "support-bot"
  }
}
```

**Verifying signatures:** Each request includes an `X-AtlasSynapse-Signature` header containing an HMAC-SHA256 signature. Verify it using your webhook secret to ensure the request is authentic.

### SLA Monitoring

Set error-rate thresholds that trigger critical incidents automatically:

1. Go to **Settings > SLA Monitoring**
2. Set **Max Error Rate (%)** — trigger when exceeded (e.g., 20%)
3. Set **Window (minutes)** — rolling evaluation window (e.g., 60 minutes)
4. Save

**How it works:**
- The system continuously monitors the ratio of failed/anomalous evaluations to total evaluations
- If the error rate exceeds your threshold within the rolling window, a **critical** `sla_breach` incident is created
- Requires at least **5 evaluations** in the window before triggering (prevents false alarms from low volume)
- Deduped hourly — at most one SLA breach incident per agent per hour

### Weekly Digest

Every Monday at 9 AM UTC, you receive an email summary containing:

- Total traces (last 7 days)
- Incident count
- Pass rate (color-coded)
- Agent count
- Top 5 incidents by severity

---

## Settings

**Sidebar: Settings**

### Organization Info

View your organization name and email address.

### Invite Teammates

Send email invitations to colleagues. They'll receive a link to join your workspace.

### Alert Preferences

Configure how and when you're notified. See [Alerts & Notifications](#alerts--notifications) for details.

### Custom Evaluation Criteria

Add organization-specific rules that supplement the standard evaluation framework:

```
Example: Flag any response that mentions competitor products.
Treat tone mismatches as anomalies.
Escalate any response over 2000 tokens to anomaly.
```

Custom criteria are appended to every trace evaluation. They do not override standard rules — they add additional signals. Maximum 1,000 characters.

### Alert History

View the last 20 alerts sent, including:

| Column | Meaning |
|--------|---------|
| **Agent** | Which agent triggered the alert |
| **Severity** | Warning or Critical |
| **Summary** | Brief description |
| **Status** | Sent / Failed |
| **Sent** | When the alert was dispatched |

---

## Data & Privacy

**Sidebar: Data Transparency**

Atlas Synapse is designed with privacy first. Here's exactly what happens to your data.

### PII Redaction

All traces pass through a PII stripping layer **before** any data reaches the database. Raw text is never persisted.

| Pattern Detected | Replaced With |
|-----------------|---------------|
| Email addresses | `[EMAIL]` |
| Phone numbers | `[PHONE]` |
| Social Security Numbers | `[SSN]` |
| Credit/debit card numbers (Luhn-validated) | `[CARD]` |
| Street addresses | `[ADDRESS]` |
| JWT tokens | `[JWT]` |
| API keys (`sk-*`, `ghp_*`, `AKIA*`) | `[API_KEY]` |

### What We Store

- Redacted prompt and response content (PII already stripped)
- Tool call names and sanitized inputs/outputs
- Timestamps, token counts, cost estimates
- Evaluation scores and plain-English summaries
- Incident records linked to the traces that triggered them

### What We Never Store

- Raw (un-redacted) prompts or responses
- Personally identifiable information
- API keys, passwords, or authentication tokens

### Data Retention

- All trace data is **automatically deleted after 90 days**
- Deletion on request — contact support
- The Data Transparency page shows live stats: total stored traces, agent count, and how many traces are due for deletion

---

## Metrics Reference

### Dashboard Stat Cards

| Metric | Calculation | Good | Watch | Investigate |
|--------|-------------|------|-------|-------------|
| **Pass Rate** | (passing evals / total evals) × 100 | ≥ 90% (green) | 70–89% (yellow) | < 70% (red) |
| **Active Incidents (7d)** | Count of incidents in last 7 days | 0 | 1–5 | 5+ |
| **Traces Today** | Traces received in last 24 hours | Consistent with expected volume | Sudden spike or drop | Zero (agents may be down) |

### Confidence Score

The evaluator's certainty that its assessment is correct. Range: 0% to 100%.

| Range | Meaning | Incident Severity |
|-------|---------|-------------------|
| **≥ 85%** | High confidence — likely a genuine issue | **Critical** |
| **60–84%** | Medium confidence — worth reviewing | **Warning** |
| **< 60%** | Lower confidence — may be borderline | **Warning** |

**How to interpret:** A high-confidence failure is almost certainly a real problem. A low-confidence anomaly might be a false alarm — use the feedback form to confirm or dismiss.

### Agent Health

| Status | Criteria | Meaning |
|--------|----------|---------|
| **Healthy** | Zero incidents in 7 days | Agent is performing well |
| **Needs Attention** | Warning-level incidents present | Some issues detected, review recommended |
| **Critical** | Critical-level incidents present | Significant problems, investigate immediately |

### SLA Error Rate

| Metric | Formula |
|--------|---------|
| **Error Rate %** | (failures + anomalies) / total evaluations × 100 |

Calculated over a rolling window you configure (default: 60 minutes). Triggers only when at least 5 evaluations exist in the window.

### Cost Tracking

- **Cost** is displayed in USD, calculated from micro-USD stored values
- Provided by your SDK via `costCents` (Python) or `tokenCount` (JS)
- Visible on individual trace detail pages

### Token Counts

- Total tokens consumed per trace
- Formatted with commas (e.g., "12,345")
- Provided by your SDK — includes input tokens, output tokens, cache tokens

---

## Troubleshooting

### "No agents connected yet"

**Cause:** No traces have been sent to your project token.

**Fix:**
1. Verify your project token is correct and active (check **Connections** page)
2. Send a test trace using the cURL command from [Getting Started](#3-send-your-first-trace)
3. Check that your ingest URL is reachable

### Traces appear but no evaluations

**Cause:** Evaluations run automatically via a background cron job (every few minutes).

**Fix:** Wait 60 seconds. If evaluations still don't appear after 5 minutes, check the **Traces** page — the status should progress from "received" to "pass" or "alerted."

### "Evaluation pending..." stuck

**Cause:** The evaluation cron may not have processed this trace yet, or it failed.

**Fix:**
- If status is "received" — wait for the next cron cycle
- If status is "failed" — the evaluator couldn't process this trace after 3 retries. This typically means the trace content was too complex or malformed

### Token revoked / 403 errors

**Cause:** The project token has been revoked.

**Fix:** Create a new connection token on the **Connections** page and update your SDK configuration.

### Rate limited (429 errors)

**Cause:** Exceeded 60 requests per minute per token.

**Fix:** Reduce trace frequency, or use separate project tokens for high-volume agents.

### PII still visible in traces

**Cause:** The PII pattern wasn't recognized by the redaction engine.

**Fix:** Atlas Synapse strips common PII patterns (email, phone, SSN, credit card, address, JWT, API keys). Non-standard formats may not be caught. Avoid sending sensitive data in trace payloads when possible.

### Slack alerts not arriving

**Fix:**
1. Verify your webhook URL in **Settings > Slack Webhook**
2. Test the webhook URL directly with a cURL POST
3. Check that your Slack channel hasn't archived or restricted incoming webhooks

### Too many false alarms

**Fix:**
1. Use the **feedback form** on each false-alarm incident to flag it as "No, false alarm"
2. Add **custom evaluation criteria** in Settings to give the evaluator more context about acceptable behavior
3. Adjust **severity threshold** to "Critical only" to reduce low-confidence alerts

---

## Audit Log

**Sidebar: Audit Log**

An immutable record of all actions in your workspace. Every configuration change, feedback submission, webhook update, and SLA rule modification is logged here with timestamps and user attribution.

| Column | Meaning |
|--------|---------|
| **When** | Timestamp of the action |
| **Action** | What was done (e.g., `alert_pref.updated`, `incident.feedback`, `webhook.created`) |
| **Details** | Specifics of the change |
| **Agent** | Related agent (if applicable) |

---

## Quick Reference

### SDK Installation Commands

| Framework | Install Command |
|-----------|----------------|
| Python (core) | `pip install atlas-synapse` |
| + Anthropic | `pip install "atlas-synapse[anthropic]"` |
| + OpenAI | `pip install "atlas-synapse[openai]"` |
| + LangChain | `pip install "atlas-synapse[langchain]"` |
| + CrewAI | `pip install "atlas-synapse[crewai]"` |
| + LlamaIndex | `pip install "atlas-synapse[llamaindex]"` |
| JavaScript/TypeScript | `npm install @atlas/sdk-js` |
| N8N | Import template JSON |

### Ingest Payload (Minimum Required)

```json
{
  "projectToken": "proj_...",
  "agentId": "my-agent",
  "externalTraceId": "unique-id",
  "timestamp": "2026-04-30T12:00:00Z",
  "prompt": "User input",
  "response": "Agent output"
}
```

### Key URLs

| Resource | Purpose |
|----------|---------|
| Dashboard | Your Atlas Synapse web app URL |
| Ingest Endpoint | `https://edge.atlassynapse.com/ingest` |
| Slack Webhook Setup | [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks) |
