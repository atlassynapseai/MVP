import { describe, it, expect } from "vitest";
import { sign, verify } from "./hmac.js";

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
});
