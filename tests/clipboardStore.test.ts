import { describe, it, expect, beforeEach, vi } from "vitest";
import { useClipboardStore } from "../src/stores/clipboardStore";

beforeEach(() => {
  useClipboardStore.setState({
    entries: [],
    maxEntries: 50,
    listening: false,
  });
});

describe("clipboardStore", () => {
  describe("initial state", () => {
    it("starts with empty entries and not listening", () => {
      const s = useClipboardStore.getState();
      expect(s.entries).toEqual([]);
      expect(s.maxEntries).toBe(50);
      expect(s.listening).toBe(false);
    });
  });

  describe("addEntry", () => {
    it("adds an entry with id, text, timestamp, and pinned=false", () => {
      useClipboardStore.getState().addEntry("hello");

      const entries = useClipboardStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].text).toBe("hello");
      expect(entries[0].pinned).toBe(false);
      expect(entries[0].id).toBeGreaterThan(0);
      expect(entries[0].time).toBeGreaterThan(0);
    });

    it("prepends new entries to the front", () => {
      useClipboardStore.getState().addEntry("first");
      useClipboardStore.getState().addEntry("second");

      const entries = useClipboardStore.getState().entries;
      expect(entries[0].text).toBe("second");
      expect(entries[1].text).toBe("first");
    });

    it("deduplicates entries with the same text", () => {
      useClipboardStore.getState().addEntry("hello");
      useClipboardStore.getState().addEntry("world");
      useClipboardStore.getState().addEntry("hello");

      const entries = useClipboardStore.getState().entries;
      expect(entries).toHaveLength(2);
      // The duplicate "hello" is removed, then added back at the front
      expect(entries[0].text).toBe("hello");
      expect(entries[1].text).toBe("world");
    });

    it("caps entries at maxEntries", () => {
      useClipboardStore.setState({ maxEntries: 3 });
      useClipboardStore.getState().addEntry("a");
      useClipboardStore.getState().addEntry("b");
      useClipboardStore.getState().addEntry("c");
      useClipboardStore.getState().addEntry("d");

      expect(useClipboardStore.getState().entries).toHaveLength(3);
      expect(useClipboardStore.getState().entries[0].text).toBe("d");
    });

    it("handles very long text", () => {
      const longText = "x".repeat(1000);
      useClipboardStore.getState().addEntry(longText);
      expect(useClipboardStore.getState().entries[0].text).toBe(longText);
    });
  });

  describe("removeEntry", () => {
    it("removes an entry by id", () => {
      useClipboardStore.getState().addEntry("hello");
      useClipboardStore.getState().addEntry("world");
      const id = useClipboardStore.getState().entries[0].id;

      useClipboardStore.getState().removeEntry(id);

      const entries = useClipboardStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].text).toBe("hello");
    });

    it("does nothing when id not found", () => {
      useClipboardStore.getState().addEntry("hello");
      useClipboardStore.getState().removeEntry(99999);
      expect(useClipboardStore.getState().entries).toHaveLength(1);
    });
  });

  describe("clearAll", () => {
    it("removes all entries", () => {
      useClipboardStore.getState().addEntry("a");
      useClipboardStore.getState().addEntry("b");
      useClipboardStore.getState().clearAll();
      expect(useClipboardStore.getState().entries).toEqual([]);
    });
  });

  describe("togglePin", () => {
    it("pins an entry", () => {
      useClipboardStore.getState().addEntry("hello");
      const id = useClipboardStore.getState().entries[0].id;

      useClipboardStore.getState().togglePin(id);

      expect(useClipboardStore.getState().entries[0].pinned).toBe(true);
    });

    it("unpins a pinned entry", () => {
      useClipboardStore.getState().addEntry("hello");
      const id = useClipboardStore.getState().entries[0].id;

      useClipboardStore.getState().togglePin(id);
      useClipboardStore.getState().togglePin(id);

      expect(useClipboardStore.getState().entries[0].pinned).toBe(false);
    });

    it("does not affect other entries when toggling pin", () => {
      useClipboardStore.getState().addEntry("first");
      useClipboardStore.getState().addEntry("second");
      const firstId = useClipboardStore.getState().entries[1].id;
      const secondId = useClipboardStore.getState().entries[0].id;

      useClipboardStore.getState().togglePin(firstId);

      const entries = useClipboardStore.getState().entries;
      expect(entries[1].pinned).toBe(true); // first entry (now pinned)
      expect(entries[0].pinned).toBe(false); // second entry (stays unpinned)
    });
  });

  describe("search", () => {
    it("finds entries containing the search text", () => {
      useClipboardStore.getState().addEntry("hello world");
      useClipboardStore.getState().addEntry("goodbye");
      useClipboardStore.getState().addEntry("hello there");

      const results = useClipboardStore.getState().search("hello");
      expect(results).toHaveLength(2);
    });

    it("is case-insensitive", () => {
      useClipboardStore.getState().addEntry("Hello World");
      const results = useClipboardStore.getState().search("hello");
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe("Hello World");
    });

    it("returns empty array when no match", () => {
      useClipboardStore.getState().addEntry("abc");
      useClipboardStore.getState().addEntry("def");
      const results = useClipboardStore.getState().search("xyz");
      expect(results).toHaveLength(0);
    });

    it("returns all entries with empty query", () => {
      useClipboardStore.getState().addEntry("a");
      useClipboardStore.getState().addEntry("b");
      const results = useClipboardStore.getState().search("");
      expect(results).toHaveLength(2);
    });

    it("does not modify state", () => {
      useClipboardStore.getState().addEntry("test text");
      const entriesBefore = useClipboardStore.getState().entries.length;

      useClipboardStore.getState().search("test");

      expect(useClipboardStore.getState().entries).toHaveLength(entriesBefore);
    });
  });

  describe("startListening", () => {
    it("sets listening to true", () => {
      useClipboardStore.getState().startListening();
      expect(useClipboardStore.getState().listening).toBe(true);
    });

    it("does not register duplicate listeners", () => {
      const addSpy = vi.spyOn(document, "addEventListener");

      useClipboardStore.getState().startListening();
      useClipboardStore.getState().startListening(); // second call should be no-op

      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith("copy", expect.any(Function));

      addSpy.mockRestore();
    });
  });

  describe("stopListening", () => {
    it("sets listening to false", () => {
      useClipboardStore.getState().startListening();
      useClipboardStore.getState().stopListening();
      expect(useClipboardStore.getState().listening).toBe(false);
    });

    it("removes the copy event listener", () => {
      useClipboardStore.getState().startListening();

      const removeSpy = vi.spyOn(document, "removeEventListener");

      useClipboardStore.getState().stopListening();

      expect(removeSpy).toHaveBeenCalledWith("copy", expect.any(Function));

      removeSpy.mockRestore();
    });

    it("is idempotent when not listening", () => {
      expect(() => {
        useClipboardStore.getState().stopListening();
      }).not.toThrow();
    });
  });
});
