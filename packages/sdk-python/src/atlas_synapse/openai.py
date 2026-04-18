"""OpenAI SDK integration for AtlasSynapse.

Wraps the OpenAI client to automatically capture traces from chat completions.

Usage::

    from openai import OpenAI
    from atlas_synapse.openai import AtlasSynapseOpenAI

    client = AtlasSynapseOpenAI(
        atlas_token="proj_...",
        atlas_ingest_url="https://...",
        atlas_agent_name="my-openai-agent",
        # All other OpenAI client kwargs passed through
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello!"}],
    )
    # Trace automatically sent to AtlasSynapse

Async usage::

    from atlas_synapse.openai import AsyncAtlasSynapseOpenAI

    client = AsyncAtlasSynapseOpenAI(
        atlas_token="proj_...",
        atlas_ingest_url="https://...",
        atlas_agent_name="my-openai-agent",
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello!"}],
    )
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from .simple import AtlasSynapseClient

logger = logging.getLogger(__name__)

try:
    import openai as _openai_module

    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False


def _require_openai() -> None:
    if not _OPENAI_AVAILABLE:
        raise ImportError(
            "openai is required: pip install 'atlas-synapse[openai]'"
        )


def _extract_prompt(messages: list[dict[str, Any]]) -> str:
    """Return the content of the last user message, falling back to all messages."""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, str):
                return content[:50_000]
            # content can be a list of content parts (vision etc.)
            if isinstance(content, list):
                texts = [
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                ]
                return " ".join(texts)[:50_000]
    # Fallback: stringify the whole messages list
    return str(messages)[:50_000]


def _extract_response(response: Any) -> str:
    """Return the text of the first choice message."""
    try:
        return str(response.choices[0].message.content or "")[:50_000]
    except (AttributeError, IndexError):
        return ""


def _extract_token_count(response: Any) -> int | None:
    """Return total_tokens from response.usage, or None if unavailable."""
    try:
        usage = response.usage
        if usage is not None:
            return int(usage.total_tokens)
    except (AttributeError, TypeError, ValueError):
        pass
    return None


# ---------------------------------------------------------------------------
# Sync wrappers
# ---------------------------------------------------------------------------


class _WrappedCompletions:
    """Wraps ``openai.resources.chat.Completions`` to intercept ``create``."""

    def __init__(
        self,
        completions: Any,
        atlas_client: AtlasSynapseClient,
        agent_name: str,
    ) -> None:
        self._completions = completions
        self._atlas = atlas_client
        self._agent_name = agent_name

    def create(self, **kwargs: Any) -> Any:
        """Call the real ``Completions.create`` and post a trace on success."""
        response = self._completions.create(**kwargs)
        messages: list[dict[str, Any]] = kwargs.get("messages", [])
        prompt = _extract_prompt(messages)
        reply = _extract_response(response)
        token_count = _extract_token_count(response)

        try:
            with self._atlas.trace(agent_name=self._agent_name) as trace:
                trace.record(
                    prompt=prompt,
                    response=reply,
                    token_count=token_count,
                    platform="openai",
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post trace: %s", exc)

        return response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._completions, name)


class _WrappedChat:
    """Wraps the ``chat`` resource so ``chat.completions`` is intercepted."""

    def __init__(
        self,
        chat: Any,
        atlas_client: AtlasSynapseClient,
        agent_name: str,
    ) -> None:
        self._chat = chat
        self.completions = _WrappedCompletions(
            chat.completions, atlas_client, agent_name
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self._chat, name)


# ---------------------------------------------------------------------------
# Async wrappers
# ---------------------------------------------------------------------------


class _AsyncWrappedCompletions:
    """Wraps ``openai.resources.chat.AsyncCompletions`` to intercept ``create``."""

    def __init__(
        self,
        completions: Any,
        atlas_client: AtlasSynapseClient,
        agent_name: str,
    ) -> None:
        self._completions = completions
        self._atlas = atlas_client
        self._agent_name = agent_name

    async def create(self, **kwargs: Any) -> Any:
        """Call the real async ``Completions.create`` and post a trace."""
        response = await self._completions.create(**kwargs)
        messages: list[dict[str, Any]] = kwargs.get("messages", [])
        prompt = _extract_prompt(messages)
        reply = _extract_response(response)
        token_count = _extract_token_count(response)

        try:
            # post_trace is synchronous (httpx.Client); run in a thread to
            # avoid blocking the event loop.
            await asyncio.to_thread(
                self._post_trace_sync, prompt, reply, token_count
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post trace: %s", exc)

        return response

    def _post_trace_sync(
        self,
        prompt: str,
        reply: str,
        token_count: int | None,
    ) -> None:
        with self._atlas.trace(agent_name=self._agent_name) as trace:
            trace.record(
                prompt=prompt,
                response=reply,
                token_count=token_count,
                platform="openai",
            )

    def __getattr__(self, name: str) -> Any:
        return getattr(self._completions, name)


class _AsyncWrappedChat:
    """Wraps the async ``chat`` resource so ``chat.completions`` is intercepted."""

    def __init__(
        self,
        chat: Any,
        atlas_client: AtlasSynapseClient,
        agent_name: str,
    ) -> None:
        self._chat = chat
        self.completions = _AsyncWrappedCompletions(
            chat.completions, atlas_client, agent_name
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self._chat, name)


# ---------------------------------------------------------------------------
# Public client classes
# ---------------------------------------------------------------------------


class AtlasSynapseOpenAI:
    """
    Drop-in wrapper around ``openai.OpenAI`` that auto-posts traces to AtlasSynapse.

    All constructor kwargs except the three ``atlas_*`` ones are forwarded
    directly to ``openai.OpenAI``.

    Example::

        client = AtlasSynapseOpenAI(
            atlas_token="proj_...",
            atlas_ingest_url="https://my-worker.workers.dev",
            atlas_agent_name="support-bot",
            api_key="sk-...",      # forwarded to OpenAI
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Hello!"}],
        )
    """

    def __init__(
        self,
        *,
        atlas_token: str,
        atlas_ingest_url: str = "https://atlas-edge.atlas-synapse.workers.dev",
        atlas_agent_name: str = "default-agent",
        atlas_timeout: float = 10.0,
        **openai_kwargs: Any,
    ) -> None:
        _require_openai()
        self._atlas = AtlasSynapseClient(
            token=atlas_token,
            ingest_url=atlas_ingest_url,
            agent_name=atlas_agent_name,
            timeout=atlas_timeout,
        )
        self._client: Any = _openai_module.OpenAI(**openai_kwargs)
        self.chat = _WrappedChat(
            self._client.chat, self._atlas, atlas_agent_name
        )

    def __getattr__(self, name: str) -> Any:
        # Delegate anything else (models, embeddings, etc.) to the real client
        return getattr(self._client, name)

    def close(self) -> None:
        self._atlas.close()
        self._client.close()

    def __enter__(self) -> AtlasSynapseOpenAI:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


class AsyncAtlasSynapseOpenAI:
    """
    Drop-in async wrapper around ``openai.AsyncOpenAI`` that auto-posts traces.

    All constructor kwargs except the three ``atlas_*`` ones are forwarded
    directly to ``openai.AsyncOpenAI``.

    Example::

        client = AsyncAtlasSynapseOpenAI(
            atlas_token="proj_...",
            atlas_ingest_url="https://my-worker.workers.dev",
            atlas_agent_name="support-bot",
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Hello!"}],
        )
    """

    def __init__(
        self,
        *,
        atlas_token: str,
        atlas_ingest_url: str = "https://atlas-edge.atlas-synapse.workers.dev",
        atlas_agent_name: str = "default-agent",
        atlas_timeout: float = 10.0,
        **openai_kwargs: Any,
    ) -> None:
        _require_openai()
        self._atlas = AtlasSynapseClient(
            token=atlas_token,
            ingest_url=atlas_ingest_url,
            agent_name=atlas_agent_name,
            timeout=atlas_timeout,
        )
        self._client: Any = _openai_module.AsyncOpenAI(**openai_kwargs)
        self.chat = _AsyncWrappedChat(
            self._client.chat, self._atlas, atlas_agent_name
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)

    async def aclose(self) -> None:
        self._atlas.close()
        await self._client.close()

    async def __aenter__(self) -> AsyncAtlasSynapseOpenAI:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()
