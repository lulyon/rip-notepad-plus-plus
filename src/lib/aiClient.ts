import type { AiMessage } from "../stores/aiStore";

/**
 * Anthropic-compatible streaming chat client.
 * Works with DeepSeek API, Claude API, and other compatible endpoints.
 */
export async function streamChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  systemPrompt: string,
  onToken: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const url = `${baseUrl}/v1/messages`;

  // Convert our messages to Anthropic format
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`API error ${response.status}: ${errText.slice(0, 200)}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError("No response body"); return; }

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
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const type = parsed.type;

          if (type === "content_block_delta") {
            const text = parsed.delta?.text || "";
            onToken(text);
          } else if (type === "message_stop") {
            // Stream complete
          } else if (type === "error") {
            onError(parsed.error?.message || "Unknown error");
            return;
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    onDone();
  } catch (e: any) {
    onError(e.message || "Network error");
  }
}
