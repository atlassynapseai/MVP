/**
 * Atlas Synapse — Zapier Integration
 *
 * Provides one Action: "Send Agent Trace"
 * User maps their AI agent's input/output fields → Atlas Synapse monitors them.
 */

const { version } = require("./package.json");
const { version: platformVersion } = require("zapier-platform-core");

const WEBHOOK_URL = "https://atlassynapseai.com/MVP/api/webhooks/zapier";

// ── Authentication ────────────────────────────────────────────────────────────
// Users authenticate with their Atlas Synapse project token.

const authentication = {
  type: "custom",
  test: {
    url: `${WEBHOOK_URL}/test`,
    method: "POST",
    body: {
      token: "{{bundle.authData.project_token}}",
      agent_name: "_zapier_auth_test",
      input: "auth-test",
      output: "ok",
      trace_id: "zapier-auth-test-{{bundle.meta.zap.id}}",
    },
    removeMissingValuesFrom: { body: false },
  },
  fields: [
    {
      key: "project_token",
      label: "Project Token",
      required: true,
      type: "password",
      helpText:
        "Find your project token in Atlas Synapse → Dashboard → Connections. " +
        "It starts with `proj_`.",
    },
  ],
};

// ── Action: Send Agent Trace ──────────────────────────────────────────────────

const sendTrace = {
  key: "send_trace",
  noun: "Trace",

  display: {
    label: "Send Agent Trace",
    description:
      "Send an AI agent interaction (input + output) to Atlas Synapse for monitoring, " +
      "evaluation, and incident detection. Trigger this after each AI response in your Zap.",
  },

  operation: {
    inputFields: [
      {
        key: "agent_name",
        label: "Agent Name",
        type: "string",
        required: true,
        helpText:
          "A unique name for this AI agent (e.g. 'Customer Support Bot', 'Scheduling Agent'). " +
          "All traces with the same name are grouped together in Atlas Synapse.",
      },
      {
        key: "input",
        label: "Agent Input (Prompt)",
        type: "text",
        required: true,
        helpText:
          "The message or prompt that was sent to your AI agent. " +
          "Map this to the field in your Zap that contains the user's question or task.",
      },
      {
        key: "output",
        label: "Agent Output (Response)",
        type: "text",
        required: true,
        helpText:
          "The response your AI agent produced. " +
          "Map this to the field in your Zap that contains the AI's reply.",
      },
      {
        key: "trace_id",
        label: "Trace ID (optional)",
        type: "string",
        required: false,
        helpText:
          "A unique ID for this interaction (e.g. a Zap run ID or your own reference). " +
          "Used for deduplication. Leave blank to auto-generate.",
      },
      {
        key: "token_count",
        label: "Token Count (optional)",
        type: "integer",
        required: false,
        helpText: "Number of tokens used by this AI call, if available.",
      },
    ],

    perform: {
      url: WEBHOOK_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: {
        token: "{{bundle.authData.project_token}}",
        agent_name: "{{bundle.inputData.agent_name}}",
        input: "{{bundle.inputData.input}}",
        output: "{{bundle.inputData.output}}",
        trace_id: "{{bundle.inputData.trace_id}}",
        token_count: "{{bundle.inputData.token_count}}",
        platform: "zapier",
        timestamp: "{{bundle.meta.isBulkRead ? '' : ''}}",
      },
      removeMissingValuesFrom: { body: true },
    },

    sample: {
      ok: true,
      trace_id: "zapier-sample-001",
    },
  },
};

// ── App definition ────────────────────────────────────────────────────────────

module.exports = {
  version,
  platformVersion,

  authentication,

  creates: {
    [sendTrace.key]: sendTrace,
  },

  beforeRequest: [],
  afterResponse: [],
};
