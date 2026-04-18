import crypto from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function deliverWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<{ status: "delivered" | "failed"; statusCode?: number }> {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AtlasSynapse-Signature": `sha256=${sig}`,
        "X-AtlasSynapse-Event": payload.event,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.ok ? "delivered" : "failed", statusCode: res.status };
  } catch {
    return { status: "failed" };
  }
}
