import { describe, it, expect } from "vitest";
import { buildDedupKey } from "../dedup.js";

describe("buildDedupKey", () => {
  it("produces same key for same agentId + category + date", () => {
    const date = new Date("2026-04-16T10:00:00Z");
    const k1 = buildDedupKey("my-bot", "task_failure", date);
    const k2 = buildDedupKey("my-bot", "task_failure", date);
    expect(k1).toBe(k2);
  });

  it("produces different key for different categories", () => {
    const date = new Date("2026-04-16T10:00:00Z");
    const k1 = buildDedupKey("my-bot", "task_failure", date);
    const k2 = buildDedupKey("my-bot", "tool_misuse", date);
    expect(k1).not.toBe(k2);
  });

  it("produces different key for different dates", () => {
    const k1 = buildDedupKey("my-bot", "task_failure", new Date("2026-04-16T10:00:00Z"));
    const k2 = buildDedupKey("my-bot", "task_failure", new Date("2026-04-17T10:00:00Z"));
    expect(k1).not.toBe(k2);
  });

  it("produces different key for different agents", () => {
    const date = new Date("2026-04-16T10:00:00Z");
    const k1 = buildDedupKey("bot-a", "task_failure", date);
    const k2 = buildDedupKey("bot-b", "task_failure", date);
    expect(k1).not.toBe(k2);
  });

  it("key format is agentHash:category:date", () => {
    const date = new Date("2026-04-16T00:00:00Z");
    const key = buildDedupKey("test-agent", "harmful_output", date);
    const parts = key.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(16); // sha256 hex slice
    expect(parts[1]).toBe("harmful_output");
    expect(parts[2]).toBe("2026-04-16");
  });
});
