import { useRef, useCallback, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { useMonacoActions } from "../../hooks/useMonacoActions";

export function Editor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const updateTabCursor = useEditorStore((s) => s.updateTabCursor);

  const { handleMount } = useMonacoActions();
  const setEditorRef = useEditorRefStore((s) => s.setEditorRef);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Cleanup editor ref on unmount
  useEffect(() => {
    return () => {
      setEditorRef(null);
    };
  }, [setEditorRef]);

  const onMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Parameters<typeof handleMount>[1]) => {
      editorRef.current = editor;
      setEditorRef(editor);

      // Register all keyboard actions
      handleMount(editor, monaco);

      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        if (activeTabId) {
          updateTabCursor(
            activeTabId,
            e.position.lineNumber,
            e.position.column,
          );
        }
      });
    },
    [handleMount, activeTabId, updateTabCursor, setEditorRef],
  );

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
      onMount={onMount}
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
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: "never",
        },
      }}
    />
  );
}
