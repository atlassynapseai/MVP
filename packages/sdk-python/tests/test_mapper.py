"""Unit tests for the Anthropic SDK → CanonicalTrace mapper."""

import pytest
from atlas_synapse.mapper import map_sdk_events_to_trace, _extract_tool_calls


SAMPLE_MESSAGES = [
    {
        "role": "user",
        "content": "Can you look up the weather in New York and book a table at a restaurant?",
    },
    {
        "role": "assistant",
        "content": [
            {"type": "text", "text": "I'll look up the weather first."},
            {"type": "tool_use", "id": "tu_001", "name": "get_weather", "input": {"city": "New York"}},
        ],
    },
    {
        "role": "user",
        "content": [
            {"type": "tool_result", "tool_use_id": "tu_001", "content": "72°F, sunny"},
        ],
    },
    {
        "role": "assistant",
        "content": [
            {"type": "tool_use", "id": "tu_002", "name": "book_restaurant", "input": {"name": "Le Bernardin", "time": "7pm"}},
        ],
    },
    {
        "role": "user",
        "content": [
            {"type": "tool_result", "tool_use_id": "tu_002", "content": "Reservation confirmed for 7pm"},
        ],
    },
    {
        "role": "assistant",
        "content": "The weather in New York is 72°F and sunny. I've booked a table at Le Bernardin for 7pm!",
    },
]


def test_maps_agent_name_to_agent_id():
    trace = map_sdk_events_to_trace(
        agent_name="my-test-agent",
        session_id="sess_abc123",
        messages=SAMPLE_MESSAGES,
        total_tokens=450,
        total_cost_usd=0.003,
    )
    assert trace.agent_id == "my-test-agent"
    assert trace.external_trace_id == "sess_abc123"


def test_maps_session_id_to_external_trace_id():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_xyz",
        messages=SAMPLE_MESSAGES,
        total_tokens=None,
        total_cost_usd=None,
    )
    assert trace.external_trace_id == "sess_xyz"


def test_extracts_first_user_message_as_prompt():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_001",
        messages=SAMPLE_MESSAGES,
        total_tokens=None,
        total_cost_usd=None,
    )
    assert "weather" in trace.prompt
    assert "New York" in trace.prompt


def test_extracts_last_assistant_text_as_response():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_001",
        messages=SAMPLE_MESSAGES,
        total_tokens=None,
        total_cost_usd=None,
    )
    assert "Le Bernardin" in trace.response
    assert "7pm" in trace.response


def test_extracts_tool_calls():
    tool_calls = _extract_tool_calls(SAMPLE_MESSAGES)
    assert len(tool_calls) == 2
    assert tool_calls[0].name == "get_weather"
    assert tool_calls[0].input == {"city": "New York"}
    assert tool_calls[0].output == "72°F, sunny"
    assert tool_calls[1].name == "book_restaurant"
    assert tool_calls[1].output == "Reservation confirmed for 7pm"


def test_converts_cost_usd_to_cents():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_001",
        messages=SAMPLE_MESSAGES,
        total_tokens=500,
        total_cost_usd=0.0045,
    )
    assert trace.cost_cents == pytest.approx(0.45)
    assert trace.token_count == 500


def test_null_cost_and_tokens_allowed():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_001",
        messages=SAMPLE_MESSAGES,
        total_tokens=None,
        total_cost_usd=None,
    )
    assert trace.token_count is None
    assert trace.cost_cents is None


def test_platform_is_anthropic():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_001",
        messages=SAMPLE_MESSAGES,
        total_tokens=None,
        total_cost_usd=None,
    )
    assert trace.platform == "anthropic"


def test_empty_messages_produce_empty_strings():
    trace = map_sdk_events_to_trace(
        agent_name="agent",
        session_id="sess_empty",
        messages=[],
        total_tokens=None,
        total_cost_usd=None,
    )
    assert trace.prompt == ""
    assert trace.response == ""
    assert trace.tool_calls == []
