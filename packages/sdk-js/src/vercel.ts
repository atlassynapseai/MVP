/**
 * Vercel AI SDK integration for AtlasSynapse.
 *
 * Wraps the Vercel AI SDK `streamText` / `generateText` calls to
 * automatically capture traces.
 *
 * @example
 * ```ts
 * import { openai } from "@ai-sdk/openai";
 * import { generateText } from "ai";
 * import { AtlasSynapseClient, wrapVercelAI } from "@atlas/sdk-js";
 *
 * const atlas = new AtlasSynapseClient({ token: "proj_...", agentName: "my-ai-agent" });
 *
 * const { text, usage } = await wrapVercelAI(atlas, () =>
 *   generateText({
 *     model: openai("gpt-4o"),
 *     prompt: "What is the capital of France?",
 *   }),
 *   { prompt: "What is the capital of France?" }
 * );
 * ```
 *
 * Or use the experimental `onFinish` approach with `streamText`:
 * ```ts
 * const stream = streamText({
 *   model: openai("gpt-4o"),
 *   prompt: "Tell me a joke",
 *   onFinish: atlas.vercelOnFinish({ prompt: "Tell me a joke" }),
 * });
 * ```
 */

import type { AtlasSynapseClient } from "./client.js";

export interface VercelAIWrapOptions {
  /** The prompt string sent to the model. */
  prompt: string;
  /** Override the agent name for this trace. */
  agentName?: string;
}

/** Result shape expected from Vercel AI SDK `generateText`. */
interface GenerateResult {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: Array<{
    toolName: string;
    args: unknown;
    result?: unknown;
  }>;
}

/**
 * Wrap any Vercel AI SDK call (generateText / streamText + .fullStream).
 * Executes `fn`, posts the result as a trace, then returns the result.
 *
 * Fire-and-forget trace — never throws on AtlasSynapse errors.
 */
export async function wrapVercelAI<T extends GenerateResult>(
  client: AtlasSynapseClient,
  fn: () => Promise<T>,
  options: VercelAIWrapOptions,
): Promise<T> {
  const result = await fn();

  const toolCalls = (result.toolCalls ?? []).map((tc) => ({
    name: tc.toolName,
    input: typeof tc.args === "object" && tc.args !== null
      ? (tc.args as Record<string, unknown>)
      : { args: tc.args },
    output: tc.result,
  }));

  const tokenCount =
    result.usage?.totalTokens ??
    ((result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0)) || null;

  await client.trace({
    prompt: options.prompt,
    response: result.text,
    tokenCount,
    toolCalls,
    agentName: options.agentName,
    platform: "vercel-ai",
  });

  return result;
}

/** Shape returned by streamText `onFinish`. */
interface StreamFinishEvent {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: Array<{
    toolName: string;
    args: unknown;
    result?: unknown;
  }>;
}

/**
 * Returns an `onFinish` callback suitable for Vercel AI SDK `streamText`.
 *
 * @example
 * ```ts
 * const stream = streamText({
 *   model: openai("gpt-4o"),
 *   prompt: userPrompt,
 *   onFinish: atlas.vercelOnFinish({ prompt: userPrompt }),
 * });
 * ```
 *
 * Usage: call `client.vercelOnFinish(options)` to get the callback.
 * Since this is a standalone fn, use it directly:
 * ```ts
 * import { vercelOnFinish } from "@atlas/sdk-js/vercel";
 * onFinish: vercelOnFinish(atlas, { prompt: userPrompt })
 * ```
 */
export function vercelOnFinish(
  client: AtlasSynapseClient,
  options: VercelAIWrapOptions,
): (event: StreamFinishEvent) => void {
  return (event: StreamFinishEvent): void => {
    const toolCalls = (event.toolCalls ?? []).map((tc) => ({
      name: tc.toolName,
      input: typeof tc.args === "object" && tc.args !== null
        ? (tc.args as Record<string, unknown>)
        : { args: tc.args },
      output: tc.result,
    }));

    const tokenCount =
      event.usage?.totalTokens ??
      ((event.usage?.promptTokens ?? 0) + (event.usage?.completionTokens ?? 0)) || null;

    client
      .trace({
        prompt: options.prompt,
        response: event.text,
        tokenCount,
        toolCalls,
        agentName: options.agentName,
        platform: "vercel-ai",
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AtlasSynapse] streamText onFinish trace failed: ${msg}`);
      });
  };
}
