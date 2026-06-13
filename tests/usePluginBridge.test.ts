import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePluginBridge } from "../src/hooks/usePluginBridge";
import { useEditorStore } from "../src/stores/editorStore";
import { useEditorRefStore } from "../src/stores/editorRefStore";

const mockIpc = vi.hoisted(() => ({
  updateEditorState: vi.fn().mockResolvedValue(undefined),
  notifyPlugins: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/lib/ipc", () => ({ ipc: mockIpc }));

const TAB_A = {
  id: "tab-a", path: "/path/a.txt", name: "a.txt",
  content: "aaa", encoding: "UTF-8", modified: false,
  language: "plaintext", cursorLine: 1, cursorColumn: 1,
};

const TAB_B = {
  id: "tab-b", path: "/path/b.txt", name: "b.txt",
  content: "bbb", encoding: "UTF-8", modified: false,
  language: "javascript", cursorLine: 2, cursorColumn: 3,
};

function resetStores() {
  useEditorStore.setState({
    tabs: [], activeTabId: null, secondaryTabId: null,
    unsavedTabs: null, pendingCloseAll: false,
  });
  useEditorRefStore.setState({ editorRef: null, secondaryEditorRef: null });
}

describe("usePluginBridge", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it("pushes editor state via ipc.updateEditorState when active tab changes", () => {
    useEditorStore.setState({ tabs: [TAB_A], activeTabId: "tab-a" });

    renderHook(() => usePluginBridge());

    expect(mockIpc.updateEditorState).toHaveBeenCalledWith(
      expect.objectContaining({
        active_file_path: "/path/a.txt",
        active_file_name: "a.txt",
        active_file_content: "aaa",
        active_file_language: "plaintext",
        active_file_encoding: "UTF-8",
        cursor_line: 1,
        cursor_column: 1,
        tab_count: 1,
      }),
    );
  });

  it("pushes empty state when no active tab", () => {
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
    });

    renderHook(() => usePluginBridge());

    expect(mockIpc.updateEditorState).toHaveBeenCalledWith(
      expect.objectContaining({
        active_file_path: null,
        active_file_name: null,
        active_file_content: "",
        active_file_language: "plaintext",
        active_file_encoding: "UTF-8",
        cursor_line: 1,
        cursor_column: 1,
        tab_count: 0,
      }),
    );
  });

  it("calls getSelectionData to include real selection from Monaco editor", () => {
    const mockEditor = {
      getSelection: vi.fn(() => ({
        startLineNumber: 3, startColumn: 1,
        endLineNumber: 5, endColumn: 10,
        isEmpty: () => false,
      })),
      getPosition: vi.fn(() => ({ lineNumber: 3, column: 1 })),
    };
    useEditorRefStore.setState({ editorRef: mockEditor as any });
    useEditorStore.setState({ tabs: [TAB_A], activeTabId: "tab-a" });

    renderHook(() => usePluginBridge());

    expect(mockIpc.updateEditorState).toHaveBeenCalledWith(
      expect.objectContaining({
        selection_start_line: 3,
        selection_start_column: 1,
        selection_end_line: 5,
        selection_end_column: 10,
        has_selection: true,
      }),
    );
  });

  it("notifies plugins on fileOpened event", () => {
    // Start with no tabs, render hook to capture initial refs
    renderHook(() => usePluginBridge());
    // Add a new tab with a path to trigger fileOpened
    act(() => {
      useEditorStore.setState({
        tabs: [TAB_A],
        activeTabId: "tab-a",
      });
    });

    expect(mockIpc.notifyPlugins).toHaveBeenCalledWith(
      "editor.fileOpened",
      expect.objectContaining({
        path: "/path/a.txt",
        name: "a.txt",
        language: "plaintext",
        encoding: "UTF-8",
      }),
    );
  });

  it("notifies plugins on fileClosed event", () => {
    useEditorStore.setState({ tabs: [TAB_A], activeTabId: "tab-a" });

    renderHook(() => usePluginBridge());

    // Remove tab to trigger fileClosed
    act(() => {
      useEditorStore.setState({ tabs: [], activeTabId: null });
    });

    expect(mockIpc.notifyPlugins).toHaveBeenCalledWith(
      "editor.fileClosed",
      expect.objectContaining({ tabId: "tab-a" }),
    );
  });

  it("notifies plugins on fileSaved event", () => {
    const tabModified = { ...TAB_A, modified: true };
    useEditorStore.setState({ tabs: [tabModified], activeTabId: "tab-a" });

    renderHook(() => usePluginBridge());

    // Change tab from modified to not modified to trigger fileSaved
    act(() => {
      useEditorStore.setState({
        tabs: [{ ...TAB_A, modified: false }],
        activeTabId: "tab-a",
      });
    });

    expect(mockIpc.notifyPlugins).toHaveBeenCalledWith(
      "editor.fileSaved",
      expect.objectContaining({
        path: "/path/a.txt",
        name: "a.txt",
      }),
    );
  });

  it("handles plugin-refresh-editor-state custom event", () => {
    useEditorStore.setState({ tabs: [TAB_A], activeTabId: "tab-a" });

    renderHook(() => usePluginBridge());

    mockIpc.updateEditorState.mockClear();

    act(() => {
      window.dispatchEvent(new CustomEvent("plugin-refresh-editor-state"));
    });

    expect(mockIpc.updateEditorState).toHaveBeenCalledWith(
      expect.objectContaining({
        active_file_path: "/path/a.txt",
        active_file_name: "a.txt",
      }),
    );
  });
});
