import { describe, it, expect, beforeEach } from "vitest";
import type { editor } from "monaco-editor";
import { useEditorRefStore } from "../src/stores/editorRefStore";

beforeEach(() => {
  useEditorRefStore.setState({
    editorRef: null,
    secondaryEditorRef: null,
  });
});

describe("editorRefStore", () => {
  describe("initial state", () => {
    it("starts with null editor refs", () => {
      const s = useEditorRefStore.getState();
      expect(s.editorRef).toBeNull();
      expect(s.secondaryEditorRef).toBeNull();
    });
  });

  describe("setEditorRef", () => {
    it("sets the editor ref to a Monaco editor instance", () => {
      const mockEditor = {
        getValue: () => "test",
        getModel: () => null,
      } as unknown as editor.IStandaloneCodeEditor;

      useEditorRefStore.getState().setEditorRef(mockEditor);

      expect(useEditorRefStore.getState().editorRef).toBe(mockEditor);
    });

    it("sets the editor ref back to null", () => {
      const mockEditor = {} as editor.IStandaloneCodeEditor;
      useEditorRefStore.getState().setEditorRef(mockEditor);
      useEditorRefStore.getState().setEditorRef(null);

      expect(useEditorRefStore.getState().editorRef).toBeNull();
    });

    it("replaces a previous editor ref", () => {
      const editor1 = { id: 1 } as unknown as editor.IStandaloneCodeEditor;
      const editor2 = { id: 2 } as unknown as editor.IStandaloneCodeEditor;

      useEditorRefStore.getState().setEditorRef(editor1);
      useEditorRefStore.getState().setEditorRef(editor2);

      expect(useEditorRefStore.getState().editorRef).toBe(editor2);
    });
  });

  describe("setSecondaryEditorRef", () => {
    it("sets the secondary editor ref", () => {
      const mockEditor = {
        getValue: () => "secondary",
      } as unknown as editor.IStandaloneCodeEditor;

      useEditorRefStore.getState().setSecondaryEditorRef(mockEditor);

      expect(useEditorRefStore.getState().secondaryEditorRef).toBe(mockEditor);
    });

    it("sets the secondary editor ref to null", () => {
      const mockEditor = {} as editor.IStandaloneCodeEditor;
      useEditorRefStore.getState().setSecondaryEditorRef(mockEditor);
      useEditorRefStore.getState().setSecondaryEditorRef(null);

      expect(useEditorRefStore.getState().secondaryEditorRef).toBeNull();
    });

    it("does not affect the primary editor ref", () => {
      const primaryMock = {} as editor.IStandaloneCodeEditor;
      const secondaryMock = {} as editor.IStandaloneCodeEditor;

      useEditorRefStore.getState().setEditorRef(primaryMock);
      useEditorRefStore.getState().setSecondaryEditorRef(secondaryMock);

      const s = useEditorRefStore.getState();
      expect(s.editorRef).toBe(primaryMock);
      expect(s.secondaryEditorRef).toBe(secondaryMock);
    });
  });
});
