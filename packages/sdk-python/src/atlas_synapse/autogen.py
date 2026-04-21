"""
AutoGen integration for AtlasSynapse.

Supports Microsoft AutoGen 0.2.x (ConversableAgent / AssistantAgent) and
AutoGen 0.4+ (agentchat). Wraps an agent's ``initiate_chat`` so every
conversation is captured as a trace.

Usage (AutoGen 0.2.x)::

    import autogen
    from atlas_synapse import AtlasSynapseClient
    from atlas_synapse.autogen import wrap_agent

    atlas = AtlasSynapseClient(token="proj_...", agent_name="my-autogen-agent")

    assistant = autogen.AssistantAgent("assistant", llm_config={...})
    user_proxy = autogen.UserProxyAgent("user_proxy", human_input_mode="NEVER")

    # Wrap the assistant — traces fire after each chat completes
    wrap_agent(assistant, atlas)

    user_proxy.initiate_chat(assistant, message="Summarise Q3 earnings.")

Usage (AutoGen 0.4 / agentchat)::

    from autogen_agentchat.agents import AssistantAgent
    from autogen_agentchat.teams import RoundRobinGroupChat
    from atlas_synapse.autogen import AtlasSynapseAutoGenObserver

    atlas = AtlasSynapseClient(token="proj_...", agent_name="my-team")
    observer = AtlasSynapseAutoGenObserver(atlas)

    agent = AssistantAgent("assistant", model_client=...)
    await observer.run_team(RoundRobinGroupChat([agent]), task="Hello!")
"""

from __future__ import annotations

import logging
import time
from typing import Any

from .simple import AtlasSynapseClient

logger = logging.getLogger(__name__)

# ── AutoGen 0.2.x ────────────────────────────────────────────────────────────


def wrap_agent(
    agent: Any,
    client: AtlasSynapseClient,
    *,
    agent_name: str | None = None,
) -> None:
    """
    Monkey-patch a ConversableAgent so that each ``generate_reply`` call is
    captured as an AtlasSynapse trace.  Works for AssistantAgent,
    GPTAssistantAgent, and any subclass that calls ``generate_reply``.

    The patch is transparent — the original return value is preserved.
    """
    original_generate_reply = getattr(agent, "generate_reply", None)
    if original_generate_reply is None:
        logger.warning(
            "AtlasSynapse: agent %s has no generate_reply method — skipping wrap",
            getattr(agent, "name", repr(agent)),
        )
        return

    display = agent_name or getattr(agent, "name", "autogen-agent")

    def _patched_generate_reply(
        messages: list[dict[str, Any]] | None = None,
        sender: Any | None = None,
        **kwargs: Any,
    ) -> Any:
        start = time.monotonic()
        reply = original_generate_reply(messages=messages, sender=sender, **kwargs)
        elapsed = time.monotonic() - start

        # Extract last human message as prompt
        prompt = ""
        if messages:
            for msg in reversed(messages):
                content = msg.get("content") or ""
                if content:
                    prompt = str(content)[:50_000]
                    break

        response = str(reply)[:50_000] if reply is not None else ""

        token_count: int | None = None
        # AutoGen sometimes stores token usage on the agent
        usage = getattr(agent, "_total_cost", None)
        if usage is None:
            usage = getattr(agent, "client", None)
            if usage is not None:
                usage = getattr(usage, "total_usage_summary", None)
        if isinstance(usage, dict):
            token_count = usage.get("total_tokens")

        try:
            with client.trace(agent_name=display) as t:
                t.record(
                    prompt=prompt or f"AutoGen call (elapsed {elapsed:.1f}s)",
                    response=response,
                    platform="autogen",
                    **({"token_count": token_count} if token_count else {}),
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post AutoGen trace: %s", exc)

        return reply

    agent.generate_reply = _patched_generate_reply
    logger.debug("AtlasSynapse: wrapped AutoGen agent %r", display)


# ── AutoGen 0.4+ (agentchat) ─────────────────────────────────────────────────


class AtlasSynapseAutoGenObserver:
    """
    Observer for AutoGen 0.4+ agentchat teams/agents.

    Wraps ``team.run()`` / ``team.run_stream()`` and captures the full
    conversation as a single AtlasSynapse trace.

    Usage::

        observer = AtlasSynapseAutoGenObserver(atlas_client)
        result = await observer.run_team(team, task="Do something useful.")
    """

    def __init__(self, client: AtlasSynapseClient, *, agent_name: str | None = None) -> None:
        self._client = client
        self._agent_name = agent_name or "autogen-team"

    async def run_team(self, team: Any, task: str, **kwargs: Any) -> Any:
        """
        Run an agentchat team and post one trace with the full transcript.
        Returns the original TaskResult (or whatever ``team.run()`` returns).
        """
        start = time.monotonic()
        result = await team.run(task=task, **kwargs)
        elapsed = time.monotonic() - start

        # Extract transcript — TaskResult has .messages list
        messages = getattr(result, "messages", []) or []
        transcript_parts: list[str] = []
        for msg in messages:
            source = getattr(msg, "source", "agent")
            content = getattr(msg, "content", "")
            if content:
                transcript_parts.append(f"[{source}] {content}")

        response = "\n\n".join(transcript_parts)[:50_000] or f"Team run completed in {elapsed:.1f}s"

        try:
            with self._client.trace(agent_name=self._agent_name) as t:
                t.record(
                    prompt=task[:50_000],
                    response=response,
                    platform="autogen",
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post AutoGen team trace: %s", exc)

        return result

    async def run_stream_team(self, team: Any, task: str, **kwargs: Any) -> Any:
        """
        Run an agentchat team via ``run_stream()`` and post one trace when done.
        Yields each message as it arrives then returns the final TaskResult.
        """
        messages_seen: list[Any] = []
        last_result: Any = None

        async for event in team.run_stream(task=task, **kwargs):
            messages_seen.append(event)
            last_result = event
            yield event

        # Post trace after stream completes
        transcript_parts: list[str] = []
        for event in messages_seen:
            source = getattr(event, "source", "agent")
            content = getattr(event, "content", "")
            if content:
                transcript_parts.append(f"[{source}] {content}")

        response = "\n\n".join(transcript_parts)[:50_000]

        try:
            with self._client.trace(agent_name=self._agent_name) as t:
                t.record(
                    prompt=task[:50_000],
                    response=response,
                    platform="autogen",
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post AutoGen stream trace: %s", exc)

        return last_result
