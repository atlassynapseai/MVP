"""Maps Anthropic Claude Agent SDK events to AtlasSynapse CanonicalTrace."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .client import ToolCallPayload, TracePayload


def map_sdk_events_to_trace(
    *,
    agent_name: str,
    session_id: str,
    messages: list[dict[str, Any]],
    total_tokens: int | None,
    total_cost_usd: float | None,
) -> TracePayload:
    """
    Map collected Anthropic SDK events to a canonical TracePayload.

    Args:
        agent_name: User-configured display name (becomes agentId).
        session_id: Anthropic session_id (becomes externalTraceId).
        messages: List of message dicts collected during the run.
                  Expected keys: role ("user"|"assistant"), content (str or list).
        total_tokens: Sum of input + output tokens across all turns.
        total_cost_usd: Total cost from ResultMessage, if available.
    """
    prompt = _extract_first_user_message(messages)
    response = _extract_last_assistant_text(messages)
    tool_calls = _extract_tool_calls(messages)

    cost_cents: float | None = None
    if total_cost_usd is not None:
        cost_cents = total_cost_usd * 100

    return TracePayload(
        agent_id=agent_name,
        external_trace_id=session_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        prompt=prompt,
        response=response,
        tool_calls=tool_calls,
        token_count=total_tokens,
        cost_cents=cost_cents,
        platform="anthropic",
    )


def _extract_first_user_message(messages: list[dict[str, Any]]) -> str:
    for msg in messages:
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, str):
                return content[:50_000]
            if isinstance(content, list):
                texts = [
                    block.get("text", "")
                    for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                ]
                return " ".join(texts)[:50_000]
    return ""


def _extract_last_assistant_text(messages: list[dict[str, Any]]) -> str:
    last_text = ""
    for msg in messages:
        if msg.get("role") == "assistant":
            content = msg.get("content", "")
            if isinstance(content, str):
                last_text = content[:50_000]
            elif isinstance(content, list):
                texts = [
                    block.get("text", "")
                    for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                ]
                if texts:
                    last_text = " ".join(texts)[:50_000]
    return last_text


def _extract_tool_calls(messages: list[dict[str, Any]]) -> list[ToolCallPayload]:
    """
    Extract tool_use + tool_result pairs from messages.
    Anthropic tool_use blocks are in assistant messages;
    tool_result blocks are in the following user messages.
    """
    # Build a map from tool_use_id → result content
    result_map: dict[str, Any] = {}
    for msg in messages:
        if msg.get("role") == "user":
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        tool_use_id = block.get("tool_use_id", "")
                        result_map[tool_use_id] = block.get("content")

    tool_calls: list[ToolCallPayload] = []
    for msg in messages:
        if msg.get("role") == "assistant":
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        tool_id = block.get("id", "")
                        tool_calls.append(ToolCallPayload(
                            name=block.get("name", "unknown"),
                            input=block.get("input", {}),
                            output=result_map.get(tool_id),
                        ))

    return tool_calls
