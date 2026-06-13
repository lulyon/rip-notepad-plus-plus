import { create } from "zustand";
import type { editor } from "monaco-editor";

interface EditorRefState {
  editorRef: editor.IStandaloneCodeEditor | null;
  secondaryEditorRef: editor.IStandaloneCodeEditor | null;
  setEditorRef: (ref: editor.IStandaloneCodeEditor | null) => void;
  setSecondaryEditorRef: (ref: editor.IStandaloneCodeEditor | null) => void;
}

export const useEditorRefStore = create<EditorRefState>((set) => ({
  editorRef: null,
  secondaryEditorRef: null,
  setEditorRef: (ref) => set({ editorRef: ref }),
  setSecondaryEditorRef: (ref) => set({ secondaryEditorRef: ref }),
}));
