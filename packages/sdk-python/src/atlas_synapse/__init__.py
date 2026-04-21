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
    # Lazy-import integrations:
    # atlas_synapse.crewai      — CrewAI
    # atlas_synapse.langchain   — LangChain
    # atlas_synapse.llamaindex  — LlamaIndex
    # atlas_synapse.autogen     — Microsoft AutoGen (0.2.x + 0.4+)
]
