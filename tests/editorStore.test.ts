import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../src/stores/editorStore";

// Reset store before each test
beforeEach(() => {
  useEditorStore.setState({
    tabs: [],
    activeTabId: null,
    secondaryTabId: null,
    unsavedTabs: null,
    pendingCloseAll: false,
  });
});

describe("editorStore", () => {
  describe("newTab", () => {
    it("creates a new tab with auto-incrementing name", () => {
      const id1 = useEditorStore.getState().newTab();
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].name).toBe("new 1");
      expect(state.activeTabId).toBe(id1);
      expect(state.tabs[0].modified).toBe(false);
      expect(state.tabs[0].encoding).toBe("UTF-8");
    });

    it("increments tab name counter", () => {
      useEditorStore.getState().newTab();
      useEditorStore.getState().newTab();
      const state = useEditorStore.getState();
      expect(state.tabs[0].name).toBe("new 1");
      expect(state.tabs[1].name).toBe("new 2");
    });

    it("generates unique ids", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      expect(id1).not.toBe(id2);
    });

    it("fills default values for all tab fields", () => {
      const id = useEditorStore.getState().newTab();
      const tab = useEditorStore.getState().getTab(id)!;
      expect(tab.path).toBeNull();
      expect(tab.content).toBe("");
      expect(tab.encoding).toBe("UTF-8");
      expect(tab.modified).toBe(false);
      expect(tab.language).toBe("plaintext");
      expect(tab.cursorLine).toBe(1);
      expect(tab.cursorColumn).toBe(1);
    });

    it("skips occupied new N names", () => {
      useEditorStore.getState().newTab(); // "new 1"
      useEditorStore.getState().newTab(); // "new 2"
      // Manually create a tab with name "new 3"
      const tabs = useEditorStore.getState().tabs;
      useEditorStore.setState({
        tabs: [
          ...tabs,
          {
            id: "manual-tab",
            path: null,
            name: "new 3",
            content: "",
            encoding: "UTF-8",
            modified: false,
            language: "plaintext",
            cursorLine: 1,
            cursorColumn: 1,
          },
        ],
      });
      const id4 = useEditorStore.getState().newTab(); // should be "new 4"
      expect(useEditorStore.getState().getTab(id4)?.name).toBe("new 4");
    });
  });

  describe("openTab", () => {
    it("opens a tab with provided data", () => {
      const id = useEditorStore.getState().openTab({
        path: "/test/file.ts",
        name: "file.ts",
        content: "const x = 1;",
        encoding: "UTF-8",
        language: "plaintext",
      });
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.activeTabId).toBe(id);
      expect(state.tabs[0].path).toBe("/test/file.ts");
      expect(state.tabs[0].content).toBe("const x = 1;");
      expect(state.tabs[0].modified).toBe(false);
      expect(state.tabs[0].cursorLine).toBe(1);
      expect(state.tabs[0].cursorColumn).toBe(1);
    });

    it("detects language from file extension", () => {
      const id = useEditorStore.getState().openTab({
        path: "/test/app.py",
        name: "app.py",
        content: "print('hi')",
        encoding: "UTF-8",
        language: "plaintext",
      });
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      // Language should be auto-detected from .py extension
      expect(tab?.language).toBe("python");
    });

    it("detects language from path with makefile extension", () => {
      const id = useEditorStore.getState().openTab({
        path: "/path/to/build.makefile",
        name: "build.makefile",
        content: "all:",
        encoding: "UTF-8",
        language: "plaintext",
      });
      const tab = useEditorStore.getState().getTab(id);
      expect(tab?.language).toBe("makefile");
    });

    it("falls back to plaintext when no extension is found", () => {
      const id = useEditorStore.getState().openTab({
        path: "/path/README",
        name: "README",
        content: "readme",
        encoding: "UTF-8",
        language: "plaintext",
      });
      const tab = useEditorStore.getState().getTab(id);
      expect(tab?.language).toBe("plaintext");
    });

    it("detects language from nested extension", () => {
      const id = useEditorStore.getState().openTab({
        path: "/test/component.tsx",
        name: "component.tsx",
        content: "const x: number = 1;",
        encoding: "UTF-8",
        language: "plaintext",
      });
      const tab = useEditorStore.getState().getTab(id);
      expect(tab?.language).toBe("typescript");
    });
  });

  describe("getTab", () => {
    it("finds tab by id", () => {
      const id = useEditorStore.getState().newTab();
      const tab = useEditorStore.getState().getTab(id);
      expect(tab).toBeDefined();
      expect(tab!.id).toBe(id);
    });

    it("returns undefined for missing id", () => {
      const tab = useEditorStore.getState().getTab("nonexistent");
      expect(tab).toBeUndefined();
    });
  });

  describe("closeTab", () => {
    it("removes the tab and shifts activeTabId", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.getState().setActiveTab(id2);

      useEditorStore.getState().closeTab(id1);
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe(id2);
    });

    it("sets activeTabId to null when last tab closed", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().closeTab(id);
      expect(useEditorStore.getState().activeTabId).toBeNull();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });

    it("shifts activeTabId to the previous tab when closing active tab at end", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      const id3 = useEditorStore.getState().newTab();
      useEditorStore.getState().setActiveTab(id3);

      useEditorStore.getState().closeTab(id3);
      const state = useEditorStore.getState();
      expect(state.activeTabId).toBe(id2);
    });

    it("shows unsaved dialog when closing modified tab", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "modified content");

      useEditorStore.getState().closeTab(id);
      const state = useEditorStore.getState();
      expect(state.unsavedTabs).not.toBeNull();
      expect(state.unsavedTabs).toHaveLength(1);
      expect(state.unsavedTabs![0].id).toBe(id);
      expect(state.tabs).toHaveLength(1); // Tab still exists
    });

    it("closes unmodified tab directly", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().closeTab(id);
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });

    it("shifts to next tab when closing first tab", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      const id3 = useEditorStore.getState().newTab();
      useEditorStore.getState().setActiveTab(id1);

      useEditorStore.getState().closeTab(id1);
      const state = useEditorStore.getState();
      expect(state.activeTabId).toBe(id2);
    });

    it("shifts to same index when closing middle tab", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      const id3 = useEditorStore.getState().newTab();
      useEditorStore.getState().setActiveTab(id2);

      useEditorStore.getState().closeTab(id2);
      const state = useEditorStore.getState();
      expect(state.activeTabId).toBe(id3);
    });

    it("leaves activeTabId unchanged when closing non-active tab", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.getState().setActiveTab(id2);

      useEditorStore.getState().closeTab(id1);
      expect(useEditorStore.getState().activeTabId).toBe(id2);
    });

    it("clears secondaryTabId when secondary tab is closed", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id2 });

      useEditorStore.getState().closeTab(id2);
      expect(useEditorStore.getState().secondaryTabId).toBeNull();
    });

    it("leaves secondaryTabId unchanged when non-secondary tab is closed", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id2 });

      useEditorStore.getState().closeTab(id1);
      expect(useEditorStore.getState().secondaryTabId).toBe(id2);
    });
  });

  describe("closeAllTabs", () => {
    it("clears all tabs", () => {
      useEditorStore.getState().newTab();
      useEditorStore.getState().newTab();
      useEditorStore.getState().closeAllTabs();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
      expect(useEditorStore.getState().activeTabId).toBeNull();
    });

    it("clears secondaryTabId when closing all tabs", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id2 });

      useEditorStore.getState().closeAllTabs();
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
      expect(state.secondaryTabId).toBeNull();
    });

    it("shows unsaved dialog when any tab is modified", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "changed");
      useEditorStore.getState().closeAllTabs();
      const state = useEditorStore.getState();
      expect(state.unsavedTabs).not.toBeNull();
      expect(state.pendingCloseAll).toBe(true);
      expect(state.tabs).toHaveLength(1); // Tabs still exist
    });
  });

  describe("closeOtherTabs", () => {
    it("keeps only the target tab", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      const id3 = useEditorStore.getState().newTab();

      useEditorStore.getState().closeOtherTabs(id2);
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe(id2);
      expect(state.activeTabId).toBe(id2);
    });

    it("keeps secondaryTabId when target tab is the secondary", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id2 });
      useEditorStore.getState().setActiveTab(id2);

      useEditorStore.getState().closeOtherTabs(id2);
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe(id2);
      expect(state.secondaryTabId).toBe(id2);
    });

    it("clears secondaryTabId when target tab is not the secondary", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id2 });

      useEditorStore.getState().closeOtherTabs(id1);
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe(id1);
      expect(state.secondaryTabId).toBeNull();
    });
  });

  describe("setActiveTab", () => {
    it("updates activeTabId", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().setActiveTab(id);
      expect(useEditorStore.getState().activeTabId).toBe(id);
    });
  });

  describe("updateTabContent", () => {
    it("updates content and marks as modified", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "new content");
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.content).toBe("new content");
      expect(tab?.modified).toBe(true);
    });
  });

  describe("updateTabLanguage", () => {
    it("updates language for a tab", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabLanguage(id, "json");
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.language).toBe("json");
    });

    it("updates only the targeted tab", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabLanguage(id1, "typescript");
      const tab1 = useEditorStore.getState().getTab(id1);
      const tab2 = useEditorStore.getState().getTab(id2);
      expect(tab1?.language).toBe("typescript");
      expect(tab2?.language).toBe("plaintext");
    });
  });

  describe("updateTabEncoding", () => {
    it("updates encoding for a tab", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabEncoding(id, "ASCII");
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.encoding).toBe("ASCII");
    });
  });

  describe("updateTabCursor", () => {
    it("updates cursor position", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabCursor(id, 10, 5);
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.cursorLine).toBe(10);
      expect(tab?.cursorColumn).toBe(5);
    });
  });

  describe("markTabSaved", () => {
    it("sets path, name, modified=false, and detects language", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "content");
      expect(useEditorStore.getState().tabs.find((t) => t.id === id)?.modified).toBe(true);

      useEditorStore.getState().markTabSaved(id, "/path/to/script.js");
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.path).toBe("/path/to/script.js");
      expect(tab?.name).toBe("script.js");
      expect(tab?.modified).toBe(false);
      expect(tab?.language).toBe("javascript");
    });
  });

  describe("renameTab", () => {
    it("updates path and name", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().renameTab(id, "/new/path/file.txt");
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.path).toBe("/new/path/file.txt");
      expect(tab?.name).toBe("file.txt");
      expect(tab?.modified).toBe(false);
    });

    it("handles windows backslash paths", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().renameTab(id, "C:\\Users\\test\\file.txt");
      const tab = useEditorStore.getState().getTab(id);
      expect(tab?.name).toBe("file.txt");
    });
  });

  describe("reloadTab", () => {
    it("replaces content and encoding, clears modified flag", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "stale content");
      expect(useEditorStore.getState().getTab(id)?.modified).toBe(true);

      useEditorStore.getState().reloadTab(id, "fresh content", "UTF-16");
      const tab = useEditorStore.getState().getTab(id);
      expect(tab?.content).toBe("fresh content");
      expect(tab?.encoding).toBe("UTF-16");
      expect(tab?.modified).toBe(false);
      expect(tab?.name).toBe("new 1"); // name/path unchanged
    });
  });

  describe("moveTab", () => {
    it("swaps tab positions", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      const id3 = useEditorStore.getState().newTab();

      useEditorStore.getState().moveTab(0, 2);
      const state = useEditorStore.getState();
      expect(state.tabs[0].id).toBe(id2);
      expect(state.tabs[1].id).toBe(id3);
      expect(state.tabs[2].id).toBe(id1);
    });

    it("no-ops on out-of-bounds indices", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();

      useEditorStore.getState().moveTab(0, 5); // out of bounds
      const state = useEditorStore.getState();
      expect(state.tabs[0].id).toBe(id1); // unchanged
    });

    it("no-ops on same index", () => {
      const id1 = useEditorStore.getState().newTab();
      useEditorStore.getState().moveTab(0, 0);
      expect(useEditorStore.getState().tabs[0].id).toBe(id1);
    });

    it("no-ops on negative fromIndex", () => {
      const id1 = useEditorStore.getState().newTab();
      useEditorStore.getState().moveTab(-1, 0);
      expect(useEditorStore.getState().tabs[0].id).toBe(id1);
    });

    it("no-ops on negative toIndex", () => {
      const id1 = useEditorStore.getState().newTab();
      useEditorStore.getState().moveTab(0, -1);
      expect(useEditorStore.getState().tabs[0].id).toBe(id1);
    });

    it("moves backward (higher index to lower)", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      const id3 = useEditorStore.getState().newTab();

      useEditorStore.getState().moveTab(2, 0);
      const state = useEditorStore.getState();
      expect(state.tabs[0].id).toBe(id3);
      expect(state.tabs[1].id).toBe(id1);
      expect(state.tabs[2].id).toBe(id2);
    });

    it("preserves tab content after move", () => {
      const id1 = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id1, "hello");
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id2, "world");

      useEditorStore.getState().moveTab(0, 1);
      const state = useEditorStore.getState();
      expect(state.tabs[0].content).toBe("world");
      expect(state.tabs[1].content).toBe("hello");
    });
  });

  describe("forceCloseTab", () => {
    it("closes even modified tabs", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "modified");
      expect(useEditorStore.getState().tabs.find((t) => t.id === id)?.modified).toBe(true);

      useEditorStore.getState().forceCloseTab(id);
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });

    it("handles secondaryTabId when force-closing", () => {
      const id1 = useEditorStore.getState().newTab();
      const id2 = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id2 });

      useEditorStore.getState().forceCloseTab(id2);
      expect(useEditorStore.getState().secondaryTabId).toBeNull();
    });

    it("sets activeTabId to null when force-closing the only tab", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().forceCloseTab(id);
      expect(useEditorStore.getState().activeTabId).toBeNull();
    });
  });

  describe("forceCloseAllTabs", () => {
    it("closes all tabs including modified ones", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.getState().updateTabContent(id, "changed");
      useEditorStore.getState().forceCloseAllTabs();
      expect(useEditorStore.getState().tabs).toHaveLength(0);
    });

    it("clears secondaryTabId", () => {
      const id = useEditorStore.getState().newTab();
      useEditorStore.setState({ secondaryTabId: id });
      useEditorStore.getState().forceCloseAllTabs();
      expect(useEditorStore.getState().secondaryTabId).toBeNull();
    });
  });

  describe("clearModified", () => {
    it("clears modified flag without changing path", () => {
      const id = useEditorStore.getState().newTab();
      const originalPath = useEditorStore.getState().tabs.find((t) => t.id === id)?.path;
      useEditorStore.getState().updateTabContent(id, "content");
      expect(useEditorStore.getState().tabs.find((t) => t.id === id)?.modified).toBe(true);

      useEditorStore.getState().clearModified(id);
      const tab = useEditorStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.modified).toBe(false);
      expect(tab?.path).toBe(originalPath); // path unchanged
    });
  });

  describe("dismissUnsavedDialog", () => {
    it("clears unsaved dialog state", () => {
      useEditorStore.setState({
        unsavedTabs: [
          {
            id: "x",
            path: null,
            name: "t",
            content: "",
            encoding: "UTF-8",
            modified: true,
            language: "plaintext",
            cursorLine: 1,
            cursorColumn: 1,
          },
        ],
        pendingCloseAll: true,
      });

      useEditorStore.getState().dismissUnsavedDialog();
      expect(useEditorStore.getState().unsavedTabs).toBeNull();
      expect(useEditorStore.getState().pendingCloseAll).toBe(false);
    });
  });
});
