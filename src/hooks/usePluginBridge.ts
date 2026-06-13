import { useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useEditorRefStore } from "../stores/editorRefStore";
import { ipc } from "../lib/ipc";

/** Read real selection from active Monaco editor instance */
function getSelectionData() {
  const editor = useEditorRefStore.getState().editorRef;
  if (!editor) {
    return {
      selection_start_line: 1,
      selection_start_column: 1,
      selection_end_line: 1,
      selection_end_column: 1,
      has_selection: false,
    };
  }
  const sel = editor.getSelection();
  if (!sel || sel.isEmpty()) {
    const pos = editor.getPosition();
    return {
      selection_start_line: pos?.lineNumber ?? 1,
      selection_start_column: pos?.column ?? 1,
      selection_end_line: pos?.lineNumber ?? 1,
      selection_end_column: pos?.column ?? 1,
      has_selection: false,
    };
  }
  return {
    selection_start_line: sel.startLineNumber,
    selection_start_column: sel.startColumn,
    selection_end_line: sel.endLineNumber,
    selection_end_column: sel.endColumn,
    has_selection: !sel.isEmpty(),
  };
}

/**
 * Bridges editor events to the plugin system.
 * Pushes editor state updates to Rust cache and emits
 * notifications (fileOpened, fileSaved, fileClosed) to plugins.
 */
export function usePluginBridge() {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    const sel = getSelectionData();
    // Push editor state to Rust for plugin access
    if (activeTab) {
      ipc.updateEditorState({
        active_file_path: activeTab.path,
        active_file_name: activeTab.name,
        active_file_content: activeTab.content,
        active_file_language: activeTab.language,
        active_file_encoding: activeTab.encoding,
        cursor_line: activeTab.cursorLine,
        cursor_column: activeTab.cursorColumn,
        tab_count: tabs.length,
        ...sel,
      }).catch(() => {});
    } else {
      ipc.updateEditorState({
        active_file_path: null,
        active_file_name: null,
        active_file_content: "",
        active_file_language: "plaintext",
        active_file_encoding: "UTF-8",
        cursor_line: 1,
        cursor_column: 1,
        tab_count: tabs.length,
        ...sel,
      }).catch(() => {});
    }
  }, [activeTab?.id, activeTab?.cursorLine, activeTab?.cursorColumn, activeTab?.content?.length ?? 0]);

  // Watch for tab events and notify plugins
  // We use a separate effect to avoid spamming on every keystroke
  const prevTabIds = useRef<Set<string>>(new Set());
  const prevModified = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const currentIds = new Set(tabs.map((t) => t.id));

    // File opened (new tab with path)
    for (const tab of tabs) {
      if (tab.path && !prevTabIds.current.has(tab.id)) {
        ipc.notifyPlugins("editor.fileOpened", {
          path: tab.path,
          name: tab.name,
          language: tab.language,
          encoding: tab.encoding,
        }).catch(() => {});
      }
    }

    // File saved (was modified, now not)
    for (const tab of tabs) {
      const wasModified = prevModified.current.get(tab.id) ?? false;
      if (wasModified && !tab.modified && tab.path) {
        ipc.notifyPlugins("editor.fileSaved", {
          path: tab.path,
          name: tab.name,
        }).catch(() => {});
      }
    }

    // File closed
    for (const prevId of prevTabIds.current) {
      if (!currentIds.has(prevId)) {
        ipc.notifyPlugins("editor.fileClosed", {
          tabId: prevId,
        }).catch(() => {});
      }
    }

    prevTabIds.current = currentIds;
    prevModified.current = new Map(tabs.map((t) => [t.id, t.modified]));
  }, [tabs]);

  // Also expose a way for the plugin store to refresh state on command
  useEffect(() => {
    function handleRefresh() {
      const tab = useEditorStore.getState().tabs.find(
        (t) => t.id === useEditorStore.getState().activeTabId,
      );
      if (tab) {
        const sel = getSelectionData();
        ipc.updateEditorState({
          active_file_path: tab.path,
          active_file_name: tab.name,
          active_file_content: tab.content,
          active_file_language: tab.language,
          active_file_encoding: tab.encoding,
          cursor_line: tab.cursorLine,
          cursor_column: tab.cursorColumn,
          tab_count: useEditorStore.getState().tabs.length,
          ...sel,
        }).catch(() => {});
      }
    }
    window.addEventListener("plugin-refresh-editor-state", handleRefresh);
    return () =>
      window.removeEventListener("plugin-refresh-editor-state", handleRefresh);
  }, []);
}
