"""AtlasSynapse SDK — Anthropic Claude Agent SDK integration."""

from .client import AtlasSynapseSdk
from .hooks import wrap_agent
from .simple import AtlasSynapseClient
from .openai import AsyncAtlasSynapseOpenAI, AtlasSynapseOpenAI

__all__ = [
    "AtlasSynapseSdk",
    "AtlasSynapseClient",
    "wrap_agent",
    "AtlasSynapseOpenAI",
    "AsyncAtlasSynapseOpenAI",
    # Lazy-import integrations: atlas_synapse.crewai, atlas_synapse.langchain, atlas_synapse.llamaindex
]
