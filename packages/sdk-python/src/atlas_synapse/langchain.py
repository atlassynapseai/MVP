"""
LangChain callback handler for Atlas Synapse.

Captures LangChain agent / chain runs and auto-posts traces.

Usage::

    from langchain_anthropic import ChatAnthropic
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from atlas_synapse import AtlasSynapseClient
    from atlas_synapse.langchain import AtlasSynapseCallbackHandler

    atlas = AtlasSynapseClient(token="your-token", agent_name="my-lc-agent")
    handler = AtlasSynapseCallbackHandler(atlas)

    agent_executor = AgentExecutor(agent=agent, tools=tools, callbacks=[handler])
    agent_executor.invoke({"input": "What is the weather today?"})
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from .simple import AtlasSynapseClient

logger = logging.getLogger(__name__)

try:
    from langchain_core.callbacks import BaseCallbackHandler
    from langchain_core.outputs import LLMResult
    _LANGCHAIN_AVAILABLE = True
except ImportError:
    _LANGCHAIN_AVAILABLE = False
    # Fallback base so the class definition doesn't fail at import time
    class BaseCallbackHandler:  # type: ignore[no-redef]
        pass


class AtlasSynapseCallbackHandler(BaseCallbackHandler):
    """
    LangChain callback handler that reports agent runs to Atlas Synapse.

    Attach to any LangChain chain or AgentExecutor via the ``callbacks`` argument.
    One trace is posted per top-level chain run.
    """

    def __init__(self, client: AtlasSynapseClient, *, agent_name: str | None = None) -> None:
        if not _LANGCHAIN_AVAILABLE:
            raise ImportError(
                "langchain-core is required: pip install langchain-core"
            )
        super().__init__()
        self._client = client
        self._agent_name = agent_name
        # State per run_id (top-level chain only)
        self._prompt: dict[UUID, str] = {}
        self._tool_calls: dict[UUID, list[dict[str, Any]]] = {}
        self._input_tokens: dict[UUID, int] = {}
        self._output_tokens: dict[UUID, int] = {}

    # ── Chain lifecycle ────────────────────────────────────────────────────

    def on_chain_start(
        self,
        serialized: dict[str, Any],
        inputs: dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        if parent_run_id is None:  # top-level chain only
            prompt = (
                inputs.get("input")
                or inputs.get("question")
                or inputs.get("query")
                or str(inputs)
            )
            self._prompt[run_id] = str(prompt)[:50_000]
            self._tool_calls[run_id] = []
            self._input_tokens[run_id] = 0
            self._output_tokens[run_id] = 0

    def on_chain_end(
        self,
        outputs: dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        if parent_run_id is not None:
            return  # only post for top-level chain

        prompt = self._prompt.pop(run_id, "")
        tool_calls = self._tool_calls.pop(run_id, [])
        in_tok = self._input_tokens.pop(run_id, 0)
        out_tok = self._output_tokens.pop(run_id, 0)

        response = (
            outputs.get("output")
            or outputs.get("result")
            or outputs.get("answer")
            or str(outputs)
        )

        total_tokens = (in_tok + out_tok) or None

        try:
            with self._client.trace(agent_name=self._agent_name) as trace:
                trace.record(
                    prompt=prompt,
                    response=str(response)[:50_000],
                    token_count=total_tokens,
                    tool_calls=tool_calls,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post trace: %s", exc)

    # ── LLM lifecycle (token counting) ────────────────────────────────────

    def on_llm_end(
        self,
        response: "LLMResult",
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        if parent_run_id is None:
            return
        # Accumulate tokens into the parent chain run
        try:
            usage = response.llm_output or {}
            token_usage = usage.get("token_usage") or usage.get("usage") or {}
            in_tok = token_usage.get("prompt_tokens") or token_usage.get("input_tokens") or 0
            out_tok = token_usage.get("completion_tokens") or token_usage.get("output_tokens") or 0
            if parent_run_id in self._input_tokens:
                self._input_tokens[parent_run_id] += in_tok
                self._output_tokens[parent_run_id] += out_tok
        except Exception:  # noqa: BLE001
            pass

    # ── Tool lifecycle ─────────────────────────────────────────────────────

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        # Store partial tool call; output added in on_tool_end
        if parent_run_id and parent_run_id in self._tool_calls:
            self._tool_calls[parent_run_id].append({
                "_run_id": str(run_id),
                "name": serialized.get("name", "unknown"),
                "input": {"input": input_str},
                "output": None,
            })

    def on_tool_end(
        self,
        output: Any,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        if not (parent_run_id and parent_run_id in self._tool_calls):
            return
        run_id_str = str(run_id)
        for tc in self._tool_calls[parent_run_id]:
            if tc.get("_run_id") == run_id_str:
                tc["output"] = str(output)[:5_000]
                del tc["_run_id"]
                break
