import { describe, it, expect, vi } from "vitest";
import { streamChat } from "../src/lib/aiClient";
import type { StreamCallbacks, SearchResult } from "../src/lib/aiClient";

const messages = [
  { role: "user" as const, content: "hi", timestamp: 1 },
];

// Collect all callbacks into arrays for assertion.
// Returns a mutable state object so assertions see updated values
// after the async streamChat completes (onDone closure mutates state).
function makeCollector() {
  const state = {
    tokens: [] as string[],
    thoughts: [] as string[],
    searchStarts: [] as [string, string][],
    searchResults: [] as SearchResult[][],
    done: false,
    error: null as string | null,
  };

  const callbacks: StreamCallbacks = {
    onToken: (t) => { state.tokens.push(t); },
    onThinking: (t) => { state.thoughts.push(t); },
    onSearchStart: (q, id) => { state.searchStarts.push([q, id]); },
    onSearchResult: (r) => { state.searchResults.push(r); },
    onDone: () => { state.done = true; },
    onError: (e) => { state.error = e; },
  };

  return { callbacks, state };
}

/** Build SSE data from event JSON strings, return mock for globalThis.fetch */
function mockFetch(events: string[], opts?: { ok?: boolean; status?: number }) {
  const encoder = new TextEncoder();
  const sse = events.map((ev) => `data: ${ev}\n\n`).join("");
  const chunk = encoder.encode(sse);

  const reader = {
    read: vi.fn()
      .mockResolvedValueOnce({ done: false, value: chunk })
      .mockResolvedValue({ done: true, value: undefined }),
  };

  const response = {
    ok: opts?.ok ?? true,
    status: opts?.status ?? 200,
    body: { getReader: () => reader },
    json: async () => ({}),
    text: async () => "",
  };

  globalThis.fetch = vi.fn().mockResolvedValue(response) as any;
  return reader;
}

