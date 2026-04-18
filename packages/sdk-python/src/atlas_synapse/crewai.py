"""
CrewAI integration for AtlasSynapse.

Wraps a CrewAI Crew to automatically capture agent run traces.

Usage::

    from crewai import Crew, Agent, Task
    from atlas_synapse import AtlasSynapseClient
    from atlas_synapse.crewai import AtlasSynapseCrewObserver

    atlas = AtlasSynapseClient(token="proj_...", agent_name="my-crew")
    observer = AtlasSynapseCrewObserver(atlas)

    my_crew = Crew(agents=[...], tasks=[...])
    observer.wrap(my_crew)

    result = my_crew.kickoff()
    # One trace per task execution posted to AtlasSynapse

Or use the convenience wrapper that captures the full kickoff as one trace::

    from atlas_synapse.crewai import wrap_crew

    wrapped_crew = wrap_crew(my_crew, atlas)
    result = wrapped_crew.kickoff()
"""

from __future__ import annotations

import logging
import time
from typing import Any

from .simple import AtlasSynapseClient

logger = logging.getLogger(__name__)

try:
    from crewai.utilities.events.base_event_listener import BaseEventListener
    import crewai.utilities.events as _crew_events
    _CREWAI_AVAILABLE = True
except ImportError:
    _CREWAI_AVAILABLE = False

    class BaseEventListener:  # type: ignore[no-redef]
        """Fallback stub so the class definition does not fail at import."""
        pass


class AtlasSynapseCrewObserver(BaseEventListener):
    """
    CrewAI event listener that reports task completions to AtlasSynapse.

    Attach via ``observer.wrap(crew)`` — one trace per completed task.
    """

    def __init__(self, client: AtlasSynapseClient, *, agent_name: str | None = None) -> None:
        if not _CREWAI_AVAILABLE:
            raise ImportError(
                "crewai is required: pip install 'atlas-synapse[crewai]'"
            )
        super().__init__()
        self._client = client
        self._agent_name = agent_name
        self._task_starts: dict[str, tuple[str, float]] = {}  # task_id → (description, start_time)

    # ── CrewAI event hooks ─────────────────────────────────────────────────

    def setup_listeners(self, crewai_event_bus: Any) -> None:
        try:
            @crewai_event_bus.on(_crew_events.TaskStartedEvent)
            def on_task_started(source: Any, event: Any) -> None:
                task_id = str(getattr(event, "task_id", id(event)))
                description = str(getattr(event, "task", {}).get("description", ""))[:50_000]
                self._task_starts[task_id] = (description, time.monotonic())

            @crewai_event_bus.on(_crew_events.TaskCompletedEvent)
            def on_task_completed(source: Any, event: Any) -> None:
                task_id = str(getattr(event, "task_id", id(event)))
                output = str(getattr(event, "output", ""))[:50_000]
                description, start = self._task_starts.pop(task_id, ("", time.monotonic()))
                elapsed = time.monotonic() - start
                agent_name = str(getattr(event, "agent", {}).get("role", self._agent_name or "crewai-agent"))
                try:
                    with self._client.trace(agent_name=self._agent_name or agent_name) as trace:
                        trace.record(
                            prompt=description or f"Task (elapsed {elapsed:.1f}s)",
                            response=output,
                            platform="crewai",
                        )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("AtlasSynapse: failed to post CrewAI trace: %s", exc)
        except Exception:  # noqa: BLE001
            logger.warning("AtlasSynapse: could not attach CrewAI event listeners")

    def wrap(self, crew: Any) -> None:
        """Register this observer on a Crew instance."""
        if hasattr(crew, "_listeners"):
            crew._listeners.append(self)
        else:
            logger.warning(
                "AtlasSynapse: Crew instance has no _listeners — event hooks may not fire. "
                "Check your crewai version."
            )


class _KickoffWrapper:
    """Thin wrapper that posts one trace for an entire crew.kickoff() call."""

    def __init__(self, crew: Any, client: AtlasSynapseClient, agent_name: str | None) -> None:
        self._crew = crew
        self._client = client
        self._agent_name = agent_name

    def kickoff(self, inputs: dict[str, Any] | None = None) -> Any:
        prompt = f"Crew kickoff" + (f" — inputs: {list((inputs or {}).keys())}" if inputs else "")
        start = time.monotonic()
        result = self._crew.kickoff(inputs=inputs)
        elapsed = time.monotonic() - start
        try:
            with self._client.trace(agent_name=self._agent_name) as trace:
                trace.record(
                    prompt=prompt,
                    response=str(result)[:50_000],
                    platform="crewai",
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AtlasSynapse: failed to post CrewAI kickoff trace: %s", exc)
        return result

    def __getattr__(self, name: str) -> Any:
        return getattr(self._crew, name)


def wrap_crew(crew: Any, client: AtlasSynapseClient, *, agent_name: str | None = None) -> _KickoffWrapper:
    """
    Wrap a CrewAI ``Crew`` so that each ``kickoff()`` posts one trace.

    Returns a thin wrapper with the same ``kickoff()`` interface.
    """
    if not _CREWAI_AVAILABLE:
        raise ImportError("crewai is required: pip install 'atlas-synapse[crewai]'")
    return _KickoffWrapper(crew, client, agent_name)
