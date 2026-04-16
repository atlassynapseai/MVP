import { describe, it, expect } from "vitest";
import { sign, verify, signWithTimestamp, verifyWithTimestamp } from "./hmac.js";

describe("hmac", () => {
  it("sign → verify round-trip", async () => {
    const sig = await sign("hello", "secret");
    expect(await verify("hello", sig, "secret")).toBe(true);
  });
  it("tampered payload fails verify", async () => {
    const sig = await sign("hello", "secret");
    expect(await verify("world", sig, "secret")).toBe(false);
  });
  it("wrong secret fails verify", async () => {
    const sig = await sign("hello", "secret");
    expect(await verify("hello", sig, "wrong")).toBe(false);
  });

  it("timingSafeEqual-based verify rejects tampered signature", async () => {
    const sig = await sign("hello", "secret");
    // Flip last hex char
    const tampered = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(await verify("hello", tampered, "secret")).toBe(false);
  });

  it("verify handles malformed hex gracefully", async () => {
    expect(await verify("hello", "not-valid-hex!!!", "secret")).toBe(false);
  });
});

describe("signWithTimestamp / verifyWithTimestamp", () => {
  it("round-trip succeeds within skew window", async () => {
    const { sig, ts } = await signWithTimestamp("payload", "secret");
    expect(await verifyWithTimestamp("payload", sig, ts, "secret")).toBe(true);
  });

  it("fails with wrong secret", async () => {
    const { sig, ts } = await signWithTimestamp("payload", "secret");
    expect(await verifyWithTimestamp("payload", sig, ts, "wrong")).toBe(false);
  });

  it("fails when timestamp is outside skew window", async () => {
    const { sig, ts } = await signWithTimestamp("payload", "secret");
    const oldTs = ts - 600_000; // 10 minutes ago — beyond default 5 min skew
    expect(await verifyWithTimestamp("payload", sig, oldTs, "secret")).toBe(false);
  });

  it("fails with tampered payload", async () => {
    const { sig, ts } = await signWithTimestamp("payload", "secret");
    expect(await verifyWithTimestamp("tampered", sig, ts, "secret")).toBe(false);
  });
});
