import { useRef, useCallback, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useMonacoActions } from "../../hooks/useMonacoActions";

interface EditorProps {
  /** Override which tab to edit. Defaults to store's activeTabId. */
  tabId?: string;
}

export function Editor({ tabId }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const storeActiveTabId = useEditorStore((s) => s.activeTabId);
  const activeTabId = tabId ?? storeActiveTabId;
  const tabs = useEditorStore((s) => s.tabs);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const updateTabCursor = useEditorStore((s) => s.updateTabCursor);

  const { handleMount } = useMonacoActions();
  const setEditorRef = useEditorRefStore((s) => s.setEditorRef);
  // Only update global editor ref if this is the primary editor
  const isPrimary = !tabId;

  // Read editor settings
  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const insertSpaces = useSettingsStore((s) => s.insertSpaces);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const renderWhitespace = useSettingsStore((s) => s.renderWhitespace);
  const showIndentGuides = useSettingsStore((s) => s.showIndentGuides);
  const showMinimap = useSettingsStore((s) => s.showMinimap);
  const bracketPairColorization = useSettingsStore((s) => s.bracketPairColorization);
  const smoothScrolling = useSettingsStore((s) => s.smoothScrolling);
  const theme = useSettingsStore((s) => s.theme);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Cleanup editor ref on unmount
  useEffect(() => {
    return () => {
      if (isPrimary) setEditorRef(null);
    };
  }, [setEditorRef, isPrimary]);

  const onMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Parameters<typeof handleMount>[1]) => {
      editorRef.current = editor;
      if (isPrimary) setEditorRef(editor);

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
    [handleMount, activeTabId, updateTabCursor, setEditorRef, isPrimary],
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
      theme={theme}
      onChange={handleChange}
      onMount={onMount}
      options={{
        fontSize,
        fontFamily,
        minimap: { enabled: showMinimap },
        scrollBeyondLastLine: false,
        wordWrap,
        lineNumbers,
        renderWhitespace,
        tabSize,
        insertSpaces,
        bracketPairColorization: { enabled: bracketPairColorization },
        automaticLayout: true,
        folding: true,
        foldingStrategy: "indentation",
        guides: { bracketPairs: bracketPairColorization, indentation: showIndentGuides },
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling,
        padding: { top: 8 },
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: "never",
        },
        columnSelection: true,
        multiCursorModifier: "alt",
        // Emmet abbreviation expansion (HTML/CSS/JSX/TSX)
        acceptSuggestionOnCommitCharacter: true,
        suggest: { showWords: true } as const,
      }}
    />
  );
}
