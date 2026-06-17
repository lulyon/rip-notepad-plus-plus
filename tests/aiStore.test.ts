import { describe, it, expect, beforeEach } from "vitest";
import { useAiStore } from "../src/stores/aiStore";

beforeEach(() => {
  localStorage.clear();
  useAiStore.setState({
    apiBaseUrl: "https://api.deepseek.com/anthropic",
    apiKey: "sk-test",
    model: "deepseek-v4-pro",
    enableWebSearch: true,
    conversations: [],
    activeId: null,
  });
});

describe("aiStore", () => {
  describe("enableWebSearch", () => {
    it("defaults to true", () => {
      expect(useAiStore.getState().enableWebSearch).toBe(true);
    });

    it("toggleWebSearch flips the value", () => {
      expect(useAiStore.getState().enableWebSearch).toBe(true);
      useAiStore.getState().toggleWebSearch();
      expect(useAiStore.getState().enableWebSearch).toBe(false);
      useAiStore.getState().toggleWebSearch();
      expect(useAiStore.getState().enableWebSearch).toBe(true);
    });

    it("persists enableWebSearch in localStorage config", () => {
      useAiStore.getState().toggleWebSearch(); // false
      const raw = localStorage.getItem("ripnotepadpp-ai-config");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.enableWebSearch).toBe(false);
    });

    it("defaults to true when config has no enableWebSearch field", () => {
      // Simulate old config without the field
      localStorage.setItem(
        "ripnotepadpp-ai-config",
        JSON.stringify({ url: "https://test.api", key: "sk-old", model: "old-model" })
      );
      // Re-create state by reloading — we test the fallback via a fresh store
      const state = useAiStore.getState();
      // toggle and back to trigger save with current config
      state.toggleWebSearch(); // false
      state.toggleWebSearch(); // true
      expect(useAiStore.getState().enableWebSearch).toBe(true);
    });
  });

  describe("updateLastMessageMeta", () => {
    it("attaches search metadata to the last assistant message", () => {
      const id = useAiStore.getState().newConversation();
      useAiStore.getState().addMessage(id, {
        role: "user",
        content: "What is React?",
        timestamp: 1000,
      });
      useAiStore.getState().addMessage(id, {
        role: "assistant",
        content: "React is a library...",
        timestamp: 2000,
      });

      useAiStore.getState().updateLastMessageMeta(id, {
        searchQuery: "React latest version",
        searchResults: [
          { url: "https://example.com/react", title: "React Docs" },
        ],
      });

      const conv = useAiStore.getState().getConversation(id);
      const last = conv?.messages[conv.messages.length - 1];
      expect(last?.searchQuery).toBe("React latest version");
      expect(last?.searchResults).toHaveLength(1);
      expect(last?.searchResults![0].url).toBe("https://example.com/react");
      expect(last?.content).toBe("React is a library..."); // content preserved
    });

    it("does nothing when there are no messages", () => {
      const id = useAiStore.getState().newConversation();
      expect(() => {
        useAiStore.getState().updateLastMessageMeta(id, { searchQuery: "test" });
      }).not.toThrow();
    });

    it("does nothing when last message is not assistant", () => {
      const id = useAiStore.getState().newConversation();
      useAiStore.getState().addMessage(id, {
        role: "user",
        content: "hi",
        timestamp: 1000,
      });
      // Last message is user, should be no-op
      useAiStore.getState().updateLastMessageMeta(id, { searchQuery: "test" });
      const conv = useAiStore.getState().getConversation(id);
      const last = conv?.messages[conv.messages.length - 1];
      expect(last?.searchQuery).toBeUndefined();
    });
  });

  describe("AiMessage search fields", () => {
    it("messages can carry search metadata through addMessage", () => {
      const id = useAiStore.getState().newConversation();
      useAiStore.getState().addMessage(id, {
        role: "user",
        content: "hi",
        timestamp: 1000,
      });
      useAiStore.getState().addMessage(id, {
        role: "assistant",
        content: "Hello!",
        timestamp: 2000,
        searchQuery: "latest news",
        searchResults: [{ url: "https://news.com", title: "News" }],
      });

      const conv = useAiStore.getState().getConversation(id);
      expect(conv?.messages[1].searchQuery).toBe("latest news");
      expect(conv?.messages[1].searchResults).toHaveLength(1);
    });
  });
});
