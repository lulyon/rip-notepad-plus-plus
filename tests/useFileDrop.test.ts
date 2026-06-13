import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileDrop } from "../src/hooks/useFileDrop";
import { useEditorStore } from "../src/stores/editorStore";
import { useSettingsStore } from "../src/stores/settingsStore";

// ── Hoisted mocks ──
const mockIpc = vi.hoisted(() => ({
  fileExists: vi.fn().mockResolvedValue(true),
  listDirectory: vi.fn().mockRejectedValue(new Error("not a dir")),
  readFile: vi.fn().mockResolvedValue({ content: "file content", encoding: "UTF-8", detected_by_bom: false }),
  saveSession: vi.fn().mockResolvedValue(undefined),
}));

let dragDropCallback: ((event: any) => void) | null = null;

const mockOnDragDropEvent = vi.hoisted(() => vi.fn((cb: any) => {
  dragDropCallback = cb;
  return Promise.resolve(vi.fn());
}));

vi.mock("../src/lib/ipc", () => ({ ipc: mockIpc }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    onDragDropEvent: mockOnDragDropEvent,
  })),
}));

describe("useFileDrop", () => {
  beforeEach(() => {
    dragDropCallback = null;
    vi.clearAllMocks();
    mockIpc.fileExists.mockResolvedValue(true);
    mockIpc.listDirectory.mockRejectedValue(new Error("not a dir"));
    mockIpc.readFile.mockResolvedValue({ content: "file content", encoding: "UTF-8", detected_by_bom: false });

    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
      secondaryTabId: null,
      unsavedTabs: null,
      pendingCloseAll: false,
    });
    useSettingsStore.setState({
      showSidebar: false,
      projectRoot: null,
    });
  });

  async function simulateDrop(paths: string[]) {
    renderHook(() => useFileDrop());
    // Wait for the effect (async setup of drag-drop listener)
    await Promise.resolve();
    await Promise.resolve();

    // Trigger the drag-drop event callback
    if (dragDropCallback) {
      await act(async () => {
        dragDropCallback!({ payload: { type: "drop", paths } });
      });
    }
    // Flush any pending promises from async handlers
    await Promise.resolve();
    await Promise.resolve();
  }

  it("handles file drop event", async () => {
    await simulateDrop(["/path/to/document.txt"]);

    expect(mockIpc.readFile).toHaveBeenCalledWith("/path/to/document.txt");
    const tabs = useEditorStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].name).toBe("document.txt");
    expect(tabs[0].path).toBe("/path/to/document.txt");
  });

  it("handles directory drop (sets projectRoot)", async () => {
    mockIpc.listDirectory.mockResolvedValue([{ name: "subfile.txt", path: "/myproject/subfile.txt", is_dir: false, size: 100, extension: "txt" }]);

    await simulateDrop(["/myproject"]);

    expect(mockIpc.listDirectory).toHaveBeenCalledWith("/myproject");
    expect(useSettingsStore.getState().projectRoot).toBe("/myproject");
    // Sidebar should be auto-opened
    expect(useSettingsStore.getState().showSidebar).toBe(true);
    // readFile should NOT be called for a directory
    expect(mockIpc.readFile).not.toHaveBeenCalled();
  });

  it("handles binary file detection (skips binary drop)", async () => {
    await simulateDrop(["/path/to/image.png"]);

    // Should not open binary files
    expect(mockIpc.readFile).not.toHaveBeenCalled();
    const tabs = useEditorStore.getState().tabs;
    expect(tabs).toHaveLength(0);
  });
});
