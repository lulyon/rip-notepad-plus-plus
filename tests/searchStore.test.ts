import { describe, it, expect, beforeEach } from "vitest";
import { useSearchStore } from "../src/stores/searchStore";

beforeEach(() => {
  useSearchStore.setState({
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
  });
});

describe("searchStore", () => {
  describe("initial state", () => {
    it("has correct initial values", () => {
      const s = useSearchStore.getState();
      expect(s.findText).toBe("");
      expect(s.replaceText).toBe("");
      expect(s.isRegex).toBe(false);
      expect(s.caseSensitive).toBe(false);
      expect(s.wholeWord).toBe(false);
      expect(s.wrapSearch).toBe(true);
      expect(s.findPanelOpen).toBe(false);
      expect(s.replaceMode).toBe(false);
      expect(s.findInFilesRoot).toBe("");
      expect(s.findInFilesFilePattern).toBe("*.*");
      expect(s.findInFilesResults).toEqual([]);
      expect(s.findInFilesSearching).toBe(false);
      expect(s.matchCount).toBe(0);
      expect(s.currentMatchIndex).toBe(-1);
    });
  });

  describe("setFindText", () => {
    it("sets the find text", () => {
      useSearchStore.getState().setFindText("hello");
      expect(useSearchStore.getState().findText).toBe("hello");
    });

    it("sets empty find text", () => {
      useSearchStore.getState().setFindText("hello");
      useSearchStore.getState().setFindText("");
      expect(useSearchStore.getState().findText).toBe("");
    });
  });

  describe("setReplaceText", () => {
    it("sets the replace text", () => {
      useSearchStore.getState().setReplaceText("world");
      expect(useSearchStore.getState().replaceText).toBe("world");
    });
  });

  describe("setOptions", () => {
    it("sets all options at once", () => {
      useSearchStore.getState().setOptions({
        isRegex: true,
        caseSensitive: true,
        wholeWord: true,
        wrapSearch: false,
      });
      const s = useSearchStore.getState();
      expect(s.isRegex).toBe(true);
      expect(s.caseSensitive).toBe(true);
      expect(s.wholeWord).toBe(true);
      expect(s.wrapSearch).toBe(false);
    });

    it("preserves existing options when partial", () => {
      useSearchStore.getState().setOptions({ isRegex: true });
      const s = useSearchStore.getState();
      expect(s.isRegex).toBe(true);
      expect(s.caseSensitive).toBe(false); // unchanged default
      expect(s.wholeWord).toBe(false); // unchanged default
      expect(s.wrapSearch).toBe(true); // unchanged default
    });

    it("ignores undefined values", () => {
      useSearchStore.getState().setOptions({ isRegex: true, caseSensitive: true });
      // Then call with partial
      useSearchStore.getState().setOptions({ wholeWord: true });
      const s = useSearchStore.getState();
      expect(s.isRegex).toBe(true); // preserved from previous
      expect(s.caseSensitive).toBe(true); // preserved from previous
      expect(s.wholeWord).toBe(true);
    });
  });

  describe("toggleFindPanel", () => {
    it("opens the find panel", () => {
      useSearchStore.getState().toggleFindPanel();
      const s = useSearchStore.getState();
      expect(s.findPanelOpen).toBe(true);
      expect(s.replaceMode).toBe(false);
      expect(s.matchCount).toBe(0);
    });

    it("closes the find panel", () => {
      useSearchStore.getState().toggleFindPanel(); // open
      useSearchStore.getState().toggleFindPanel(); // close
      const s = useSearchStore.getState();
      expect(s.findPanelOpen).toBe(false);
      expect(s.replaceMode).toBe(false);
    });

    it("resets replaceMode when opening find panel", () => {
      useSearchStore.getState().toggleReplacePanel(); // replaceMode = true
      useSearchStore.getState().toggleFindPanel(); // should close replace
      expect(useSearchStore.getState().replaceMode).toBe(false);
    });

    it("resets matchCount when toggling", () => {
      useSearchStore.setState({ matchCount: 5 });
      useSearchStore.getState().toggleFindPanel();
      expect(useSearchStore.getState().matchCount).toBe(0);
    });
  });

  describe("toggleReplacePanel", () => {
    it("opens replace panel when find panel is closed", () => {
      useSearchStore.getState().toggleReplacePanel();
      const s = useSearchStore.getState();
      expect(s.findPanelOpen).toBe(true);
      expect(s.replaceMode).toBe(true);
    });

    it("toggles replaceMode when find panel is open", () => {
      useSearchStore.getState().toggleFindPanel(); // open find
      useSearchStore.getState().toggleReplacePanel(); // enable replace
      expect(useSearchStore.getState().replaceMode).toBe(true);

      useSearchStore.getState().toggleReplacePanel(); // disable replace
      expect(useSearchStore.getState().replaceMode).toBe(false);
      expect(useSearchStore.getState().findPanelOpen).toBe(true); // stays open
    });

    it("resets matchCount when toggling replace", () => {
      useSearchStore.setState({ matchCount: 5 });
      useSearchStore.getState().toggleReplacePanel();
      expect(useSearchStore.getState().matchCount).toBe(0);
    });
  });

  describe("closePanel", () => {
    it("closes both find and replace panels", () => {
      useSearchStore.getState().toggleFindPanel();
      useSearchStore.getState().toggleReplacePanel();
      useSearchStore.getState().closePanel();
      const s = useSearchStore.getState();
      expect(s.findPanelOpen).toBe(false);
      expect(s.replaceMode).toBe(false);
    });
  });

  describe("setFindInFilesRoot", () => {
    it("sets the root directory", () => {
      useSearchStore.getState().setFindInFilesRoot("/project/src");
      expect(useSearchStore.getState().findInFilesRoot).toBe("/project/src");
    });
  });

  describe("setFindInFilesFilePattern", () => {
    it("sets the file pattern", () => {
      useSearchStore.getState().setFindInFilesFilePattern("*.ts");
      expect(useSearchStore.getState().findInFilesFilePattern).toBe("*.ts");
    });
  });

  describe("clearFindInFilesResults", () => {
    it("clears find in files results", () => {
      useSearchStore.setState({
        findInFilesResults: [
          {
            path: "/test/file.ts",
            line_number: 1,
            line_content: "test",
            match_start: 0,
            match_length: 4,
          },
        ],
      });
      useSearchStore.getState().clearFindInFilesResults();
      expect(useSearchStore.getState().findInFilesResults).toEqual([]);
    });
  });

  describe("navigateToMatch", () => {
    it("dispatches a navigate-to-match custom event", () => {
      const match = {
        path: "/test/file.ts",
        line_number: 10,
        line_content: "const x = 1;",
        match_start: 6,
        match_length: 1,
      };

      let dispatchedEvent: CustomEvent | null = null;
      const handler = (e: Event) => {
        dispatchedEvent = e as CustomEvent;
      };
      window.addEventListener("navigate-to-match", handler);

      useSearchStore.getState().navigateToMatch(match);

      expect(dispatchedEvent).not.toBeNull();
      expect(dispatchedEvent!.detail).toEqual(match);

      window.removeEventListener("navigate-to-match", handler);
    });
  });
});
