# N8N Integration Test — AtlasSynapse Reporter

## Overview

This guide walks through testing AtlasSynapse monitoring with a real N8N AI Agent workflow.
Uses `n8n-ai-automations` as the sample scenario (open-source, realistic).

## Prerequisites

- N8N running locally or on cloud (Docker: `docker run -it --rm -p 5678:5678 n8nio/n8n`)
- AtlasSynapse edge worker running (`pnpm --filter @atlas/edge dev` on port 8787)
- AtlasSynapse web server running (`pnpm --filter @atlas/web dev` on port 3000)
- A seeded Connection row in DB with a project token

## Step 1: Set N8N Environment Variables

In your N8N instance settings (Settings → n8n environment variables), add:

```
ATLAS_PROJECT_TOKEN = your-32-char-project-token
ATLAS_INGEST_URL    = http://localhost:8787
```

For cloud N8N, use your deployed edge worker URL instead of localhost.

## Step 2: Import the AtlasSynapse Reporter Sub-Workflow

1. In N8N, click **Workflows → Import from file**
2. Select `public/templates/n8n-atlas-reporter.json`
3. Edit the **AtlasSynapse Config** Set node:
   - Set `ATLAS_AGENT_NAME` to a meaningful name (e.g. `"gmail-ai-agent"`)
   - Verify `ATLAS_PROJECT_TOKEN` reads from your env var
4. Save and activate

## Step 3: Import the Sample Agent Workflow

Download a real AI agent workflow from the `n8n-ai-automations` collection:
- **Repository:** https://github.com/lucaswalter/n8n-ai-automations
- **Recommended:** `ai_gmail_agent.json` (uses AI Agent node + Gmail tools)
- **Alternative:** Any workflow with an AI Agent node

Import into N8N: **Workflows → Import from file**

## Step 4: Connect the Reporter to Your Workflow

In your agent workflow, after the final AI Agent node:

1. Add a **Execute Sub-Workflow** node (or **HTTP Request** if not using sub-workflows)
2. Connect it to the AI Agent node output
3. If using Execute Sub-Workflow: select the AtlasSynapse Reporter workflow
4. If using HTTP Request directly:
   - Method: POST
   - URL: `{{ $env.ATLAS_INGEST_URL }}/ingest`
   - Body (JSON):
     ```json
     {
       "projectToken": "{{ $env.ATLAS_PROJECT_TOKEN }}",
       "agentId": "gmail-ai-agent",
       "externalTraceId": "{{ $execution.id }}",
       "timestamp": "{{ new Date().toISOString() }}",
       "prompt": "{{ $json.chatInput || $json.input || '' }}",
       "response": "{{ $json.output || $json.text || '' }}",
       "toolCalls": "={{ $json.intermediateSteps || [] }}",
       "platform": "n8n"
     }
     ```
   - Set **Continue on Fail** = true (never block your workflow)

**Important:** Enable "Return Intermediate Steps" on the AI Agent node to capture tool calls.

## Step 5: Trigger the Workflow

Manually trigger the workflow (Test workflow button) or trigger via webhook.

## Step 6: Verify in AtlasSynapse

After the workflow runs:

```sql
-- Check that a Trace row was created
SELECT
  t.id,
  t."externalTraceId",
  a."displayName" as agent,
  a.platform,
  t.status,
  t."createdAt"
FROM "Trace" t
JOIN "Agent" a ON a.id = t."agentId"
WHERE a.platform = 'n8n'
ORDER BY t."createdAt" DESC
LIMIT 5;
```

Expected:
- `externalTraceId` matches the N8N execution ID
- `platform` = `n8n`
- `status` = `received` (will transition to `pass` or `alerted` after Vercel Cron fires)

## Known Limitations

- **Token count is always null** for N8N agents — N8N does not expose LLM token usage. The evaluator works without it.
- **Tool calls require "Return Intermediate Steps"** on the AI Agent node. If disabled, `toolCalls` will be empty (still valid for evaluation).
- **Streaming mode + intermediate steps** is a known N8N bug — if streaming is enabled, intermediate steps are not captured. Disable streaming on the AI Agent node for full tool call capture.

## Sample Failure Scenario (for testing evaluation)

To test incident creation without a real failing agent, inject a trace with a
clear failure signal:

```bash
curl -X POST http://localhost:8787/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectToken": "your-32-char-project-token",
    "agentId": "test-n8n-agent",
    "externalTraceId": "n8n-test-fail-001",
    "timestamp": "2026-04-16T12:00:00Z",
    "prompt": "Book a flight from London to New York for next Tuesday",
    "response": "I was unable to complete the booking due to an error.",
    "toolCalls": [
      {"name": "search_flights", "input": {"from": "LHR", "to": "JFK"}, "output": null},
      {"name": "book_flight", "input": {"flight_id": "UA-001"}, "output": null}
    ],
    "platform": "n8n"
  }'
```

This should result in a `task_failure` incident within 60 seconds (next Cron tick).
