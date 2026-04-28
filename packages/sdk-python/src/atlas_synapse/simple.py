"""Simple trace context manager for AtlasSynapse SDK."""

from __future__ import annotations

import secrets
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator

from .client import AtlasSynapseSdk, ToolCallPayload, TracePayload


class _TraceContext:
    """Mutable object populated inside a `with atlas.trace() as t:` block."""

    def __init__(self) -> None:
        self._prompt: str = ""
        self._response: str = ""
        self._tool_calls: list[ToolCallPayload] = []
        self._token_count: int | None = None
        self._cost_cents: float | None = None
        self._agent_id: str = ""
        self._platform: str = "anthropic"

    def record(
        self,
        *,
        prompt: str,
        response: str,
        token_count: int | None = None,
        cost_cents: float | None = None,
        tool_calls: list[dict[str, Any]] | None = None,
        agent_id: str | None = None,
        platform: str = "anthropic",
    ) -> None:
        """Record trace data. Call once inside the `with` block."""
        self._prompt = prompt
        self._response = response
        self._token_count = token_count
        self._cost_cents = cost_cents
        self._platform = platform
        if agent_id:
            self._agent_id = agent_id
        if tool_calls:
            self._tool_calls = [
                ToolCallPayload(
                    name=tc.get("name", ""),
                    input=tc.get("input", {}),
                    output=tc.get("output"),
                )
                for tc in tool_calls
            ]


class AtlasSynapseClient:
    """
    Simple Atlas Synapse client.

    Usage::

        atlas = AtlasSynapseClient(
            token="your-project-token",
            ingest_url="https://your-worker.workers.dev",  # optional
            agent_name="my-agent",
        )

        with atlas.trace() as trace:
            response = client.messages.create(...)
            trace.record(
                prompt="Hello!",
                response=response.content[0].text,
                token_count=response.usage.input_tokens + response.usage.output_tokens,
            )
    """

    def __init__(
        self,
        token: str,
        *,
        ingest_url: str = "https://atlas-edge.atlas-synapse.workers.dev",
        agent_name: str = "default-agent",
        timeout: float = 10.0,
    ) -> None:
        self._sdk = AtlasSynapseSdk(
            project_token=token,
            ingest_url=ingest_url,
            agent_name=agent_name,
            timeout=timeout,
        )
        self._agent_name = agent_name

    @contextmanager
    def trace(self, *, agent_name: str | None = None) -> Generator[_TraceContext, None, None]:
        """
        Context manager that auto-posts a trace on exit.

        Yields a :class:`_TraceContext` — call ``.record(...)`` on it to
        attach prompt/response data.  If ``.record()`` is never called
        (e.g. the block raises before reaching it), no trace is posted.
        """
        ctx = _TraceContext()
        ctx._agent_id = agent_name or self._agent_name
        try:
            yield ctx
        finally:
            if ctx._prompt or ctx._response:
                payload = TracePayload(
                    agent_id=ctx._agent_id,
                    external_trace_id=secrets.token_hex(16),
                    timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    prompt=ctx._prompt,
                    response=ctx._response,
                    tool_calls=ctx._tool_calls,
                    token_count=ctx._token_count,
                    cost_cents=ctx._cost_cents,
                    platform=ctx._platform,
                )
                self._sdk.post_trace(payload)

    def close(self) -> None:
        self._sdk.close()

    def __enter__(self) -> AtlasSynapseClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
