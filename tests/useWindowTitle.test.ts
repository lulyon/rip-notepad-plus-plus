import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWindowTitle } from "../src/hooks/useWindowTitle";
import { useEditorStore } from "../src/stores/editorStore";

const mockSetTitle = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetCurrentWindow = vi.hoisted(() => vi.fn(() => ({
  setTitle: mockSetTitle,
})));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: mockGetCurrentWindow,
}));

describe("useWindowTitle", () => {
  beforeEach(() => {
    mockSetTitle.mockClear();
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
      secondaryTabId: null,
      unsavedTabs: null,
      pendingCloseAll: false,
    });
  });

  it("sets title based on active tab name", () => {
    useEditorStore.setState({
      tabs: [{
        id: "tab-1", path: "/path/file.txt", name: "file.txt",
        content: "", encoding: "UTF-8", modified: false,
        language: "plaintext", cursorLine: 1, cursorColumn: 1,
      }],
      activeTabId: "tab-1",
    });

    renderHook(() => useWindowTitle());

    expect(mockSetTitle).toHaveBeenCalledWith("ripNotepad++ - file.txt");
  });

  it('adds "●" prefix for modified tabs', () => {
    useEditorStore.setState({
      tabs: [{
        id: "tab-1", path: "/path/file.txt", name: "file.txt",
        content: "changed", encoding: "UTF-8", modified: true,
        language: "plaintext", cursorLine: 1, cursorColumn: 1,
      }],
      activeTabId: "tab-1",
    });

    renderHook(() => useWindowTitle());

    expect(mockSetTitle).toHaveBeenCalledWith("ripNotepad++ - file.txt ●");
  });

  it("uses default title when no active tab", () => {
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
    });

    renderHook(() => useWindowTitle());

    expect(mockSetTitle).toHaveBeenCalledWith("ripNotepad++");
  });
});
