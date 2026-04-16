import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock must be hoisted before any imports that use the module
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(() => ({
    messages: { create: mockCreate },
  }));
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return { default: MockAnthropic };
});

import { evaluateTrace } from "../evaluate.js";
import Anthropic from "@anthropic-ai/sdk";

function getMockCreate() {
  // Access the shared mockCreate via the constructor mock
  const instance = new (Anthropic as unknown as new () => { messages: { create: ReturnType<typeof vi.fn> } })();
  return instance.messages.create as ReturnType<typeof vi.fn>;
}

const makeTrace = () => ({
  redactedPrompt: "Can you help me cancel my subscription?",
  redactedResponse: "I have processed your cancellation request.",
  toolCalls: [] as Array<{ name: string; input: Record<string, unknown>; output?: unknown }>,
});

function makeClientWithResponse(text: string) {
  const mockCreate = getMockCreate();
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text }],
  });
  return new (Anthropic as unknown as new () => import("@anthropic-ai/sdk").default)() as unknown as import("@anthropic-ai/sdk").default;
}

describe("evaluateTrace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pass result", async () => {
    const client = makeClientWithResponse(JSON.stringify({
      outcome: "pass",
      category: null,
      confidence: 0.95,
      businessImpact: "The agent successfully completed the subscription cancellation.",
      technicalReason: "All tool calls succeeded and response was coherent.",
    }));

    const result = await evaluateTrace(makeTrace(), client);

    expect(result.outcome).toBe("pass");
    expect(result.category).toBeNull();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.model).toBe("claude-sonnet-4-5");
  });

  it("returns failure result with valid category", async () => {
    const client = makeClientWithResponse(JSON.stringify({
      outcome: "failure",
      category: "task_failure",
      confidence: 0.88,
      businessImpact: "The agent failed to cancel the subscription.",
      technicalReason: "Tool call to cancel_subscription returned a 404 error.",
    }));

    const result = await evaluateTrace(makeTrace(), client);

    expect(result.outcome).toBe("failure");
    expect(result.category).toBe("task_failure");
    expect(result.confidence).toBe(0.88);
  });

  it("clamps confidence above 1.0 to 1.0", async () => {
    const client = makeClientWithResponse(JSON.stringify({
      outcome: "pass",
      category: null,
      confidence: 1.5,
      businessImpact: "Pass.",
      technicalReason: "All good.",
    }));

    const result = await evaluateTrace(makeTrace(), client);
    expect(result.confidence).toBe(1);
  });

  it("clamps confidence below 0 to 0", async () => {
    const client = makeClientWithResponse(JSON.stringify({
      outcome: "pass",
      category: null,
      confidence: -0.3,
      businessImpact: "Pass.",
      technicalReason: "All good.",
    }));

    const result = await evaluateTrace(makeTrace(), client);
    expect(result.confidence).toBe(0);
  });

  it("strips markdown code fences from response", async () => {
    const json = JSON.stringify({
      outcome: "pass",
      category: null,
      confidence: 0.9,
      businessImpact: "Task completed successfully.",
      technicalReason: "No errors detected.",
    });
    const client = makeClientWithResponse("```json\n" + json + "\n```");

    const result = await evaluateTrace(makeTrace(), client);
    expect(result.outcome).toBe("pass");
  });

  it("throws on invalid category for failure outcome", async () => {
    const client = makeClientWithResponse(JSON.stringify({
      outcome: "failure",
      category: "invented_category",
      confidence: 0.8,
      businessImpact: "Something went wrong.",
      technicalReason: "Technical details.",
    }));

    await expect(evaluateTrace(makeTrace(), client)).rejects.toThrow("Invalid category");
  });

  it("accepts all 8 valid incident categories", async () => {
    const categories = [
      "task_failure", "harmful_output", "tool_misuse", "scope_violation",
      "data_handling_error", "reasoning_error", "cost_anomaly", "silent_refusal",
    ];

    for (const category of categories) {
      const client = makeClientWithResponse(JSON.stringify({
        outcome: "failure",
        category,
        confidence: 0.8,
        businessImpact: "Business impact.",
        technicalReason: "Technical reason.",
      }));

      const result = await evaluateTrace(makeTrace(), client);
      expect(result.category).toBe(category);
    }
  });
});
