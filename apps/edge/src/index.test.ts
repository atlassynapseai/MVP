import { describe, it, expect } from "vitest";
import { piiStrip } from "@atlas/shared";

// Unit test: piiStrip is invoked before forwarding
describe("edge ingest", () => {
  it("piiStrip removes email from prompt before forward", () => {
    const prompt = "user email is test@example.com please help";
    const stripped = piiStrip(prompt);
    expect(stripped).not.toContain("test@example.com");
    expect(stripped).toContain("[EMAIL]");
  });

  it("piiStrip removes phone before forward", () => {
    const response = "call back at 555-987-6543";
    const stripped = piiStrip(response);
    expect(stripped).not.toContain("555-987-6543");
    expect(stripped).toContain("[PHONE]");
  });

  it("piiStrip removes SSN", () => {
    const text = "ssn 123-45-6789 on file";
    expect(piiStrip(text)).toContain("[SSN]");
  });
});
