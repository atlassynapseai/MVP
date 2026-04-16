#!/usr/bin/env python3
"""
AtlasSynapse P2 — Anthropic Agent SDK Integration Test

Runs a simulated 2-tool Claude agent against a local (or remote) AtlasSynapse
ingest stack, verifying that a Trace row is created with correct fields.

Usage:
    # Start local servers first:
    #   pnpm --filter @atlas/edge dev   (port 8787)
    #   pnpm --filter @atlas/web dev    (port 3000)
    #
    # Seed a Connection row in DB first:
    #   INSERT INTO "Connection" (id, type, "projectTokenHash", status, "orgId")
    #   VALUES (cuid(), 'builder', sha256('test-token-32chars-xxxxxxxxxxxx'), 'active', <orgId>);
    #
    # Set env vars:
    #   export ANTHROPIC_API_KEY=sk-ant-...
    #   export ATLAS_PROJECT_TOKEN=test-token-32chars-xxxxxxxxxxxx
    #   export ATLAS_INGEST_URL=http://localhost:8787   (edge worker)
    #
    python scripts/test-anthropic-agent.py

The script uses the Anthropic Messages API directly (not Agent SDK) for
portability, but applies the same mapping that wrap_agent() uses.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import httpx

try:
    from anthropic import Anthropic
except ImportError:
    print("ERROR: Install anthropic: pip install anthropic", file=sys.stderr)
    sys.exit(1)

ATLAS_PROJECT_TOKEN = os.environ.get("ATLAS_PROJECT_TOKEN", "")
ATLAS_INGEST_URL = os.environ.get("ATLAS_INGEST_URL", "http://localhost:8787")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AGENT_NAME = "test-research-agent"

if not ATLAS_PROJECT_TOKEN or len(ATLAS_PROJECT_TOKEN) < 32:
    print("ERROR: Set ATLAS_PROJECT_TOKEN (>=32 chars)", file=sys.stderr)
    sys.exit(1)

if not ANTHROPIC_API_KEY:
    print("ERROR: Set ANTHROPIC_API_KEY", file=sys.stderr)
    sys.exit(1)


def run_agent() -> dict:
    """
    Run a simple 2-tool Claude agent conversation.
    Returns a dict with the trace data to report.
    """
    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    tools = [
        {
            "name": "web_search",
            "description": "Search the web for current information on a topic.",
            "input_schema": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search query"}},
                "required": ["query"],
            },
        },
        {
            "name": "summarize",
            "description": "Summarize a list of search results into a concise report.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "results": {"type": "array", "items": {"type": "string"}},
                    "topic": {"type": "string"},
                },
                "required": ["results", "topic"],
            },
        },
    ]

    user_message = "Research the latest developments in AI agent observability tools and give me a summary."

    messages = [{"role": "user", "content": user_message}]
    tool_calls_collected: list[dict] = []
    input_tokens_total = 0
    output_tokens_total = 0

    # Turn 1
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        tools=tools,  # type: ignore[arg-type]
        messages=messages,  # type: ignore[arg-type]
    )
    input_tokens_total += response.usage.input_tokens
    output_tokens_total += response.usage.output_tokens

    assistant_content = []
    tool_results = []

    for block in response.content:
        if block.type == "tool_use":
            assistant_content.append({
                "type": "tool_use",
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })
            # Simulate tool execution
            simulated_output = (
                f"[Simulated result for '{block.name}' with input {json.dumps(block.input)[:100]}]"
            )
            tool_calls_collected.append({
                "name": block.name,
                "input": block.input,
                "output": simulated_output,
            })
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": simulated_output,
            })
        elif block.type == "text":
            assistant_content.append({"type": "text", "text": block.text})

    # Turn 2 — send tool results back
    messages.append({"role": "assistant", "content": assistant_content})
    messages.append({"role": "user", "content": tool_results})

    response2 = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        tools=tools,  # type: ignore[arg-type]
        messages=messages,  # type: ignore[arg-type]
    )
    input_tokens_total += response2.usage.input_tokens
    output_tokens_total += response2.usage.output_tokens

    final_response = next(
        (block.text for block in response2.content if block.type == "text"), ""
    )

    return {
        "prompt": user_message,
        "response": final_response,
        "tool_calls": tool_calls_collected,
        "token_count": input_tokens_total + output_tokens_total,
    }


def post_trace(trace_data: dict) -> bool:
    """POST the trace to the AtlasSynapse edge worker."""
    import secrets
    payload = {
        "projectToken": ATLAS_PROJECT_TOKEN,
        "agentId": AGENT_NAME,
        "externalTraceId": f"test-{secrets.token_hex(8)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompt": trace_data["prompt"],
        "response": trace_data["response"],
        "toolCalls": trace_data["tool_calls"],
        "tokenCount": trace_data["token_count"],
        "platform": "anthropic",
    }

    print(f"\nPosting trace to {ATLAS_INGEST_URL}/ingest ...")
    print(f"  agentId:     {AGENT_NAME}")
    print(f"  traceId:     {payload['externalTraceId']}")
    print(f"  toolCalls:   {len(trace_data['tool_calls'])}")
    print(f"  tokenCount:  {trace_data['token_count']}")

    try:
        resp = httpx.post(
            f"{ATLAS_INGEST_URL}/ingest",
            json=payload,
            timeout=10.0,
        )
        if resp.status_code in (200, 201):
            print(f"\n✓ Trace accepted (HTTP {resp.status_code})")
            print("  Check DB: SELECT * FROM \"Trace\" WHERE \"externalTraceId\" = '{}';".format(
                payload["externalTraceId"]
            ))
            return True
        else:
            print(f"\n✗ Ingest failed: HTTP {resp.status_code}")
            print(f"  Response: {resp.text[:500]}")
            return False
    except Exception as exc:
        print(f"\n✗ Network error: {exc}")
        return False


def main() -> None:
    print("AtlasSynapse — Anthropic Agent Integration Test")
    print("=" * 50)
    print(f"  Agent name:  {AGENT_NAME}")
    print(f"  Ingest URL:  {ATLAS_INGEST_URL}")
    print()

    print("Running Claude agent (2-tool research scenario)...")
    trace_data = run_agent()

    print(f"\nAgent response (first 200 chars):\n  {trace_data['response'][:200]}")

    success = post_trace(trace_data)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
