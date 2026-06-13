import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoSave } from "../src/hooks/useAutoSave";
import { useEditorStore } from "../src/stores/editorStore";
import { useSettingsStore } from "../src/stores/settingsStore";

const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../src/lib/ipc", () => ({
  ipc: { writeFile: mockWriteFile },
}));

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
      secondaryTabId: null,
      unsavedTabs: null,
      pendingCloseAll: false,
    });
    useSettingsStore.setState({ autoSave: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does NOT save when autoSave is false", async () => {
    useSettingsStore.setState({ autoSave: false });
    useEditorStore.setState({
      tabs: [{
        id: "tab-1", path: "/path/file.txt", name: "file.txt",
        content: "updated", encoding: "UTF-8", modified: true,
        language: "plaintext", cursorLine: 1, cursorColumn: 1,
      }],
      activeTabId: "tab-1",
    });

    renderHook(() => useAutoSave());
    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("saves modified tabs with paths", async () => {
    useEditorStore.setState({
      tabs: [{
        id: "tab-1", path: "/path/file.txt", name: "file.txt",
        content: "updated", encoding: "UTF-8", modified: true,
        language: "plaintext", cursorLine: 1, cursorColumn: 1,
      }],
      activeTabId: "tab-1",
    });

    renderHook(() => useAutoSave());
    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(mockWriteFile).toHaveBeenCalledWith("/path/file.txt", "updated", "UTF-8");
    const tab = useEditorStore.getState().tabs[0];
    expect(tab.modified).toBe(false);
  });

  it("skips tabs without paths", async () => {
    useEditorStore.setState({
      tabs: [{
        id: "tab-1", path: null, name: "new 1",
        content: "content", encoding: "UTF-8", modified: true,
        language: "plaintext", cursorLine: 1, cursorColumn: 1,
      }],
      activeTabId: "tab-1",
    });

    renderHook(() => useAutoSave());
    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("handles write errors gracefully", async () => {
    mockWriteFile.mockRejectedValueOnce(new Error("write failed"));
    useEditorStore.setState({
      tabs: [{
        id: "tab-1", path: "/path/file.txt", name: "file.txt",
        content: "content", encoding: "UTF-8", modified: true,
        language: "plaintext", cursorLine: 1, cursorColumn: 1,
      }],
      activeTabId: "tab-1",
    });

    expect(() => {
      renderHook(() => useAutoSave());
    }).not.toThrow();

    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(mockWriteFile).toHaveBeenCalled();
    const tab = useEditorStore.getState().tabs[0];
    expect(tab.modified).toBe(true);
  });
});
