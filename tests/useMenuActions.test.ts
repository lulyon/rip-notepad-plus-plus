import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMenuActions } from "../src/hooks/useMenuActions";
import { useEditorStore } from "../src/stores/editorStore";
import { useSearchStore } from "../src/stores/searchStore";
import { useEncodingStore } from "../src/stores/encodingStore";
import { useSettingsStore } from "../src/stores/settingsStore";
import { useEditorRefStore } from "../src/stores/editorRefStore";
import { useMacroStore } from "../src/stores/macroStore";

// ── Hoisted IPC mock ──
const mockIpc = vi.hoisted(() => ({
  readFile: vi.fn().mockResolvedValue({ content: "test", encoding: "UTF-8", detected_by_bom: false }),
  writeFile: vi.fn().mockResolvedValue(undefined),
  saveSession: vi.fn().mockResolvedValue(undefined),
  listEncodings: vi.fn().mockResolvedValue([]),
  encodeWithEncoding: vi.fn().mockResolvedValue(new Uint8Array()),
  decodeWithEncoding: vi.fn().mockResolvedValue(""),
  findInFiles: vi.fn().mockResolvedValue([]),
  fileExists: vi.fn().mockResolvedValue(false),
  listDirectory: vi.fn().mockResolvedValue([]),
}));

// ── Hoisted Tauri mocks ──
const mockDialog = vi.hoisted(() => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
}));

const mockWindow = vi.hoisted(() => ({
  setTitle: vi.fn().mockResolvedValue(undefined),
  onDragDropEvent: vi.fn().mockResolvedValue(vi.fn()),
  isFullscreen: vi.fn().mockResolvedValue(false),
  setFullscreen: vi.fn().mockResolvedValue(undefined),
  isAlwaysOnTop: vi.fn().mockResolvedValue(false),
  setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/lib/ipc", () => ({ ipc: mockIpc }));
vi.mock("@tauri-apps/plugin-dialog", () => mockDialog);
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => mockWindow),
}));

// ── Helpers ──
const TAB_WITH_PATH = {
  id: "tab-1", path: "/path/file.txt", name: "file.txt",
  content: "content", encoding: "UTF-8", modified: false,
  language: "plaintext", cursorLine: 1, cursorColumn: 1,
};

const TAB_NO_PATH = {
  id: "tab-2", path: null, name: "new 1",
  content: "hello", encoding: "UTF-8", modified: false,
  language: "plaintext", cursorLine: 1, cursorColumn: 1,
};

function dispatch(actionId: string) {
  window.dispatchEvent(new CustomEvent("menu-action", { detail: actionId }));
}

/** Create a minimal mock editor for actions that call editorRef methods */
function createMockEditor() {
  return {
    trigger: vi.fn(),
    focus: vi.fn(),
    getModel: vi.fn(() => ({
      getLinesContent: vi.fn(() => ["line1", "line2", "line3"]),
      getFullModelRange: vi.fn(() => ({
        startLineNumber: 1, startColumn: 1,
        endLineNumber: 3, endColumn: 6,
      })),
      getValue: vi.fn(() => "<root><item/></root>"),
      getEOL: vi.fn(() => "\n"),
      findMatches: vi.fn(() => []),
    })),
    executeEdits: vi.fn(),
    getSelection: vi.fn(() => null),
    getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
    updateOptions: vi.fn(),
    addAction: vi.fn(),
  };
}

function resetStores() {
  useEditorStore.setState({
    tabs: [], activeTabId: null, secondaryTabId: null,
    unsavedTabs: null, pendingCloseAll: false,
  });
  useSearchStore.setState({
    findText: "", replaceText: "", isRegex: false,
    caseSensitive: false, wholeWord: false, wrapSearch: true,
    findPanelOpen: false, replaceMode: false,
    findInFilesRoot: "", findInFilesFilePattern: "*.*",
    findInFilesResults: [], findInFilesSearching: false,
    matchCount: 0, currentMatchIndex: -1,
  });
  useSettingsStore.setState({
    showSidebar: false, fullScreen: false, alwaysOnTop: false,
    wordWrap: "off", renderWhitespace: "selection",
    showIndentGuides: true, lineNumbers: "on", showMinimap: true,
    splitView: "none", fontSize: 13, projectRoot: null,
  });
  useMacroStore.setState({
    isRecording: false, isPlaying: false, recordedActions: [],
    recordingName: "", recordingStartTime: 0, savedMacros: [],
    currentMacroName: null, playbackSpeed: 1,
  });
  useEditorRefStore.setState({ editorRef: null, secondaryEditorRef: null });
}

