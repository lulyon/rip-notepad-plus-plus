import { useRef, useCallback } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEditorStore } from "../../stores/editorStore";

export function Editor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register keyboard shortcuts
    editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        // TODO: implement save via Tauri dialog
        console.log("Save triggered");
      },
    });
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateTabContent(activeTabId, value);
      }
    },
    [activeTabId, updateTabContent],
  );

  if (!activeTab) {
    return null;
  }

  return (
    <MonacoEditor
      key={activeTab.id}
      height="100%"
      language={activeTab.language}
      value={activeTab.content}
      theme="vs-dark"
      onChange={handleChange}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily:
          "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: "off",
        lineNumbers: "on",
        renderWhitespace: "selection",
        tabSize: 4,
        insertSpaces: true,
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
        suggest: { showWords: true },
        folding: true,
        foldingStrategy: "indentation",
        guides: { bracketPairs: true, indentation: true },
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        padding: { top: 8 },
      }}
    />
  );
}
