import { create } from "zustand";
import type { editor } from "monaco-editor";
import type { SearchMatch } from "../types/ipc";
import { ipc } from "../lib/ipc";

export interface SearchState {
  // ── Find/Replace ──
  findText: string;
  replaceText: string;
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  wrapSearch: boolean;

  // ── Panel visibility ──
  findPanelOpen: boolean;
  replaceMode: boolean;

  // ── Find in Files ──
  findInFilesRoot: string;
  findInFilesFilePattern: string;
  findInFilesResults: SearchMatch[];
  findInFilesSearching: boolean;

  // ── Match stats ──
  matchCount: number;
  currentMatchIndex: number;

  // ── Actions ──
  setFindText: (text: string) => void;
  setReplaceText: (text: string) => void;
  setOptions: (opts: Partial<{
    isRegex: boolean;
    caseSensitive: boolean;
    wholeWord: boolean;
    wrapSearch: boolean;
  }>) => void;
  toggleFindPanel: () => void;
  toggleReplacePanel: () => void;
  closePanel: () => void;
  setFindInFilesRoot: (dir: string) => void;
  setFindInFilesFilePattern: (pattern: string) => void;

  // ── Operations (need editor ref) ──
  find: (editor: editor.IStandaloneCodeEditor) => void;
  findNext: (editor: editor.IStandaloneCodeEditor) => void;
  findPrev: (editor: editor.IStandaloneCodeEditor) => void;
  replaceOne: (editor: editor.IStandaloneCodeEditor) => void;
  replaceAll: (editor: editor.IStandaloneCodeEditor) => void;
  markAll: (editor: editor.IStandaloneCodeEditor) => void;
  findInFiles: () => Promise<void>;
  clearFindInFilesResults: () => void;
  navigateToMatch: (match: SearchMatch) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  findText: "",
  replaceText: "",
  isRegex: false,
  caseSensitive: false,
  wholeWord: false,
  wrapSearch: true,
  findPanelOpen: false,
  replaceMode: false,
  findInFilesRoot: "",
  findInFilesFilePattern: "*.*",
  findInFilesResults: [],
  findInFilesSearching: false,
  matchCount: 0,
  currentMatchIndex: -1,

  setFindText: (text) => set({ findText: text }),
  setReplaceText: (text) => set({ replaceText: text }),

  setOptions: (opts) => {
    set((s) => ({
      isRegex: opts.isRegex ?? s.isRegex,
      caseSensitive: opts.caseSensitive ?? s.caseSensitive,
      wholeWord: opts.wholeWord ?? s.wholeWord,
      wrapSearch: opts.wrapSearch ?? s.wrapSearch,
    }));
  },

  toggleFindPanel: () => {
    set((s) => ({
      findPanelOpen: !s.findPanelOpen,
      replaceMode: false,
      matchCount: 0,
    }));
  },

  toggleReplacePanel: () => {
    set((s) => ({
      findPanelOpen: s.replaceMode && s.findPanelOpen ? s.findPanelOpen : true,
      replaceMode: !s.replaceMode,
      matchCount: 0,
    }));
  },

  closePanel: () => {
    set({ findPanelOpen: false, replaceMode: false });
  },

  setFindInFilesRoot: (dir) => set({ findInFilesRoot: dir }),
  setFindInFilesFilePattern: (pattern) => set({ findInFilesFilePattern: pattern }),

  // ── Monaco-backed operations ──
  find: (editor) => {
    const state = get();
    if (!state.findText) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      state.findText,
      true, // search only in visible range? false = search all
      state.isRegex,
      state.caseSensitive,
      state.wholeWord ? state.findText : null,
      !state.wrapSearch, // searchOnlyEditableRange?
    );

    set({ matchCount: matches.length, currentMatchIndex: -1 });

