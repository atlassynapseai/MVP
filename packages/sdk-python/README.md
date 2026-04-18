# atlas-synapse

**HR for Your AI** — monitor AI agents like employees. Automatic trace capture, PII redaction, anomaly detection, and plain-English incident reports.

## Install

```bash
pip install atlas-synapse
# With Anthropic SDK support:
pip install "atlas-synapse[anthropic]"
# With LangChain support:
pip install "atlas-synapse[langchain]"
```

## Quick Start

### Simple API (any framework)

```python
import anthropic
from atlas_synapse import AtlasSynapseClient

atlas = AtlasSynapseClient(
    token="your-project-token",       # from Atlas Synapse dashboard → Connections
    ingest_url="https://your-worker.workers.dev",
    agent_name="my-agent",
)

client = anthropic.Anthropic()

with atlas.trace() as trace:
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": "Hello!"}],
    )
    trace.record(
        prompt="Hello!",
        response=response.content[0].text,
        token_count=response.usage.input_tokens + response.usage.output_tokens,
    )
```

### Anthropic Agent SDK (auto-wrapping)

```python
import anthropic
from atlas_synapse import AtlasSynapseSdk, wrap_agent

sdk = AtlasSynapseSdk(
    project_token="your-project-token",
    ingest_url="https://your-worker.workers.dev",
    agent_name="my-agent",
)

# Assumes Anthropic Agent SDK agent instance
agent = wrap_agent(agent, sdk)
result = agent.run("Do the thing")
```

### LangChain

```python
from langchain_anthropic import ChatAnthropic
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from atlas_synapse import AtlasSynapseClient
from atlas_synapse.langchain import AtlasSynapseCallbackHandler

atlas = AtlasSynapseClient(token="your-token", agent_name="lc-agent")
handler = AtlasSynapseCallbackHandler(atlas)

llm = ChatAnthropic(model="claude-opus-4-5")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, callbacks=[handler])

executor.invoke({"input": "What is the capital of France?"})
```

## What it does

- **PII stripping** — emails, phones, SSNs, cards, addresses, JWTs, and API keys are redacted at the edge before storage
- **Anomaly detection** — Claude evaluates every trace and flags failures, policy violations, and unexpected behavior
- **Plain-English summaries** — incidents are translated into business-readable reports
- **Email + Slack alerts** — notified immediately when critical issues are detected
- **Dashboard** — view all agent activity, incidents, and trends at a glance

## Configuration

| Param | Description |
|-------|-------------|
| `token` | Project token from Atlas Synapse dashboard → Connections |
| `ingest_url` | Edge worker URL (Cloudflare Worker, deployed from this repo) |
| `agent_name` | Display name shown in the dashboard |

## Optional extras

```toml
# pyproject.toml
[project.optional-dependencies]
anthropic = ["anthropic>=0.49"]
langchain = ["langchain-core>=0.2"]
```

## License

MIT