describe("useMenuActions", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe("File actions", () => {
    it("file.new creates a new tab", async () => {
      renderHook(() => useMenuActions());
      dispatch("file.new");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs).toHaveLength(1);
    });

    it("file.save calls writeFile when tab has path", async () => {
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());
      dispatch("file.save");
      await Promise.resolve();
      expect(mockIpc.writeFile).toHaveBeenCalledWith("/path/file.txt", "content", "UTF-8");
    });

    it("file.saveAs opens save dialog when tab has no path", async () => {
      useEditorStore.setState({ tabs: [TAB_NO_PATH], activeTabId: "tab-2" });
      mockDialog.save.mockResolvedValueOnce("/path/saved.txt");
      renderHook(() => useMenuActions());
      dispatch("file.saveAs");
      await Promise.resolve();
      expect(mockDialog.save).toHaveBeenCalled();
      expect(mockIpc.writeFile).toHaveBeenCalledWith("/path/saved.txt", "hello", "UTF-8");
    });

    it("file.close calls closeTab on active tab", async () => {
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());
      dispatch("file.close");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });

    it("file.closeAll calls closeAllTabs", async () => {
      const tab1 = useEditorStore.getState().newTab();
      useEditorStore.getState().newTab();
      useEditorStore.setState({ activeTabId: tab1 });
      renderHook(() => useMenuActions());
      dispatch("file.closeAll");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });
  });

  describe("Edit actions", () => {
    it("edit.undo/redo triggers Monaco editor", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.undo");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "undo", null);

      dispatch("edit.redo");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "redo", null);
    });

    it("edit.copy/cut/paste/delete/selectAll trigger Monaco editor", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.copy");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.clipboardCopyAction", null);

      dispatch("edit.cut");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.clipboardCutAction", null);

      dispatch("edit.paste");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.clipboardPasteAction", null);

      dispatch("edit.delete");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "deleteRight", null);

      dispatch("edit.selectAll");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.selectAll", null);
    });

    it("edit.duplicateLine/deleteLine/moveLineUp/moveLineDown trigger Monaco editor", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.duplicateLine");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.copyLinesDownAction", null);

      dispatch("edit.deleteLine");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.deleteLines", null);

      dispatch("edit.moveLineUp");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.moveLinesUpAction", null);

      dispatch("edit.moveLineDown");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.moveLinesDownAction", null);
    });

    it("edit.trimTrailing/toUpper/toLower trigger Monaco editor", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.trimTrailing");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.trimTrailingWhitespace", null);

      dispatch("edit.toUpper");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.transformToUppercase", null);

      dispatch("edit.toLower");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.action.transformToLowercase", null);
    });

    it("edit.removeEmptyLines removes blank lines", async () => {
      const mockModel = {
        getLinesContent: vi.fn(() => ["hello", "", "world", ""]),
        getFullModelRange: vi.fn(() => ({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 4, endColumn: 6,
        })),
        getEOL: vi.fn(() => "\n"),
      };
      const editor = { ...createMockEditor(), getModel: vi.fn(() => mockModel) };
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.removeEmptyLines");
      await Promise.resolve();

      expect(editor.executeEdits).toHaveBeenCalledWith("remove-empty-lines", [
        { range: expect.any(Object), text: "hello\nworld" },
      ]);
    });

    it("edit.copyFilePath copies to clipboard", async () => {
      const clipboardWrite = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: clipboardWrite },
        writable: true,
      });
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());

      dispatch("edit.copyFilePath");
      await Promise.resolve();
      expect(clipboardWrite).toHaveBeenCalledWith("/path/file.txt");
    });

    it("edit.copyFileName copies just the file name", async () => {
      const clipboardWrite = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: clipboardWrite },
        writable: true,
      });
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());

      dispatch("edit.copyFileName");
      await Promise.resolve();
      expect(clipboardWrite).toHaveBeenCalledWith("file.txt");
    });

    it("edit.copyDirPath copies directory path", async () => {
      const clipboardWrite = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: clipboardWrite },
        writable: true,
      });
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());

      dispatch("edit.copyDirPath");
      await Promise.resolve();
      expect(clipboardWrite).toHaveBeenCalledWith("/path");
    });

    it("edit.insertDateTime inserts current date string", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.insertDateTime");
      await Promise.resolve();

      expect(editor.trigger).toHaveBeenCalled();
      const call = editor.trigger.mock.calls[0];
      expect(call[0]).toBe("keyboard");
      expect(call[1]).toBe("type");
      expect(typeof call[2].text).toBe("string");
      expect(call[2].text).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it("edit.sortAscending sorts lines", async () => {
      const mockModel = {
        getLinesContent: vi.fn(() => ["banana", "apple", "cherry"]),
        getFullModelRange: vi.fn(() => ({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 3, endColumn: 7,
        })),
        getEOL: vi.fn(() => "\n"),
      };
      const editor = { ...createMockEditor(), getModel: vi.fn(() => mockModel) };
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.sortAscending");
      await Promise.resolve();

      expect(editor.executeEdits).toHaveBeenCalledWith("sort", [
        { range: expect.any(Object), text: "apple\nbanana\ncherry" },
      ]);
    });

    it("edit.sortDescending sorts lines in reverse", async () => {
      const mockModel = {
        getLinesContent: vi.fn(() => ["apple", "banana", "cherry"]),
        getFullModelRange: vi.fn(() => ({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 3, endColumn: 7,
        })),
        getEOL: vi.fn(() => "\n"),
      };
      const editor = { ...createMockEditor(), getModel: vi.fn(() => mockModel) };
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.sortDescending");
      await Promise.resolve();

      expect(editor.executeEdits).toHaveBeenCalledWith("sort", [
        { range: expect.any(Object), text: "cherry\nbanana\napple" },
      ]);
    });

    it("edit.removeDupLines removes duplicate lines", async () => {
      const mockModel = {
        getLinesContent: vi.fn(() => ["a", "b", "a", "c", "b"]),
        getFullModelRange: vi.fn(() => ({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 5, endColumn: 2,
        })),
        getEOL: vi.fn(() => "\n"),
      };
      const editor = { ...createMockEditor(), getModel: vi.fn(() => mockModel) };
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("edit.removeDupLines");
      await Promise.resolve();

      expect(editor.executeEdits).toHaveBeenCalledWith("dedup", [
        { range: expect.any(Object), text: "a\nb\nc" },
      ]);
    });

    it("edit.formatXml and validateXml handle XML", async () => {
      const mockModel = {
        getValue: vi.fn(() => "<root><item/></root>"),
        getFullModelRange: vi.fn(() => ({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 1, endColumn: 21,
        })),
        getLinesContent: vi.fn(() => ["<root><item/></root>"]),
        getEOL: vi.fn(() => "\n"),
      };
      const editor = { ...createMockEditor(), getModel: vi.fn(() => mockModel) };
      useEditorRefStore.setState({ editorRef: editor as any });

      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      renderHook(() => useMenuActions());

      dispatch("edit.formatXml");
      await Promise.resolve();
      expect(editor.executeEdits).toHaveBeenCalled();

      alertSpy.mockClear();
      dispatch("edit.validateXml");
      await Promise.resolve();
      expect(alertSpy).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe("Search actions", () => {
    it("search.find toggles find panel", async () => {
      const toggleSpy = vi.fn();
      window.addEventListener("toggle-find-panel", toggleSpy);
      renderHook(() => useMenuActions());

      dispatch("search.find");
      await Promise.resolve();
      expect(toggleSpy).toHaveBeenCalled();
      window.removeEventListener("toggle-find-panel", toggleSpy);
    });

    it("search.findNext/findPrev call searchStore methods", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      const findNextSpy = vi.spyOn(useSearchStore.getState(), "findNext");
      const findPrevSpy = vi.spyOn(useSearchStore.getState(), "findPrev");
      renderHook(() => useMenuActions());

      dispatch("search.findNext");
      await Promise.resolve();
      expect(findNextSpy).toHaveBeenCalledWith(editor);

      dispatch("search.findPrev");
      await Promise.resolve();
      expect(findPrevSpy).toHaveBeenCalledWith(editor);
    });

    it("search.goTo dispatches open-go-to-line event", async () => {
      const goToSpy = vi.fn();
      window.addEventListener("open-go-to-line", goToSpy);
      renderHook(() => useMenuActions());

      dispatch("search.goTo");
      await Promise.resolve();
      expect(goToSpy).toHaveBeenCalled();
      window.removeEventListener("open-go-to-line", goToSpy);
    });

    it("search.findInFiles sets root from tab path", async () => {
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());

      dispatch("search.findInFiles");
      await Promise.resolve();
      const root = useSearchStore.getState().findInFilesRoot;
      expect(root).toBe("/path");
    });

    it("search.markAll calls searchStore method", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      const markAllSpy = vi.spyOn(useSearchStore.getState(), "markAll");
      renderHook(() => useMenuActions());

      dispatch("search.markAll");
      await Promise.resolve();
      expect(markAllSpy).toHaveBeenCalledWith(editor);
    });
  });

  describe("View actions", () => {
    it("view.wordWrap toggles wordWrap setting", async () => {
      useSettingsStore.setState({ wordWrap: "off" });
      renderHook(() => useMenuActions());

      dispatch("view.wordWrap");
      await Promise.resolve();
      expect(useSettingsStore.getState().wordWrap).toBe("on");

      dispatch("view.wordWrap");
      await Promise.resolve();
      expect(useSettingsStore.getState().wordWrap).toBe("off");
    });

    it("view.toggleSidebar toggles sidebar", async () => {
      useSettingsStore.setState({ showSidebar: false });
      renderHook(() => useMenuActions());

      dispatch("view.toggleSidebar");
      await Promise.resolve();
      expect(useSettingsStore.getState().showSidebar).toBe(true);
    });

    it("view.zoomIn/zoomOut adjusts fontSize", async () => {
      useSettingsStore.setState({ fontSize: 13 });
      renderHook(() => useMenuActions());

      dispatch("view.zoomIn");
      await Promise.resolve();
      expect(useSettingsStore.getState().fontSize).toBe(14);

      dispatch("view.zoomOut");
      await Promise.resolve();
      expect(useSettingsStore.getState().fontSize).toBe(13);
    });

    it("view.fullScreen calls Tauri fullscreen API", async () => {
      renderHook(() => useMenuActions());

      dispatch("view.fullScreen");
      await Promise.resolve();
      expect(mockWindow.isFullscreen).toHaveBeenCalled();
      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(true);
    });

    it("view.alwaysOnTop calls Tauri alwaysOnTop API", async () => {
      renderHook(() => useMenuActions());

      dispatch("view.alwaysOnTop");
      await Promise.resolve();
      expect(mockWindow.isAlwaysOnTop).toHaveBeenCalled();
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
    });

    it("view.splitNone/splitHorizontal/splitVertical set splitView", async () => {
      renderHook(() => useMenuActions());

      dispatch("view.splitHorizontal");
      await Promise.resolve();
      expect(useSettingsStore.getState().splitView).toBe("horizontal");

      dispatch("view.splitVertical");
      await Promise.resolve();
      expect(useSettingsStore.getState().splitView).toBe("vertical");

      dispatch("view.splitNone");
      await Promise.resolve();
      expect(useSettingsStore.getState().splitView).toBe("none");
    });

    it("view.foldAll/unfoldAll trigger Monaco editor", async () => {
      const editor = createMockEditor();
      useEditorRefStore.setState({ editorRef: editor as any });
      renderHook(() => useMenuActions());

      dispatch("view.foldAll");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.foldAll", null);

      dispatch("view.unfoldAll");
      await Promise.resolve();
      expect(editor.trigger).toHaveBeenCalledWith("keyboard", "editor.unfoldAll", null);
    });
  });

  describe("Encoding actions", () => {
    it("encoding.openDialog opens encoding dialog", async () => {
      const openSpy = vi.spyOn(useEncodingStore.getState(), "openEncodingDialog");
      renderHook(() => useMenuActions());

      dispatch("encoding.openDialog");
      await Promise.resolve();
      expect(openSpy).toHaveBeenCalled();
    });

    it("encoding.encodeUtf8 updates tab encoding to UTF-8", async () => {
      useEditorStore.setState({
        tabs: [{ ...TAB_WITH_PATH, id: "tab-1", encoding: "windows-1252" }],
        activeTabId: "tab-1",
      });
      renderHook(() => useMenuActions());

      dispatch("encoding.encodeUtf8");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs[0].encoding).toBe("UTF-8");
    });

    it("encoding.encodeUtf8Bom updates tab encoding to UTF-8-BOM", async () => {
      useEditorStore.setState({
        tabs: [{ ...TAB_WITH_PATH, id: "tab-1", encoding: "UTF-8" }],
        activeTabId: "tab-1",
      });
      renderHook(() => useMenuActions());

      dispatch("encoding.encodeUtf8Bom");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs[0].encoding).toBe("UTF-8-BOM");
    });
  });

  describe("Macro actions", () => {
    it("macro.startRecord/stopRecord toggles recording", async () => {
      renderHook(() => useMenuActions());

      dispatch("macro.startRecord");
      await Promise.resolve();
      expect(useMacroStore.getState().isRecording).toBe(true);

      dispatch("macro.stopRecord");
      await Promise.resolve();
      expect(useMacroStore.getState().isRecording).toBe(false);
    });

    it("macro.playback starts playback of first saved macro", async () => {
      useMacroStore.setState({
        savedMacros: [{ name: "my-macro", actions: [] }],
      });
      renderHook(() => useMenuActions());

      dispatch("macro.playback");
      await Promise.resolve();
      expect(useMacroStore.getState().currentMacroName).toBe("my-macro");
      expect(useMacroStore.getState().isPlaying).toBe(true);
    });

    it("macro.save saves recorded actions", async () => {
      useMacroStore.setState({
        recordedActions: [
          { actionType: "keypress", payload: { key: "a" }, timestamp: 0 },
        ],
      });
      renderHook(() => useMenuActions());

      dispatch("macro.save");
      await Promise.resolve();
      expect(useMacroStore.getState().savedMacros).toHaveLength(1);
    });
  });

  describe("Window actions", () => {
    it("window.nextTab/prevTab switches tabs", async () => {
      const tab1Id = useEditorStore.getState().newTab();
      const tab2Id = useEditorStore.getState().newTab();
      useEditorStore.setState({ activeTabId: tab1Id });
      renderHook(() => useMenuActions());

      dispatch("window.nextTab");
      await Promise.resolve();
      expect(useEditorStore.getState().activeTabId).toBe(tab2Id);

      dispatch("window.prevTab");
      await Promise.resolve();
      expect(useEditorStore.getState().activeTabId).toBe(tab1Id);
    });

    it("window.close closes active tab", async () => {
      useEditorStore.setState({ tabs: [TAB_WITH_PATH], activeTabId: "tab-1" });
      renderHook(() => useMenuActions());

      dispatch("window.close");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });

    it("window.closeAll closes all tabs", async () => {
      useEditorStore.getState().newTab();
      useEditorStore.getState().newTab();
      renderHook(() => useMenuActions());

      dispatch("window.closeAll");
      await Promise.resolve();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });
  });
});
