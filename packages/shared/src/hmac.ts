import { timingSafeEqual } from "node:crypto";

export async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Buffer.from(sig).toString("hex");
}

export async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret);
  let expectedBuf: Buffer;
  let signatureBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    signatureBuf = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function signWithTimestamp(
  payload: string,
  secret: string
): Promise<{ sig: string; ts: number }> {
  const ts = Date.now();
  const sig = await sign(`${ts}.${payload}`, secret);
  return { sig, ts };
}

export async function verifyWithTimestamp(
  payload: string,
  sig: string,
  ts: number,
  secret: string,
  maxSkewMs = 300_000
): Promise<boolean> {
  const now = Date.now();
  if (Math.abs(now - ts) > maxSkewMs) return false;
  return verify(`${ts}.${payload}`, sig, secret);
}
