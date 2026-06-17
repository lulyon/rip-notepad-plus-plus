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

/**
 * Anthropic-compatible streaming chat client.
 * Works with DeepSeek API, Claude API, and other compatible endpoints.
 *
 * When enableWebSearch is true, includes the web_search_20250305
 * server tool so the model can search the web autonomously.
 * The client parses server_tool_use and web_search_tool_result content
 * blocks but never executes tools itself — search is server-side.
 */
export async function streamChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  systemPrompt: string,
  enableWebSearch: boolean,
  callbacks: StreamCallbacks,
): Promise<void> {
  const url = `${baseUrl}/v1/messages`;

  // Convert our messages to Anthropic format.
  // For user messages we send a simple text content block.
  // For assistant messages we send content as-is (plain string).
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Build the request body
  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    stream: true,
    system: systemPrompt,
    messages: anthropicMessages,
  };

  // Include web_search tool when enabled
  if (enableWebSearch) {
    body.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ];
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

    // Track content block types by index for dispatching deltas
    const blockTypes = new Map<number, string>();
    // Accumulate partial_json for server_tool_use (search query)
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

          // ── content_block_start: record block type ──
          if (type === "content_block_start") {
            const cb = parsed.content_block || {};
            const cbType: string = cb.type || "";

            if (index !== undefined) {
              blockTypes.set(index, cbType);
            }

            if (cbType === "server_tool_use") {
              currentSearchToolId = cb.id || "";
              searchJsonBuf = "";
            }

            if (cbType === "web_search_tool_result") {
              // Results arrive in the content array of the start block
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
          }

          // ── content_block_delta ──
          else if (type === "content_block_delta") {
            const delta = parsed.delta || {};
            const deltaType: string = delta.type || "";
            const blockType = index !== undefined ? blockTypes.get(index) : undefined;

            // Thinking deltas
            if (deltaType === "thinking_delta" || delta.thinking) {
              callbacks.onThinking(delta.thinking || "");
            }
            // Search query deltas (server_tool_use → input_json_delta)
            else if (deltaType === "input_json_delta") {
              searchJsonBuf += delta.partial_json || "";
              // Try to extract the query as it streams in
              const m = searchJsonBuf.match(/"query"\s*:\s*"([^"]*)"/);
              if (m && currentSearchToolId) {
                callbacks.onSearchStart(m[1], currentSearchToolId);
              }
            }
            // Text deltas — only for text blocks (not thinking blocks)
            else if (blockType === "text") {
              if (deltaType === "text_delta" || delta.text) {
                callbacks.onToken(delta.text || "");
              }
            }
            // Fallback: text deltas on unknown block types (backward compat)
            else if (!blockType) {
              if (deltaType === "text_delta" || delta.text) {
                callbacks.onToken(delta.text || "");
              }
            }
          }

          // ── content_block_stop ──
          else if (type === "content_block_stop") {
            if (index !== undefined) {
              blockTypes.delete(index);
            }
          }

          // ── message_stop: stream complete ──
          else if (type === "message_stop") {
            // Stream complete — handled after loop exits
          }

          // ── error ──
          else if (type === "error") {
            callbacks.onError(parsed.error?.message || "Unknown error");
            return;
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    callbacks.onDone();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    callbacks.onError(msg);
  }
}
