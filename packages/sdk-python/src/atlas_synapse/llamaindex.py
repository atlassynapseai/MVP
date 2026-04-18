"""
LlamaIndex integration for AtlasSynapse.

Captures LlamaIndex query/agent run events and posts traces automatically.

Usage::

    from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
    from atlas_synapse import AtlasSynapseClient
    from atlas_synapse.llamaindex import AtlasSynapseCallbackHandler

    atlas = AtlasSynapseClient(token="proj_...", agent_name="my-rag-agent")
    handler = AtlasSynapseCallbackHandler(atlas)

    # Register globally
    from llama_index.core.callbacks import CallbackManager
    index = VectorStoreIndex.from_documents(
        docs,
        callback_manager=CallbackManager([handler]),
    )

    response = index.as_query_engine().query("What is RAG?")
    # Trace automatically sent to AtlasSynapse
"""

from __future__ import annotations

import logging
import time
from typing import Any

from .simple import AtlasSynapseClient

logger = logging.getLogger(__name__)

try:
    from llama_index.core.callbacks.base_handler import BaseCallbackHandler as _LlamaBaseHandler
    from llama_index.core.callbacks.schema import CBEventType, EventPayload
    _LLAMA_AVAILABLE = True
except ImportError:
    _LLAMA_AVAILABLE = False

    class _LlamaBaseHandler:  # type: ignore[no-redef]
        pass

    class CBEventType:  # type: ignore[no-redef]
        QUERY = "query"
        LLM = "llm"
        FUNCTION_CALL = "function_call"

    class EventPayload:  # type: ignore[no-redef]
        QUERY_STR = "query_str"
        RESPONSE = "response"
        MESSAGES = "messages"
        RESPONSE = "response"  # noqa: F811
        TOOL = "tool"
        FUNCTION_OUTPUT = "function_output"


class AtlasSynapseCallbackHandler(_LlamaBaseHandler):
    """
    LlamaIndex callback handler that reports queries/agent runs to AtlasSynapse.

    Pass to ``CallbackManager`` when creating an index, query engine, or agent.
    One trace is posted per top-level query or agent run.
    """

    def __init__(
        self,
        client: AtlasSynapseClient,
        *,
        agent_name: str | None = None,
        event_starts_to_ignore: list[Any] | None = None,
        event_ends_to_ignore: list[Any] | None = None,
    ) -> None:
        if not _LLAMA_AVAILABLE:
            raise ImportError(
                "llama-index-core is required: pip install 'atlas-synapse[llamaindex]'"
            )
        super().__init__(
            event_starts_to_ignore=event_starts_to_ignore or [],
            event_ends_to_ignore=event_ends_to_ignore or [],
        )
        self._client = client
        self._agent_name = agent_name
        # State per event_id
        self._queries: dict[str, str] = {}
        self._tool_calls: dict[str, list[dict[str, Any]]] = {}
        self._token_counts: dict[str, int] = {}
        self._start_times: dict[str, float] = {}

    # ── LlamaIndex callback interface ──────────────────────────────────────

    def on_event_start(
        self,
        event_type: Any,
        payload: dict[str, Any] | None = None,
        event_id: str = "",
        parent_id: str = "",
        **kwargs: Any,
    ) -> str:
        payload = payload or {}
        if str(event_type) in (str(CBEventType.QUERY), "query"):
            self._queries[event_id] = str(payload.get(EventPayload.QUERY_STR, ""))[:50_000]
            self._tool_calls[event_id] = []
            self._token_counts[event_id] = 0
            self._start_times[event_id] = time.monotonic()
        elif str(event_type) in (str(CBEventType.FUNCTION_CALL), "function_call"):
            # Accumulate tool calls into the parent query event
            if parent_id in self._tool_calls:
                tool = payload.get(EventPayload.TOOL, {})
                self._tool_calls[parent_id].append({
                    "name": str(getattr(tool, "name", tool) if not isinstance(tool, str) else tool),
                    "input": payload.get("tool_kwargs", {}),
                    "output": None,
                    "_event_id": event_id,
                })
        return event_id

    def on_event_end(
        self,
        event_type: Any,
        payload: dict[str, Any] | None = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> None:
        payload = payload or {}
        event_type_str = str(event_type)

        if event_type_str in (str(CBEventType.QUERY), "query"):
            query = self._queries.pop(event_id, "")
            tool_calls = self._tool_calls.pop(event_id, [])
            token_count = self._token_counts.pop(event_id, 0) or None
            self._start_times.pop(event_id, None)

            response_obj = payload.get(EventPayload.RESPONSE)
            response = str(response_obj)[:50_000] if response_obj is not None else ""

            # Strip internal _event_id tracking keys
            clean_tools = [{k: v for k, v in tc.items() if k != "_event_id"} for tc in tool_calls]

            try:
                with self._client.trace(agent_name=self._agent_name) as trace:
                    trace.record(
                        prompt=query,
                        response=response,
                        token_count=token_count,
                        tool_calls=clean_tools,
                        platform="llamaindex",
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("AtlasSynapse: failed to post LlamaIndex trace: %s", exc)

        elif event_type_str in (str(CBEventType.FUNCTION_CALL), "function_call"):
            # Fill in tool call output
            parent_id = kwargs.get("parent_id", "")
            if parent_id in self._tool_calls:
                fn_output = str(payload.get(EventPayload.FUNCTION_OUTPUT, ""))[:5_000]
                for tc in self._tool_calls[parent_id]:
                    if tc.get("_event_id") == event_id:
                        tc["output"] = fn_output
                        break

        elif event_type_str in (str(CBEventType.LLM), "llm"):
            # Accumulate token usage into parent query
            parent_id = kwargs.get("parent_id", "")
            if parent_id in self._token_counts:
                response_obj = payload.get(EventPayload.RESPONSE)
                try:
                    usage = getattr(response_obj, "raw", {}) or {}
                    usage_data = usage.get("usage") or {}
                    tokens = (
                        (usage_data.get("prompt_tokens") or 0)
                        + (usage_data.get("completion_tokens") or 0)
                    )
                    self._token_counts[parent_id] += tokens
                except Exception:  # noqa: BLE001
                    pass

    def start_trace(self, trace_id: str | None = None) -> None:
        pass

    def end_trace(
        self,
        trace_id: str | None = None,
        trace_map: dict[str, list[str]] | None = None,
    ) -> None:
        pass
