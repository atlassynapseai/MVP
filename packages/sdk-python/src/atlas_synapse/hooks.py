"""
Hooks integration for Anthropic Claude Agent SDK.

Usage:
    from anthropic import Anthropic
    from atlas_synapse import AtlasSynapseSdk, wrap_agent

    sdk = AtlasSynapseSdk(
        project_token="your-token",
        ingest_url="https://your-worker.workers.dev",
        agent_name="my-agent",
    )

    # Option A: wrap an existing agent instance
    agent = wrap_agent(agent, sdk)

    # Option B: use context manager
    with sdk:
        agent = wrap_agent(agent, sdk)
"""

from __future__ import annotations

import logging
from typing import Any

from .client import AtlasSynapseSdk
from .mapper import map_sdk_events_to_trace

logger = logging.getLogger(__name__)


class _TraceCollector:
    """Collects events during a single agent run."""

    def __init__(self, agent_name: str, sdk: AtlasSynapseSdk) -> None:
        self._agent_name = agent_name
        self._sdk = sdk
        self._messages: list[dict[str, Any]] = []
        self._session_id: str = ""
        self._total_tokens: int | None = None
        self._total_cost_usd: float | None = None

    def on_message(self, message: dict[str, Any]) -> None:
        """Called for each message in the conversation."""
        role = message.get("role", "")
        content = message.get("content", "")
        self._messages.append({"role": role, "content": content})

    def on_system(self, event: dict[str, Any]) -> None:
        """Called on SystemMessage — extracts session_id."""
        if event.get("subtype") == "init":
            self._session_id = event.get("session_id", "")

    def on_result(self, event: dict[str, Any]) -> None:
        """Called on ResultMessage — extracts cost and token totals."""
        self._total_cost_usd = event.get("total_cost_usd")
        usage = event.get("usage", {})
        if isinstance(usage, dict):
            self._total_tokens = sum(
                usage.get(k, 0) or 0
                for k in ("input_tokens", "output_tokens",
                           "cache_creation_input_tokens", "cache_read_input_tokens")
            ) or None

    def flush(self) -> None:
        """Build and POST the canonical trace."""
        if not self._session_id:
            logger.warning("AtlasSynapse: no session_id captured, skipping trace")
            return

        trace = map_sdk_events_to_trace(
            agent_name=self._agent_name,
            session_id=self._session_id,
            messages=self._messages,
            total_tokens=self._total_tokens,
            total_cost_usd=self._total_cost_usd,
        )
        self._sdk.post_trace(trace)


def wrap_agent(agent: Any, sdk: AtlasSynapseSdk) -> Any:
    """
    Wrap an Anthropic Claude Agent SDK agent to auto-report traces.

    Installs event listeners (compatible with both callback-style and
    hook-based APIs depending on SDK version). The wrapped agent behaves
    identically to the original.

    Note: This uses duck-typing so it works with any object that has
    an `on` or `add_event_listener` method, or directly patches the
    agent's run method for simpler SDK versions.
    """
    collector = _TraceCollector(agent_name=sdk.agent_name, sdk=sdk)

    # Try hook-based API first (newer SDK)
    if hasattr(agent, "on"):
        try:
            agent.on("message", collector.on_message)
            agent.on("system", collector.on_system)
            agent.on("result", lambda ev: (collector.on_result(ev), collector.flush()))
            return agent
        except Exception:
            pass

    # Fallback: wrap the run/stream method directly
    _original_run = getattr(agent, "run", None) or getattr(agent, "stream", None)
    if _original_run is None:
        logger.warning("AtlasSynapse: could not find run/stream method on agent")
        return agent

    method_name = "run" if hasattr(agent, "run") else "stream"

    def _wrapped_run(*args: Any, **kwargs: Any) -> Any:
        result = _original_run(*args, **kwargs)
        # Best-effort extraction from result object
        try:
            if hasattr(result, "session_id"):
                collector._session_id = result.session_id
            if hasattr(result, "messages"):
                for msg in result.messages:
                    collector.on_message({"role": getattr(msg, "role", ""), "content": getattr(msg, "content", "")})
            if hasattr(result, "total_cost_usd"):
                collector.on_result({
                    "total_cost_usd": result.total_cost_usd,
                    "usage": getattr(result, "usage", {}),
                })
            collector.flush()
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: trace capture failed: %s", exc)
        return result

    setattr(agent, method_name, _wrapped_run)
    return agent
