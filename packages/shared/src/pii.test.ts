import { describe, it, expect } from "vitest";
import { piiStrip } from "./pii.js";

describe("piiStrip", () => {
  it("redacts email", () => {
    expect(piiStrip("contact user@example.com for help")).toBe("contact [EMAIL] for help");
  });
  it("leaves non-email untouched", () => {
    expect(piiStrip("no email here")).toBe("no email here");
  });

  it("redacts phone US format", () => {
    expect(piiStrip("call 555-123-4567 now")).toBe("call [PHONE] now");
  });
  it("redacts phone parens format", () => {
    expect(piiStrip("(555) 123-4567")).toBe("[PHONE]");
  });
  it("leaves non-phone untouched", () => {
    expect(piiStrip("order #12345")).toBe("order #12345");
  });

  it("redacts SSN", () => {
    expect(piiStrip("SSN is 123-45-6789")).toBe("SSN is [SSN]");
  });
  it("leaves partial SSN-like untouched", () => {
    expect(piiStrip("12-345")).toBe("12-345");
  });

  it("redacts 16-digit card (Luhn-valid)", () => {
    // 4111111111111111 is a well-known Luhn-valid Visa test number
    expect(piiStrip("card 4111111111111111 declined")).toBe("card [CARD] declined");
  });

  it("does NOT redact Luhn-invalid 16-digit number", () => {
    // 1234567890123456 fails Luhn
    expect(piiStrip("number 1234567890123456 here")).toBe("number 1234567890123456 here");
  });

  it("redacts street address", () => {
    expect(piiStrip("lives at 123 Main St")).toBe("lives at [ADDRESS]");
  });

  it("redacts multiple PII types in one string", () => {
    const input = "email user@x.com phone 555-123-4567 ssn 123-45-6789";
    const out = piiStrip(input);
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[PHONE]");
    expect(out).toContain("[SSN]");
  });

  it("redacts JWT token", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(piiStrip(`token is ${jwt} here`)).toBe("token is [JWT] here");
  });

  it("redacts OpenAI API key", () => {
    const key = "sk-abcdefghijklmnopqrstu";
    expect(piiStrip(`key: ${key}`)).toBe("key: [API_KEY]");
  });

  it("redacts GitHub personal access token", () => {
    const key = "ghp_" + "A".repeat(36);
    expect(piiStrip(`token ${key} used`)).toBe("token [API_KEY] used");
  });

  it("redacts AWS access key", () => {
    const key = "AKIA" + "A".repeat(16);
    expect(piiStrip(`aws key ${key} found`)).toBe("aws key [API_KEY] found");
  });
});
