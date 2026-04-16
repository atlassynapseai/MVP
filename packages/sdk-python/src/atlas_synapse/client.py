"""AtlasSynapseSdk — thin client for posting canonical traces to the ingest endpoint."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger(__name__)


@dataclass
class ToolCallPayload:
    name: str
    input: dict[str, Any]
    output: Any = None


@dataclass
class TracePayload:
    agent_id: str
    external_trace_id: str
    timestamp: str  # ISO 8601
    prompt: str
    response: str
    tool_calls: list[ToolCallPayload] = field(default_factory=list)
    token_count: int | None = None
    cost_cents: float | None = None
    platform: str = "anthropic"


class AtlasSynapseSdk:
    """
    Client for reporting agent traces to AtlasSynapse.

    Usage:
        sdk = AtlasSynapseSdk(
            project_token="your-32-char-token",
            ingest_url="https://your-edge-worker.workers.dev",
            agent_name="customer-support-bot",
        )
        wrapped = sdk.wrap_agent(agent)
    """

    def __init__(
        self,
        project_token: str,
        ingest_url: str,
        agent_name: str,
        timeout: float = 10.0,
    ) -> None:
        if len(project_token) < 32:
            raise ValueError("project_token must be at least 32 characters")
        self.project_token = project_token
        self.ingest_url = ingest_url.rstrip("/")
        self.agent_name = agent_name
        self._http = httpx.Client(timeout=timeout)

    def post_trace(self, trace: TracePayload) -> bool:
        """
        POST a canonical trace to the AtlasSynapse ingest endpoint.
        Returns True on success, False on failure (never raises).
        """
        payload: dict[str, Any] = {
            "projectToken": self.project_token,
            "agentId": trace.agent_id,
            "externalTraceId": trace.external_trace_id,
            "timestamp": trace.timestamp,
            "prompt": trace.prompt,
            "response": trace.response,
            "toolCalls": [
                {"name": tc.name, "input": tc.input, **({"output": tc.output} if tc.output is not None else {})}
                for tc in trace.tool_calls
            ],
            "platform": trace.platform,
        }
        if trace.token_count is not None:
            payload["tokenCount"] = trace.token_count
        if trace.cost_cents is not None:
            payload["costCents"] = trace.cost_cents

        try:
            resp = self._http.post(
                f"{self.ingest_url}/ingest",
                content=json.dumps(payload),
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code not in (200, 201):
                logger.warning(
                    "AtlasSynapse ingest returned %d: %s",
                    resp.status_code,
                    resp.text[:200],
                )
                return False
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse ingest failed: %s", exc)
            return False

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> AtlasSynapseSdk:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
