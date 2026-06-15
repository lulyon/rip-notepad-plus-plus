import { useRef, useCallback, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useMarkStore } from "../../stores/markStore";
import { useMonacoActions } from "../../hooks/useMonacoActions";
import { useUdlStore } from "../../stores/udlStore";
import { setMonaco, registerAllUdls } from "../../lib/udlCompiler";

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
  const setSecondaryEditorRef = useEditorRefStore((s) => s.setSecondaryEditorRef);
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
  const minimapShowSlider = useSettingsStore((s) => s.minimapShowSlider);
  const bracketPairColorization = useSettingsStore((s) => s.bracketPairColorization);
  const smoothScrolling = useSettingsStore((s) => s.smoothScrolling);
  const scrollBeyondLastLine = useSettingsStore((s) => s.scrollBeyondLastLine);
  const theme = useSettingsStore((s) => s.theme);
  const columnMode = useSettingsStore((s) => s.columnMode);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // ── Large file detection ──
  const contentLen = activeTab?.content?.length || 0;
  const isLargeFile = contentLen > 1_000_000;    // >1MB → disable IntelliSense
  const isVeryLargeFile = contentLen > 10_000_000; // >10MB → ultra-minimal mode

  // Cleanup editor ref on unmount
  useEffect(() => {
    return () => {
      if (isPrimary) setEditorRef(null);
      else setSecondaryEditorRef(null);
    };
  }, [setEditorRef, setSecondaryEditorRef, isPrimary]);

  // Store event listener cleanup refs so we can remove them on tab change
  const decorationCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup decorations on unmount
  useEffect(() => {
    return () => {
      decorationCleanupRef.current?.();
    };
  }, []);

  const onMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Parameters<typeof handleMount>[1]) => {
      editorRef.current = editor;
      if (isPrimary) setEditorRef(editor);
      else setSecondaryEditorRef(editor);

      // Register all keyboard actions
      handleMount(editor, monaco);

      // Store global monaco reference and register all UDL languages
      setMonaco(monaco);
      const udls = useUdlStore.getState().udls;
      registerAllUdls(udls);

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

      // ── Custom context menu (right-click on editor) ──
      editor.onContextMenu((e) => {
        e.event.preventDefault();
        const browserEvent = (e.event as any).browserEvent as MouseEvent;
        if (browserEvent) {
          window.dispatchEvent(new CustomEvent("editor-context-menu", {
            detail: { x: browserEvent.pageX, y: browserEvent.pageY },
          }));
        }
      });

      // ── Bookmark & Mark Decorations ──
      function getMarkDecorations() {
        const tabId = useEditorStore.getState().activeTabId;
        if (!tabId) return [];
        const marks = useMarkStore.getState().getMarks(tabId);
        return marks.map(m => ({
          range: { startLineNumber: m.line, startColumn: 1, endLineNumber: m.line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: `mark-style-${m.style}`,
            glyphMarginClassName: `mark-glyph-style-${m.style}`,
          },
        }));
      }

      const applyDecorations = () => {
        const tabId = useEditorStore.getState().activeTabId;
        if (!tabId) {
          editor.deltaDecorations([], []);
          return;
        }
        const bookmarks = useBookmarkStore.getState().getBookmarks(tabId);
        const bookmarkDecs = bookmarks.map(b => ({
          range: { startLineNumber: b.line, startColumn: 1, endLineNumber: b.line, endColumn: 1 },
          options: { glyphMarginClassName: 'bookmark-glyph' },
        }));
        const markDecs = getMarkDecorations();
        (editor as any).__bookmarkDecIds = editor.deltaDecorations(
          (editor as any).__bookmarkDecIds || [],
          bookmarkDecs,
        );
        (editor as any).__markDecIds = editor.deltaDecorations(
          (editor as any).__markDecIds || [],
          markDecs,
        );
      };

      const onBookmarksChanged = () => applyDecorations();
      const onMarksChanged = () => applyDecorations();

      window.addEventListener('bookmarks-changed', onBookmarksChanged);
      window.addEventListener('marks-changed', onMarksChanged);

      const contentChangeSub = editor.onDidChangeModelContent((e) => {
        setTimeout(applyDecorations, 50);
        // Track changed lines for change history navigation
        const tabId = useEditorStore.getState().activeTabId;
        if (tabId) {
          for (const change of e.changes) {
            const startLine = change.range.startLineNumber;
            const endLine = change.range.endLineNumber;
            for (let l = startLine; l <= endLine; l++) {
              useEditorStore.getState().addChangedLine(tabId, l);
            }
          }
          window.dispatchEvent(new CustomEvent("changed-lines-updated"));
        }
      });

      setTimeout(applyDecorations, 200);

      // Store cleanup function
      decorationCleanupRef.current = () => {
        window.removeEventListener('bookmarks-changed', onBookmarksChanged);
        window.removeEventListener('marks-changed', onMarksChanged);
        contentChangeSub.dispose();
      };
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
        minimap: {
          enabled: showMinimap && !isVeryLargeFile,
          renderCharacters: false,
          scale: 1,
          showSlider: minimapShowSlider,
          size: isVeryLargeFile ? undefined : "proportional",
        },
        scrollBeyondLastLine: isVeryLargeFile ? false : scrollBeyondLastLine,
        wordWrap: isVeryLargeFile ? "off" : wordWrap,
        lineNumbers,
        renderWhitespace: isVeryLargeFile ? "none" : renderWhitespace,
        tabSize,
        insertSpaces,
        bracketPairColorization: { enabled: bracketPairColorization && !isLargeFile },
        automaticLayout: !isVeryLargeFile,
        folding: !isVeryLargeFile,
        foldingStrategy: "indentation" as const,
        guides: { bracketPairs: bracketPairColorization && !isLargeFile, indentation: showIndentGuides && !isVeryLargeFile },
        cursorBlinking: isVeryLargeFile ? "solid" : "smooth",
        cursorSmoothCaretAnimation: isVeryLargeFile ? "off" : "on",
        smoothScrolling,
        padding: isVeryLargeFile ? { top: 4 } : { top: 8 },
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: "never",
        },
        columnSelection: columnMode,
        multiCursorModifier: "alt",
        acceptSuggestionOnCommitCharacter: !isLargeFile,
        suggest: { showWords: !isLargeFile } as const,
      }}
    />
  );
}
