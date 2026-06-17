import { describe, it, expect, beforeEach } from "vitest";
import { useBookmarkStore } from "../src/stores/bookmarkStore";
import { useMarkStore } from "../src/stores/markStore";
import { useAiStore } from "../src/stores/aiStore";
import { useContextMenuStore } from "../src/stores/contextMenuStore";
import { useToolStore } from "../src/stores/toolStore";
import { useUdlStore } from "../src/stores/udlStore";

describe("bookmarkStore", () => {
  beforeEach(() => { useBookmarkStore.setState({ bookmarks: {} }); });
  it("toggles bookmarks", () => { const s = useBookmarkStore.getState(); s.toggleBookmark("tab1", 5); expect(s.getBookmarks("tab1")).toHaveLength(1); });
  it("finds next/prev", () => { const s = useBookmarkStore.getState(); s.toggleBookmark("t1", 10); s.toggleBookmark("t1", 20); expect(s.findNextBookmark("t1", 5)).toBe(10); expect(s.findPrevBookmark("t1", 25)).toBe(20); });
  it("clears bookmarks", () => { const s = useBookmarkStore.getState(); s.toggleBookmark("t1", 1); s.clearBookmarks("t1"); expect(s.getBookmarks("t1")).toHaveLength(0); });
  it("wraps around on next/prev", () => { const s = useBookmarkStore.getState(); s.toggleBookmark("t1", 5); s.toggleBookmark("t1", 15); expect(s.findNextBookmark("t1", 20)).toBe(5); expect(s.findPrevBookmark("t1", 3)).toBe(15); });
});

describe("markStore", () => {
  beforeEach(() => { useMarkStore.setState({ marks: {} }); });
  it("marks lines with styles", () => { const s = useMarkStore.getState(); s.markAll("t1", [1, 2, 3], 1); expect(s.getMarks("t1")).toHaveLength(3); });
  it("unmarks specific style", () => { const s = useMarkStore.getState(); s.markAll("t1", [1, 2], 1); s.unmarkAll("t1", 1); expect(s.getMarks("t1")).toHaveLength(0); });
  it("clears all marks", () => { const s = useMarkStore.getState(); s.markAll("t1", [1], 2); s.clearAllMarks("t1"); expect(s.getMarks("t1")).toHaveLength(0); });
  it("finds next mark", () => { const s = useMarkStore.getState(); s.markAll("t1", [10, 20], 1); expect(s.findNextMark("t1", 5)).toBe(10); });
});

describe("aiStore", () => {
  beforeEach(() => { useAiStore.setState({ conversations: [], activeId: null, apiBaseUrl: "", apiKey: "", model: "" }); });
  it("initializes with no conversations", () => {
    expect(useAiStore.getState().conversations).toHaveLength(0);
    expect(useAiStore.getState().activeId).toBeNull();
  });
  it("creates new conversation", () => {
    const id = useAiStore.getState().newConversation();
    expect(id).toBeTruthy();
    expect(useAiStore.getState().conversations).toHaveLength(1);
    expect(useAiStore.getState().activeId).toBe(id);
  });
  it("adds messages and auto-titles", () => {
    const id = useAiStore.getState().newConversation();
    useAiStore.getState().addMessage(id, { role: "user", content: "hello", timestamp: 1 });
    expect(useAiStore.getState().getConversation(id)?.messages).toHaveLength(1);
    expect(useAiStore.getState().getConversation(id)?.title).toBe("hello");
  });
  it("clears messages", () => {
    const id = useAiStore.getState().newConversation();
    useAiStore.getState().addMessage(id, { role: "user", content: "x", timestamp: 1 });
    useAiStore.getState().clearMessages(id);
    expect(useAiStore.getState().getConversation(id)?.messages).toHaveLength(0);
  });
  it("stores config", () => {
    useAiStore.getState().setConfig("http://x", "key123", "m1");
    const s = useAiStore.getState();
    expect(s.apiBaseUrl).toBe("http://x");
    expect(s.apiKey).toBe("key123");
  });
  it("closes conversation and switches active", () => {
    useAiStore.setState({ conversations: [], activeId: null });
    const id1 = useAiStore.getState().newConversation();
    const id2 = useAiStore.getState().newConversation();
    expect(useAiStore.getState().conversations).toHaveLength(2); // verify both created
    useAiStore.getState().closeConversation(id1);
    expect(useAiStore.getState().conversations).toHaveLength(1);
    expect(useAiStore.getState().activeId).toBe(id2);
  });
  it("refuses to close last conversation", () => {
    const id = useAiStore.getState().newConversation();
    useAiStore.getState().closeConversation(id);
    expect(useAiStore.getState().conversations).toHaveLength(1);
  });
});

describe("contextMenuStore", () => {
  it("has default items", () => { expect(useContextMenuStore.getState().items.length).toBeGreaterThan(0); });
  it("adds items", () => { useContextMenuStore.getState().addItem({ id: "t", label: "Test", action: "test", separator: false }); expect(useContextMenuStore.getState().items.some(i => i.id === "t")).toBe(true); });
  it("removes items", () => { useContextMenuStore.getState().addItem({ id: "t", label: "T", action: "x", separator: false }); useContextMenuStore.getState().removeItem("t"); expect(useContextMenuStore.getState().items.some(i => i.id === "t")).toBe(false); });
});

describe("toolStore", () => {
  it("starts empty", () => { expect(useToolStore.getState().tools).toHaveLength(0); });
  it("adds tools", () => { useToolStore.getState().addTool({ id: "1", name: "npm build", command: "npm run build", cwd: "", shortcut: "" }); expect(useToolStore.getState().tools).toHaveLength(1); });
  it("removes tools", () => { useToolStore.getState().addTool({ id: "1", name: "x", command: "x", cwd: "", shortcut: "" }); useToolStore.getState().removeTool("1"); expect(useToolStore.getState().tools).toHaveLength(0); });
});

describe("udlStore", () => {
  beforeEach(() => { useUdlStore.setState({ udls: [] }); });
  it("starts empty", () => { expect(useUdlStore.getState().udls).toHaveLength(0); });
  it("adds udl", () => { useUdlStore.getState().addUdl({ id: "u1", name: "MyLang", extensions: [".ml"], lineComment: "#", blockCommentStart: "", blockCommentEnd: "", keywords: [], keywordColors: [], operators: "", delimiters: "", stringChars: "'\"", caseSensitive: false, autoIndent: true }); expect(useUdlStore.getState().udls).toHaveLength(1); });
  it("deletes udl", () => { const id = "u2"; useUdlStore.getState().addUdl({ id, name: "X", extensions: [], lineComment: "", blockCommentStart: "", blockCommentEnd: "", keywords: [], keywordColors: [], operators: "", delimiters: "", stringChars: "", caseSensitive: false, autoIndent: false }); useUdlStore.getState().deleteUdl(id); expect(useUdlStore.getState().udls).toHaveLength(0); });
});
