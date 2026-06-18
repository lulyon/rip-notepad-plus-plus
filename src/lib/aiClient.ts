import type { AiMessage } from "../stores/aiStore";

/**
 * Structured search result from web_search_tool_result content block.
 */
export interface SearchResult {
  url: string;
  title: string;
}

/**
 * Streaming callbacks for the chat client.
 */
export interface StreamCallbacks {
  onToken: (text: string) => void;
  onThinking: (text: string) => void;
  onSearchStart: (query: string, toolUseId: string) => void;
  onSearchResult: (results: SearchResult[], toolUseId: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

/** Supported API provider types. */
export type ApiProvider = "anthropic" | "openai";

/**
 * Smart detection of API provider from base URL.
 * Returns "openai" if URL contains "openai", otherwise "anthropic".
 */
export function detectProvider(baseUrl: string): ApiProvider {
  if (/openai/i.test(baseUrl)) return "openai";
  return "anthropic";
}

// ═══════════════════════════════════════════════════
// Public dispatcher
// ═══════════════════════════════════════════════════

/**
 * Streaming chat client supporting Anthropic-compatible and OpenAI-compatible APIs.
 *
 * Dispatch is based on `provider`. When "openai", web search is not available
 * (the toggle is hidden in the UI and the parameter is ignored).
 */
export async function streamChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  systemPrompt: string,
  enableWebSearch: boolean,
  userTimezone: string | undefined,
  provider: ApiProvider,
  callbacks: StreamCallbacks,
): Promise<void> {
  if (provider === "openai") {
    return openaiStream(baseUrl, apiKey, model, messages, systemPrompt, callbacks);
  }
  return anthropicStream(baseUrl, apiKey, model, messages, systemPrompt, enableWebSearch, userTimezone, callbacks);
}

// ═══════════════════════════════════════════════════
// Anthropic-compatible streaming
// ═══════════════════════════════════════════════════

async function anthropicStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  systemPrompt: string,
  enableWebSearch: boolean,
  userTimezone: string | undefined,
  callbacks: StreamCallbacks,
): Promise<void> {
  const url = `${baseUrl}/v1/messages`;

  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    stream: true,
    system: systemPrompt,
    messages: anthropicMessages,
  };

  if (enableWebSearch) {
    const tool: Record<string, unknown> = {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    };
    if (userTimezone) {
      tool.user_location = { type: "approximate", timezone: userTimezone };
    }
    body.tools = [tool];
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      callbacks.onError(`API error ${response.status}: ${errText.slice(0, 200)}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError("No response body"); return; }

    const decoder = new TextDecoder();
    let buffer = "";
    const blockTypes = new Map<number, string>();
    let searchJsonBuf = "";
    let currentSearchToolId = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const type = parsed.type;
          const index: number | undefined = parsed.index;

          if (type === "content_block_start") {
            const cb = parsed.content_block || {};
            const cbType: string = cb.type || "";
            if (index !== undefined) blockTypes.set(index, cbType);
            if (cbType === "server_tool_use") {
              currentSearchToolId = cb.id || "";
              searchJsonBuf = "";
            }
            if (cbType === "web_search_tool_result") {
              const rawContent = cb.content || [];
              const results: SearchResult[] = [];
              for (const item of rawContent) {
                if (item.type === "web_search_result" && item.url && item.title) {
                  results.push({ url: item.url, title: item.title });
                }
              }
              if (results.length > 0) {
                callbacks.onSearchResult(results, cb.tool_use_id || "");
              }
            }
          } else if (type === "content_block_delta") {
            const delta = parsed.delta || {};
            const deltaType: string = delta.type || "";
            const blockType = index !== undefined ? blockTypes.get(index) : undefined;

            if (deltaType === "thinking_delta" || delta.thinking) {
              callbacks.onThinking(delta.thinking || "");
            } else if (deltaType === "input_json_delta") {
              searchJsonBuf += delta.partial_json || "";
              const m = searchJsonBuf.match(/"query"\s*:\s*"([^"]*)"/);
              if (m && currentSearchToolId) {
                callbacks.onSearchStart(m[1], currentSearchToolId);
              }
            } else if (blockType === "text") {
              if (deltaType === "text_delta" || delta.text) {
                callbacks.onToken(delta.text || "");
              }
            } else if (!blockType) {
              if (deltaType === "text_delta" || delta.text) {
                callbacks.onToken(delta.text || "");
              }
            }
          } else if (type === "content_block_stop") {
            if (index !== undefined) blockTypes.delete(index);
          } else if (type === "error") {
            callbacks.onError(parsed.error?.message || "Unknown error");
            return;
          }
        } catch { /* skip unparseable */ }
      }
    }

    callbacks.onDone();
  } catch (e: unknown) {
    callbacks.onError(e instanceof Error ? e.message : "Network error");
  }
}

// ═══════════════════════════════════════════════════
// OpenAI-compatible streaming
// ═══════════════════════════════════════════════════

async function openaiStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  systemPrompt: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const url = `${baseUrl}/v1/chat/completions`;

  // Build OpenAI-format messages array
  const openaiMessages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    openaiMessages.push({ role: "system", content: systemPrompt });
  }
  for (const m of messages) {
    openaiMessages.push({ role: m.role, content: m.content });
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    stream: true,
    messages: openaiMessages,
    stream_options: { include_usage: true },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      callbacks.onError(`API error ${response.status}: ${errText.slice(0, 200)}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError("No response body"); return; }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") { callbacks.onDone(); return; }

        try {
          const parsed = JSON.parse(data);
          const choices = parsed.choices;
          if (!choices || choices.length === 0) continue;

          const delta = choices[0].delta || {};

          // Reasoning content (e.g. DeepSeek-R1, o1)
          if (delta.reasoning_content) {
            callbacks.onThinking(delta.reasoning_content);
          }
          // Regular text content
          if (delta.content) {
            callbacks.onToken(delta.content);
          }
        } catch { /* skip unparseable */ }
      }
    }

    callbacks.onDone();
  } catch (e: unknown) {
    callbacks.onError(e instanceof Error ? e.message : "Network error");
  }
}
