import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../src/stores/settingsStore";

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({
    fontSize: 13,
    fontFamily:
      "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    tabSize: 4,
    insertSpaces: true,
    wordWrap: "off",
    lineNumbers: "on",
    renderWhitespace: "selection",
    showIndentGuides: true,
    showMinimap: true,
    bracketPairColorization: true,
    smoothScrolling: true,
    scrollBeyondLastLine: false,
    splitView: "none",
    showMenuBar: true,
    showStatusBar: true,
    showSidebar: false,
    projectRoot: null,
    fullScreen: false,
    alwaysOnTop: false,
    autoSave: true,
    defaultEncoding: "UTF-8",
    defaultLanguage: "plaintext",
    defaultEol: "LF",
    theme: "vs-dark",
    shortcuts: {
      "file.new": "Ctrl+N",
      "file.open": "Ctrl+O",
      "file.save": "Ctrl+S",
      "file.saveAs": "Ctrl+Shift+S",
      "file.close": "Ctrl+W",
      "edit.undo": "Ctrl+Z",
      "edit.redo": "Ctrl+Y",
      "edit.cut": "Ctrl+X",
      "edit.copy": "Ctrl+C",
      "edit.paste": "Ctrl+V",
      "edit.selectAll": "Ctrl+A",
      "edit.duplicateLine": "Ctrl+D",
      "edit.deleteLine": "Ctrl+L",
      "search.find": "Ctrl+F",
      "search.replace": "Ctrl+H",
      "search.goTo": "Ctrl+G",
      "search.findInFiles": "Ctrl+Shift+F",
      "view.zoomIn": "Ctrl+=",
      "view.zoomOut": "Ctrl+-",
      "view.zoomReset": "Ctrl+0",
      "view.fullScreen": "F11",
    },
  });
});

