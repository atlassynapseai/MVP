import { sign } from "@atlas/shared";

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
}

export interface TraceOptions {
  /** The prompt / user input sent to the agent. */
  prompt: string;
  /** The agent's response. */
  response: string;
  /** Total token count for the interaction (optional). */
  tokenCount?: number | null;
  /** Tool calls made during the interaction (optional). */
  toolCalls?: ToolCall[];
  /** Override the agent name set at client construction time. */
  agentName?: string;
  /** Platform identifier (e.g. "vercel-ai", "openai", "anthropic"). Defaults to "js". */
  platform?: string;
  /** Timestamp of the trace. Defaults to now. */
  timestamp?: Date;
}

export interface ClientOptions {
  /** Project token (proj_...) */
  token: string;
  /** Ingest endpoint URL. Defaults to the Cloudflare worker. */
  ingestUrl?: string;
  /** Default agent name for all traces posted by this client. */
  agentName?: string;
}

const DEFAULT_INGEST_URL = "https://atlas-synapse-edge.atlassynapseai.workers.dev/ingest";

/**
 * Lightweight AtlasSynapse client for Node.js / edge runtimes.
 * Zero dependencies beyond the standard `fetch` API (Node 18+).
 */
export class AtlasSynapseClient {
  private readonly token: string;
  private readonly ingestUrl: string;
  private readonly defaultAgentName: string;

  constructor(options: ClientOptions) {
    this.token = options.token;
    this.ingestUrl = options.ingestUrl ?? DEFAULT_INGEST_URL;
    this.defaultAgentName = options.agentName ?? "unknown-agent";
  }

  /**
   * Post a single trace to AtlasSynapse.
   * Fire-and-forget — never throws (logs warnings on failure).
   */
  async trace(options: TraceOptions): Promise<void> {
    const agentName = options.agentName ?? this.defaultAgentName;
    const timestamp = options.timestamp ?? new Date();

    const payload = {
      agentId: agentName,
      traceId: globalThis.crypto.randomUUID(),
      timestamp: timestamp.toISOString(),
      prompt: options.prompt,
      response: options.response,
      tokenCount: options.tokenCount ?? null,
      toolCalls: options.toolCalls ?? [],
      platform: options.platform ?? "js",
    };

    try {
      const body = JSON.stringify(payload);
      const signature = await sign(body, this.token);

      const res = await fetch(this.ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AtlasSynapse-Signature": signature,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(`[AtlasSynapse] ingest failed (${res.status}): ${text.slice(0, 200)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AtlasSynapse] failed to post trace: ${msg}`);
    }
  }
}
