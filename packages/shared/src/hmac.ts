function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

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
  return toHex(sig);
}

export async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret);
  try {
    return safeEqual(hexToBytes(expected), hexToBytes(signature));
  } catch {
    return false;
  }
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