describe("settingsStore", () => {
  describe("default values", () => {
    it("has correct editor defaults", () => {
      const s = useSettingsStore.getState();
      expect(s.fontSize).toBe(13);
      expect(s.fontFamily).toBe(
        "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
      );
      expect(s.tabSize).toBe(4);
      expect(s.insertSpaces).toBe(true);
      expect(s.wordWrap).toBe("off");
      expect(s.lineNumbers).toBe("on");
      expect(s.renderWhitespace).toBe("selection");
      expect(s.showIndentGuides).toBe(true);
      expect(s.showMinimap).toBe(true);
      expect(s.bracketPairColorization).toBe(true);
      expect(s.smoothScrolling).toBe(true);
      expect(s.scrollBeyondLastLine).toBe(false);
    });

    it("has correct view defaults", () => {
      const s = useSettingsStore.getState();
      expect(s.splitView).toBe("none");
      expect(s.showMenuBar).toBe(true);
      expect(s.showStatusBar).toBe(true);
      expect(s.showSidebar).toBe(false);
      expect(s.projectRoot).toBeNull();
      expect(s.fullScreen).toBe(false);
      expect(s.alwaysOnTop).toBe(false);
      expect(s.autoSave).toBe(true);
    });

    it("has correct new doc defaults", () => {
      const s = useSettingsStore.getState();
      expect(s.defaultEncoding).toBe("UTF-8");
      expect(s.defaultLanguage).toBe("plaintext");
      expect(s.defaultEol).toBe("LF");
    });
  });

  describe("updateSetting", () => {
    it("updates a numeric setting", () => {
      useSettingsStore.getState().updateSetting("fontSize", 20);
      expect(useSettingsStore.getState().fontSize).toBe(20);
    });

    it("updates string settings", () => {
      useSettingsStore.getState().updateSetting("theme", "vs");
      expect(useSettingsStore.getState().theme).toBe("vs");
    });

    it("updates wordWrap via updateSetting", () => {
      useSettingsStore.getState().updateSetting("wordWrap", "on");
      expect(useSettingsStore.getState().wordWrap).toBe("on");
    });
  });

  describe("toggleSetting", () => {
    it("toggles boolean settings", () => {
      expect(useSettingsStore.getState().showStatusBar).toBe(true);
      useSettingsStore.getState().toggleSetting("showStatusBar");
      expect(useSettingsStore.getState().showStatusBar).toBe(false);
      useSettingsStore.getState().toggleSetting("showStatusBar");
      expect(useSettingsStore.getState().showStatusBar).toBe(true);
    });

    it("toggles autoSave", () => {
      expect(useSettingsStore.getState().autoSave).toBe(true);
      useSettingsStore.getState().toggleSetting("autoSave");
      expect(useSettingsStore.getState().autoSave).toBe(false);
    });
  });

  describe("shortcuts", () => {
    it("setShortcut updates a shortcut", () => {
      useSettingsStore.getState().setShortcut("file.new", "Ctrl+Shift+N");
      expect(useSettingsStore.getState().shortcuts["file.new"]).toBe(
        "Ctrl+Shift+N",
      );
    });

    it("resetShortcuts restores defaults", () => {
      useSettingsStore.getState().setShortcut("file.new", "Ctrl+Alt+N");
      useSettingsStore.getState().resetShortcuts();
      expect(useSettingsStore.getState().shortcuts["file.new"]).toBe("Ctrl+N");
    });

    it("has all 21 default shortcuts", () => {
      const shortcuts = useSettingsStore.getState().shortcuts;
      expect(Object.keys(shortcuts)).toHaveLength(21);
      expect(shortcuts["file.new"]).toBe("Ctrl+N");
      expect(shortcuts["file.open"]).toBe("Ctrl+O");
      expect(shortcuts["file.save"]).toBe("Ctrl+S");
      expect(shortcuts["file.saveAs"]).toBe("Ctrl+Shift+S");
      expect(shortcuts["file.close"]).toBe("Ctrl+W");
      expect(shortcuts["edit.undo"]).toBe("Ctrl+Z");
      expect(shortcuts["edit.redo"]).toBe("Ctrl+Y");
      expect(shortcuts["edit.cut"]).toBe("Ctrl+X");
      expect(shortcuts["edit.copy"]).toBe("Ctrl+C");
      expect(shortcuts["edit.paste"]).toBe("Ctrl+V");
      expect(shortcuts["edit.selectAll"]).toBe("Ctrl+A");
      expect(shortcuts["edit.duplicateLine"]).toBe("Ctrl+D");
      expect(shortcuts["edit.deleteLine"]).toBe("Ctrl+L");
      expect(shortcuts["search.find"]).toBe("Ctrl+F");
      expect(shortcuts["search.replace"]).toBe("Ctrl+H");
      expect(shortcuts["search.goTo"]).toBe("Ctrl+G");
      expect(shortcuts["search.findInFiles"]).toBe("Ctrl+Shift+F");
      expect(shortcuts["view.zoomIn"]).toBe("Ctrl+=");
      expect(shortcuts["view.zoomOut"]).toBe("Ctrl+-");
      expect(shortcuts["view.zoomReset"]).toBe("Ctrl+0");
      expect(shortcuts["view.fullScreen"]).toBe("F11");
    });
  });

  describe("theme", () => {
    it("defaults to vs-dark", () => {
      expect(useSettingsStore.getState().theme).toBe("vs-dark");
    });

    it("can be changed to hc-black", () => {
      useSettingsStore.getState().updateSetting("theme", "hc-black");
      expect(useSettingsStore.getState().theme).toBe("hc-black");
    });
  });

  describe("loadSettings", () => {
    it("restores all settings from localStorage", () => {
      const saved = {
        fontSize: 18,
        fontFamily: "monospace",
        tabSize: 2,
        insertSpaces: false,
        wordWrap: "on",
        lineNumbers: "off",
        renderWhitespace: "all",
        showIndentGuides: false,
        showMinimap: false,
        bracketPairColorization: false,
        smoothScrolling: false,
        scrollBeyondLastLine: true,
        splitView: "vertical",
        showMenuBar: false,
        showStatusBar: false,
        showSidebar: true,
        projectRoot: "/test/path",
        fullScreen: true,
        alwaysOnTop: true,
        autoSave: false,
        defaultEncoding: "ASCII",
        defaultLanguage: "json",
        defaultEol: "CRLF",
        theme: "vs",
        shortcuts: { "file.new": "Ctrl+Alt+N" },
      };
      localStorage.setItem("ripnotepadpp-settings", JSON.stringify(saved));

      useSettingsStore.getState().loadSettings();

      const s = useSettingsStore.getState();
      expect(s.fontSize).toBe(18);
      expect(s.fontFamily).toBe("monospace");
      expect(s.tabSize).toBe(2);
      expect(s.insertSpaces).toBe(false);
      expect(s.wordWrap).toBe("on");
      expect(s.lineNumbers).toBe("off");
      expect(s.renderWhitespace).toBe("all");
      expect(s.showIndentGuides).toBe(false);
      expect(s.showMinimap).toBe(false);
      expect(s.bracketPairColorization).toBe(false);
      expect(s.smoothScrolling).toBe(false);
      expect(s.scrollBeyondLastLine).toBe(true);
      expect(s.splitView).toBe("vertical");
      expect(s.showMenuBar).toBe(false);
      expect(s.showStatusBar).toBe(false);
      expect(s.showSidebar).toBe(true);
      expect(s.projectRoot).toBe("/test/path");
      expect(s.fullScreen).toBe(true);
      expect(s.alwaysOnTop).toBe(true);
      expect(s.autoSave).toBe(false);
      expect(s.defaultEncoding).toBe("ASCII");
      expect(s.defaultLanguage).toBe("json");
      expect(s.defaultEol).toBe("CRLF");
      expect(s.theme).toBe("vs");
      expect(s.shortcuts["file.new"]).toBe("Ctrl+Alt+N");
    });
  });

  describe("persistence", () => {
    it("writes settings to localStorage on updateSetting", () => {
      useSettingsStore.getState().updateSetting("fontSize", 24);
      const stored = JSON.parse(
        localStorage.getItem("ripnotepadpp-settings") || "{}",
      );
      expect(stored.fontSize).toBe(24);
    });

    it("writes settings to localStorage on toggleSetting", () => {
      useSettingsStore.getState().toggleSetting("showSidebar");
      const stored = JSON.parse(
        localStorage.getItem("ripnotepadpp-settings") || "{}",
      );
      expect(stored.showSidebar).toBe(true);
    });

    it("writes shortcuts to localStorage on setShortcut", () => {
      useSettingsStore.getState().setShortcut("file.open", "Ctrl+Shift+O");
      const stored = JSON.parse(
        localStorage.getItem("ripnotepadpp-settings") || "{}",
      );
      expect(stored.shortcuts["file.open"]).toBe("Ctrl+Shift+O");
    });

    it("writes shortcuts to localStorage on resetShortcuts", () => {
      useSettingsStore.getState().resetShortcuts();
      const stored = JSON.parse(
        localStorage.getItem("ripnotepadpp-settings") || "{}",
      );
      expect(stored.shortcuts["file.new"]).toBe("Ctrl+N");
    });

    it("uses correct localStorage key", () => {
      useSettingsStore.getState().updateSetting("fontSize", 16);
      const stored = localStorage.getItem("ripnotepadpp-settings");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!).fontSize).toBe(16);
    });
  });
});