    if (matches.length > 0) {
      editor.setSelection(matches[0].range);
      editor.revealRangeInCenter(matches[0].range);
      set({ currentMatchIndex: 0 });
    }
  },

  findNext: (editor) => {
    const state = get();
    if (state.matchCount === 0) {
      state.find(editor);
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      state.findText,
      false,
      state.isRegex,
      state.caseSensitive,
      state.wholeWord ? state.findText : null,
      !state.wrapSearch,
    );

    if (matches.length === 0) return;

    const nextIdx = (state.currentMatchIndex + 1) % matches.length;
    editor.setSelection(matches[nextIdx].range);
    editor.revealRangeInCenter(matches[nextIdx].range);
    set({ currentMatchIndex: nextIdx, matchCount: matches.length });
  },

  findPrev: (editor) => {
    const state = get();
    if (state.matchCount === 0) {
      state.find(editor);
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      state.findText,
      false,
      state.isRegex,
      state.caseSensitive,
      state.wholeWord ? state.findText : null,
      !state.wrapSearch,
    );

    if (matches.length === 0) return;

    const prevIdx =
      (state.currentMatchIndex - 1 + matches.length) % matches.length;
    editor.setSelection(matches[prevIdx].range);
    editor.revealRangeInCenter(matches[prevIdx].range);
    set({ currentMatchIndex: prevIdx, matchCount: matches.length });
  },

  replaceOne: (editor) => {
    const state = get();
    const model = editor.getModel();
    if (!model) return;

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      state.findNext(editor);
      return;
    }

    const selectedText = model.getValueInRange(selection);
    let matches = selectedText === state.findText;
    if (state.isRegex) {
      try { matches = new RegExp(state.findText).test(selectedText); } catch { return; }
    }
    if (matches) {
      editor.executeEdits("replace", [
        { range: selection, text: state.replaceText },
      ]);
      set((s) => ({ matchCount: Math.max(0, s.matchCount - 1) }));
    }

    state.findNext(editor);
  },

  replaceAll: (editor) => {
    const state = get();
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      state.findText,
      false,
      state.isRegex,
      state.caseSensitive,
      state.wholeWord ? state.findText : null,
      !state.wrapSearch,
    );

    if (matches.length === 0) return;

    // Apply replacements in reverse to preserve ranges
    const edits = matches.map((m) => ({
      range: m.range,
      text: state.replaceText,
    }));
    editor.executeEdits("replace-all", edits);

    set({ matchCount: 0, currentMatchIndex: -1 });
    return;
  },

  markAll: (editor) => {
    const state = get();
    if (!state.findText) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      state.findText,
      false,
      state.isRegex,
      state.caseSensitive,
      state.wholeWord ? state.findText : null,
      !state.wrapSearch,
    );

    // Apply decorations for all matches
    const decorations = matches.map((m) => ({
      range: m.range,
      options: {
        className: "find-match-highlight",
        inlineClassName: "find-match-inline",
      },
    }));

    model.deltaDecorations(
      (model as unknown as Record<string, string[]>)._findDecorations || [],
      decorations,
    );
    (model as unknown as Record<string, string[]>)._findDecorations =
      decorations.map((d) => d.options.className);
  },

  findInFiles: async () => {
    const state = get();
    if (!state.findText || !state.findInFilesRoot) return;

    set({ findInFilesSearching: true, findInFilesResults: [] });

    try {
      const results = await ipc.findInFiles({
        root_dir: state.findInFilesRoot,
        query: state.findText,
        is_regex: state.isRegex,
        case_sensitive: state.caseSensitive,
        whole_word: state.wholeWord,
        file_pattern: state.findInFilesFilePattern || undefined,
        max_results: 200,
      });
      set({ findInFilesResults: results });
    } catch (err) {
      console.error("Find in files failed:", err);
    } finally {
      set({ findInFilesSearching: false });
    }
  },

  clearFindInFilesResults: () => set({ findInFilesResults: [] }),

  navigateToMatch: (match) => {
    // Dispatch event for App to handle: open file at line
    window.dispatchEvent(
      new CustomEvent("navigate-to-match", { detail: match }),
    );
  },
}));