describe("streamChat", () => {

  it("streams text deltas when web search is disabled", async () => {
    mockFetch([
      '{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
      '{"type":"content_block_stop","index":0}',
      '{"type":"message_stop"}',
    ]);

    const c = makeCollector();
    await streamChat("https://test.api", "sk-test", "test-model", messages, "", false, c.callbacks);

    expect(c.state.tokens.join("")).toBe("Hello world");
    expect(c.state.done).toBe(true);
    expect(c.state.error).toBeNull();
  });

  it("streams thinking deltas", async () => {
    mockFetch([
      '{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me think..."}}',
      '{"type":"content_block_stop","index":0}',
      '{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}',
      '{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Answer"}}',
      '{"type":"content_block_stop","index":1}',
      '{"type":"message_stop"}',
    ]);

    const c = makeCollector();
    await streamChat("https://test.api", "sk-test", "test-model", messages, "", false, c.callbacks);

    expect(c.state.thoughts.join("")).toBe("Let me think...");
    expect(c.state.tokens.join("")).toBe("Answer");
    expect(c.state.done).toBe(true);
  });

  describe("web search enabled", () => {
    it("parses server_tool_use and extracts search query", async () => {
      mockFetch([
        '{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}',
        '{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Need to search"}}',
        '{"type":"content_block_stop","index":0}',
        '{"type":"content_block_start","index":1,"content_block":{"type":"server_tool_use","id":"srvtoolu_abc","name":"web_search","input":{},"caller":{"type":"direct"}}}',
        '{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"latest React version\\"}"}}',
        '{"type":"content_block_stop","index":1}',
        '{"type":"content_block_start","index":2,"content_block":{"type":"web_search_tool_result","tool_use_id":"srvtoolu_abc","content":[{"type":"web_search_result","url":"https://react.dev","title":"React Official Site"},{"type":"web_search_result","url":"https://npmjs.com/package/react","title":"React on npm"}]}}',
        '{"type":"content_block_stop","index":2}',
        '{"type":"content_block_start","index":3,"content_block":{"type":"thinking","thinking":""}}',
        '{"type":"content_block_stop","index":3}',
        '{"type":"content_block_start","index":4,"content_block":{"type":"text","text":""}}',
        '{"type":"content_block_delta","index":4,"delta":{"type":"text_delta","text":"React 19.2.3"}}',
        '{"type":"content_block_stop","index":4}',
        '{"type":"message_stop"}',
      ]);

      const c = makeCollector();
      await streamChat("https://test.api", "sk-test", "test-model", messages, "", true, c.callbacks);

      expect(c.state.searchStarts.length).toBeGreaterThanOrEqual(1);
      expect(c.state.searchStarts[0][0]).toBe("latest React version");
      expect(c.state.searchStarts[0][1]).toBe("srvtoolu_abc");

      const results = c.state.searchResults[0];
      expect(results).toHaveLength(2);
      expect(results[0].url).toBe("https://react.dev");
      expect(results[0].title).toBe("React Official Site");

      expect(c.state.tokens.join("")).toBe("React 19.2.3");
      expect(c.state.done).toBe(true);
    });

    it("model answers directly when search not needed", async () => {
      mockFetch([
        '{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"No search needed"}}',
        '{"type":"content_block_stop","index":0}',
        '{"type":"message_stop"}',
      ]);

      const c = makeCollector();
      await streamChat("https://test.api", "sk-test", "test-model", messages, "", true, c.callbacks);

      expect(c.state.tokens.join("")).toBe("No search needed");
      expect(c.state.searchStarts).toHaveLength(0);
      expect(c.state.searchResults).toHaveLength(0);
      expect(c.state.done).toBe(true);
    });

    it("filters non-web_search_result items from result block", async () => {
      mockFetch([
        '{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}',
        '{"type":"content_block_stop","index":0}',
        '{"type":"content_block_start","index":1,"content_block":{"type":"web_search_tool_result","tool_use_id":"x","content":[{"type":"other_type","url":"https://bad.com"},{"type":"web_search_result","url":"https://good.com","title":"Good"},{"type":"web_search_result","title":"No URL"},{"type":"web_search_result","url":"https://other.com","title":"Other"}]}}',
        '{"type":"content_block_stop","index":1}',
        '{"type":"message_stop"}',
      ]);

      const c = makeCollector();
      await streamChat("https://test.api", "sk-test", "test-model", messages, "", true, c.callbacks);

      const results = c.state.searchResults[0];
      expect(results).toHaveLength(2);
      expect(results[0].url).toBe("https://good.com");
      expect(results[1].url).toBe("https://other.com");
    });
  });

  it("handles API errors via onError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
      text: async () => "Unauthorized",
      json: async () => ({ error: { message: "Unauthorized" } }),
    }) as any;

    const c = makeCollector();
    await streamChat("https://test.api", "sk-bad", "test-model", messages, "", false, c.callbacks);

    expect(c.state.error).toBeTruthy();
    expect(c.state.error).toContain("401");
    expect(c.state.done).toBe(false);
  });

  it("handles network errors via onError", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure")) as any;

    const c = makeCollector();
    await streamChat("https://test.api", "sk-test", "test-model", messages, "", false, c.callbacks);

    expect(c.state.error).toBe("Network failure");
    expect(c.state.done).toBe(false);
  });

  it("includes web_search tool in request when enabled", async () => {
    const reader = mockFetch([
      '{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}',
      '{"type":"content_block_stop","index":0}',
      '{"type":"message_stop"}',
    ]);

    const c = makeCollector();
    await streamChat("https://test.api", "sk-test", "test-model", messages, "", true, c.callbacks);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.tools).toBeDefined();
    expect(body.tools[0].type).toBe("web_search_20250305");
    expect(body.tools[0].max_uses).toBe(5);
  });

  it("does NOT include web_search tool when disabled", async () => {
    mockFetch([
      '{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}',
      '{"type":"content_block_stop","index":0}',
      '{"type":"message_stop"}',
    ]);

    const c = makeCollector();
    await streamChat("https://test.api", "sk-test", "test-model", messages, "", false, c.callbacks);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.tools).toBeUndefined();
  });
});

describe("sanitizeText", () => {
  function sanitizeText(text: string): string {
    return text
      .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  it("strips single invoke block", () => {
    const input = `<invoke name="web_search">
<parameter name="query" string="true">test</parameter>
</invoke>
Here is the answer.`;
    expect(sanitizeText(input)).toBe("Here is the answer.");
  });

  it("strips multiple invoke blocks", () => {
    const input = `<invoke name="web_search">
</invoke>
<invoke name="web_fetch">
</invoke>
Final.`;
    expect(sanitizeText(input)).toBe("Final.");
  });

  it("returns unchanged text when no XML present", () => {
    expect(sanitizeText("Normal **markdown**.")).toBe("Normal **markdown**.");
  });

  it("collapses excessive newlines after XML removal", () => {
    const input = `<invoke>
</invoke>



Text.`;
    expect(sanitizeText(input)).toBe("Text.");
  });

  it("returns empty for XML-only input", () => {
    expect(sanitizeText(`<invoke name="x">
</invoke>`)).toBe("");
  });
});
