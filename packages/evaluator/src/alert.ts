interface IncidentData {
  id: string;
  severity: "warning" | "critical";
  category: string;
  summary: string;
  agentName: string;
}

interface AlertResult {
  status: "sent" | "failed";
  error?: string;
}

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "alerts@atlassynapse.com";
const FROM_NAME = process.env.BREVO_FROM_NAME ?? "Atlas Synapse";
const DASHBOARD_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.atlassynapse.com";
const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Escape HTML entities in user-controlled strings before rendering them
 * in an HTML email body. Agent names, evaluator-produced alertCopy, and
 * any other LLM- or ingest-sourced text must flow through this.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Allow only known-safe URL schemes for the incident link. Our generated
 * URL is always https://<app>/dashboard/..., but if NEXT_PUBLIC_APP_URL
 * were ever tampered with we do not want `javascript:` or `data:` to slip
 * through into an <a href> attribute in the email body.
 */
function safeHref(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return escapeHtml(u.toString());
    }
  } catch {
    /* fallthrough */
  }
  return "#";
}

/**
 * Send an immediate email alert for a new incident via Brevo REST API.
 * Returns {status: "sent"} on success, {status: "failed", error} on failure.
 * Never throws — caller always writes Alert row regardless of outcome.
 */
export async function sendImmediateAlert(
  incident: IncidentData,
  toEmail: string,
  alertCopy: string,
): Promise<AlertResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { status: "failed", error: "BREVO_API_KEY not configured" };
  }

  // Severity label is a constant string (not user-controlled) — safe.
  const severityLabel = incident.severity === "critical" ? "🔴 Critical" : "🟡 Warning";
  // Subject is plain text; strip control chars + CR/LF to prevent header injection.
  const safeAgentNameText = incident.agentName.replace(/[\r\n\t]/g, " ").slice(0, 200);
  const subject = `[AtlasSynapse] ${severityLabel} — ${safeAgentNameText}`;

  // HTML-escape everything that flows from user input or the LLM before
  // interpolating into the email body.
  const safeAgentName = escapeHtml(safeAgentNameText);
  const safeAlertCopy = escapeHtml(alertCopy);
  const safeIncidentHref = safeHref(
    `${DASHBOARD_BASE_URL}/dashboard/incidents/${encodeURIComponent(incident.id)}`,
  );
  const safeSettingsHref = safeHref(`${DASHBOARD_BASE_URL}/dashboard/settings`);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="margin: 0 0 8px;">${severityLabel} Incident Detected</h2>
  <p style="color: #666; margin: 0 0 24px;">Agent: <strong>${safeAgentName}</strong></p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; line-height: 1.6;">${safeAlertCopy}</p>
  </div>
  <a href="${safeIncidentHref}"
     style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px;
            border-radius: 6px; text-decoration: none; font-weight: 600;">
    View Incident
  </a>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    AtlasSynapse — HR for Your AI<br>
    <a href="${safeSettingsHref}" style="color: #999;">Manage alert preferences</a>
  </p>
</body>
</html>`;

  try {
    const res = await fetch(BREVO_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "failed", error: `Brevo ${res.status}: ${text.slice(0, 200)}` };
    }
    return { status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "failed", error: message };
  }
}

/**
 * Send a Slack alert via an incoming webhook URL.
 * Returns {status: "sent"} on success, {status: "failed", error} on failure.
 * Never throws.
 */
export async function sendSlackAlert(
  incident: IncidentData,
  webhookUrl: string,
): Promise<AlertResult> {
  const severityEmoji = incident.severity === "critical" ? "🔴" : "🟡";
  const incidentUrl = `${DASHBOARD_BASE_URL}/dashboard/incidents/${encodeURIComponent(incident.id)}`;

  // Slack mrkdwn — escape & < > only (no HTML)
  const safeAgentName = incident.agentName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSummary = incident.summary.slice(0, 500).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const body = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${severityEmoji} ${incident.severity === "critical" ? "Critical" : "Warning"} — ${incident.category}`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Agent*\n${safeAgentName}` },
          { type: "mrkdwn", text: `*Severity*\n${incident.severity}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: safeSummary },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Incident" },
            url: incidentUrl,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "failed", error: `Slack ${res.status}: ${text.slice(0, 200)}` };
    }
    return { status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "failed", error: message };
  }
}
