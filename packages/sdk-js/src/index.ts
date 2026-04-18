/**
 * AtlasSynapse JavaScript/TypeScript SDK.
 *
 * Trace AI agents from Node.js apps, Vercel AI SDK, and plain fetch-based clients.
 *
 * @example Basic usage
 * ```ts
 * import { AtlasSynapseClient } from "@atlas/sdk-js";
 *
 * const atlas = new AtlasSynapseClient({
 *   token: "proj_...",
 *   ingestUrl: "https://atlas-synapse-edge.atlassynapseai.workers.dev/ingest",
 *   agentName: "my-agent",
 * });
 *
 * await atlas.trace({
 *   prompt: "What is the capital of France?",
 *   response: "Paris.",
 *   tokenCount: 42,
 * });
 * ```
 */

export { AtlasSynapseClient, type TraceOptions, type ClientOptions } from "./client.js";
export { wrapVercelAI, type VercelAIWrapOptions } from "./vercel.js";
