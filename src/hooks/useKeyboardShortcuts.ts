import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";

/**
 * Global keyboard shortcuts that work outside the Monaco editor.
 * Editor-bound shortcuts are registered via useMonacoActions.
 */
export function useKeyboardShortcuts() {
  const newTab = useEditorStore((s) => s.newTab);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+Tab → next tab
      if (mod && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = (currentIdx + 1) % tabs.length;
        if (tabs[nextIdx]) setActiveTab(tabs[nextIdx].id);
        return;
      }

      // Ctrl+Shift+Tab → previous tab
      if (mod && e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        if (tabs[prevIdx]) setActiveTab(tabs[prevIdx].id);
        return;
      }

      // Ctrl+PageUp → previous tab (alt nav)
      if (mod && e.key === "PageUp") {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        if (tabs[prevIdx]) setActiveTab(tabs[prevIdx].id);
        return;
      }

      // Ctrl+PageDown → next tab (alt nav)
      if (mod && e.key === "PageDown") {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = (currentIdx + 1) % tabs.length;
        if (tabs[nextIdx]) setActiveTab(tabs[nextIdx].id);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, setActiveTab, closeTab, newTab]);
}
