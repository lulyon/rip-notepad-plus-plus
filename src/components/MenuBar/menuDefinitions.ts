export interface MenuItemDef {
  id: string;
  labelKey: string;
  shortcut?: string;
  disabled?: boolean;
  type?: "item" | "separator";
  children?: MenuItemDef[];
}

// Helper
function sep(n: number): MenuItemDef {
  return { id: `_sep_${n}`, labelKey: "", type: "separator" };
}

let si = 0;
const S = () => sep(++si);

export interface MenuDef {
  id: string;
  labelKey: string;
  altKey: string;
  children: MenuItemDef[];
}

export const MENU_STRUCTURE: MenuDef[] = [
  {
    id: "file",
    labelKey: "menu.file",
    altKey: "f",
    children: [
      { id: "file.new", labelKey: "menu.file.new", shortcut: "Ctrl+N" },
      { id: "file.open", labelKey: "menu.file.open", shortcut: "Ctrl+O" },
      S(),
      { id: "file.save", labelKey: "menu.file.save", shortcut: "Ctrl+S" },
      { id: "file.saveAs", labelKey: "menu.file.saveAs", shortcut: "Ctrl+Shift+S" },
      { id: "file.saveAll", labelKey: "menu.file.saveAll" },
      S(),
      { id: "file.close", labelKey: "menu.file.close", shortcut: "Ctrl+W" },
      { id: "file.closeAll", labelKey: "menu.file.closeAll" },
      { id: "file.closeOthers", labelKey: "menu.file.closeOthers" },
      S(),
      { id: "file.reload", labelKey: "menu.file.reload" },
      S(),
      { id: "file.print", labelKey: "menu.file.print", shortcut: "Ctrl+P" },
      S(),
      { id: "file.preferences", labelKey: "menu.file.preferences" },
      { id: "file.shortcutMapper", labelKey: "menu.file.shortcutMapper" },
      S(),
      { id: "file.exit", labelKey: "menu.file.exit", shortcut: "Alt+F4" },
    ],
  },
  {
    id: "edit",
    labelKey: "menu.edit",
    altKey: "e",
    children: [
      { id: "edit.undo", labelKey: "menu.edit.undo", shortcut: "Ctrl+Z" },
      { id: "edit.redo", labelKey: "menu.edit.redo", shortcut: "Ctrl+Y" },
      S(),
      { id: "edit.cut", labelKey: "menu.edit.cut", shortcut: "Ctrl+X" },
      { id: "edit.copy", labelKey: "menu.edit.copy", shortcut: "Ctrl+C" },
      { id: "edit.paste", labelKey: "menu.edit.paste", shortcut: "Ctrl+V" },
      { id: "edit.delete", labelKey: "menu.edit.delete", shortcut: "Del" },
      { id: "edit.selectAll", labelKey: "menu.edit.selectAll", shortcut: "Ctrl+A" },
      S(),
      { id: "edit.duplicateLine", labelKey: "menu.edit.duplicateLine", shortcut: "Ctrl+D" },
      { id: "edit.deleteLine", labelKey: "menu.edit.deleteLine", shortcut: "Ctrl+L" },
      { id: "edit.moveLineUp", labelKey: "menu.edit.moveLineUp", shortcut: "Ctrl+Shift+Up" },
      { id: "edit.moveLineDown", labelKey: "menu.edit.moveLineDown", shortcut: "Ctrl+Shift+Down" },
      S(),
      { id: "edit.columnMode", labelKey: "menu.edit.columnMode" },
      S(),
      { id: "edit.trimTrailing", labelKey: "menu.edit.trimTrailing" },
      { id: "edit.removeEmptyLines", labelKey: "menu.edit.removeEmptyLines" },
      S(),
      { id: "edit.toUpper", labelKey: "menu.edit.toUpper" },
      { id: "edit.toLower", labelKey: "menu.edit.toLower" },
    ],
  },
  {
    id: "search",
    labelKey: "menu.search",
    altKey: "s",
    children: [
      { id: "search.find", labelKey: "menu.search.find", shortcut: "Ctrl+F" },
      { id: "search.findNext", labelKey: "menu.search.findNext", shortcut: "F3" },
      { id: "search.findPrev", labelKey: "menu.search.findPrev", shortcut: "Shift+F3" },
      { id: "search.replace", labelKey: "menu.search.replace", shortcut: "Ctrl+H" },
      S(),
      { id: "search.goTo", labelKey: "menu.search.goTo", shortcut: "Ctrl+G" },
      S(),
      { id: "search.findInFiles", labelKey: "menu.search.findInFiles", shortcut: "Ctrl+Shift+F" },
      S(),
      { id: "search.markAll", labelKey: "menu.search.markAll" },
    ],
  },
  {
    id: "view",
    labelKey: "menu.view",
    altKey: "v",
    children: [
      { id: "view.wordWrap", labelKey: "menu.view.wordWrap" },
      { id: "view.showWhitespace", labelKey: "menu.view.showWhitespace" },
      { id: "view.showIndentGuides", labelKey: "menu.view.showIndentGuide" },
      { id: "view.showLineNumbers", labelKey: "menu.view.showLineNumbers" },
      { id: "view.showMinimap", labelKey: "menu.view.showMinimap" },
      S(),
      { id: "view.foldAll", labelKey: "menu.view.foldAll" },
      { id: "view.unfoldAll", labelKey: "menu.view.unfoldAll" },
      S(),
      { id: "view.zoomIn", labelKey: "menu.view.zoomIn", shortcut: "Ctrl++" },
      { id: "view.zoomOut", labelKey: "menu.view.zoomOut", shortcut: "Ctrl+-" },
      { id: "view.zoomReset", labelKey: "menu.view.zoomReset", shortcut: "Ctrl+0" },
      S(),
      { id: "view.fullScreen", labelKey: "menu.view.fullScreen", shortcut: "F11" },
      S(),
      { id: "view.splitNone", labelKey: "menu.view.splitNone" },
      { id: "view.splitHorizontal", labelKey: "menu.view.splitHorizontal" },
      { id: "view.splitVertical", labelKey: "menu.view.splitVertical" },
      S(),
      { id: "view.alwaysOnTop", labelKey: "menu.view.alwaysOnTop" },
      S(),
      { id: "view.toggleSidebar", labelKey: "menu.view.toggleSidebar" },
    ],
  },
  {
    id: "encoding",
    labelKey: "menu.encoding",
    altKey: "n",
    children: [
      { id: "encoding.encodeUtf8", labelKey: "menu.encoding.encodeUtf8" },
      { id: "encoding.encodeUtf8Bom", labelKey: "menu.encoding.encodeUtf8Bom" },
      { id: "encoding.convertUtf8", labelKey: "menu.encoding.convertUtf8" },
      { id: "encoding.convertUtf8Bom", labelKey: "menu.encoding.convertUtf8Bom" },
      S(),
      { id: "encoding.convertAnsi", labelKey: "menu.encoding.convertAnsi" },
      { id: "encoding.convertUtf16LE", labelKey: "menu.encoding.convertUtf16LE" },
      { id: "encoding.convertUtf16BE", labelKey: "menu.encoding.convertUtf16BE" },
      S(),
      { id: "encoding.openDialog", labelKey: "menu.encoding.openDialog" },
    ],
  },
  {
    id: "language",
    labelKey: "menu.language",
    altKey: "l",
    children: [
      { id: "lang.plaintext", labelKey: "menu.language.plaintext" },
      S(),
      { id: "lang.javascript", labelKey: "menu.language.javascript" },
      { id: "lang.typescript", labelKey: "menu.language.typescript" },
      { id: "lang.json", labelKey: "menu.language.json" },
      { id: "lang.html", labelKey: "menu.language.html" },
      { id: "lang.css", labelKey: "menu.language.css" },
      S(),
      { id: "lang.python", labelKey: "menu.language.python" },
      { id: "lang.rust", labelKey: "menu.language.rust" },
      { id: "lang.go", labelKey: "menu.language.go" },
      { id: "lang.java", labelKey: "menu.language.java" },
      { id: "lang.c", labelKey: "menu.language.c" },
      { id: "lang.cpp", labelKey: "menu.language.cpp" },
      S(),
      { id: "lang.xml", labelKey: "menu.language.xml" },
      { id: "lang.yaml", labelKey: "menu.language.yaml" },
      { id: "lang.markdown", labelKey: "menu.language.markdown" },
      { id: "lang.sql", labelKey: "menu.language.sql" },
      { id: "lang.shell", labelKey: "menu.language.shell" },
    ],
  },
  {
    id: "macro",
    labelKey: "menu.macro",
    altKey: "m",
    children: [
      { id: "macro.startRecord", labelKey: "menu.macro.startRecord" },
      { id: "macro.stopRecord", labelKey: "menu.macro.stopRecord" },
      { id: "macro.playback", labelKey: "menu.macro.playback" },
      S(),
      { id: "macro.save", labelKey: "menu.macro.save" },
    ],
  },
  {
    id: "run",
    labelKey: "menu.run",
    altKey: "r",
    children: [
      { id: "run.dialog", labelKey: "menu.run.dialog" },
      S(),
      { id: "run.openInBrowser", labelKey: "menu.run.openInBrowser" },
    ],
  },
  {
    id: "window",
    labelKey: "menu.window",
    altKey: "w",
    children: [
      { id: "window.nextTab", labelKey: "menu.window.nextTab", shortcut: "Ctrl+Tab" },
      { id: "window.prevTab", labelKey: "menu.window.prevTab", shortcut: "Ctrl+Shift+Tab" },
      S(),
      { id: "window.close", labelKey: "menu.window.close", shortcut: "Ctrl+W" },
      { id: "window.closeAll", labelKey: "menu.window.closeAll" },
    ],
  },
  {
    id: "plugins",
    labelKey: "menu.plugins",
    altKey: "p",
    children: [
      { id: "plugins.manager", labelKey: "plugin.title" },
    ],
  },
  {
    id: "help",
    labelKey: "menu.help",
    altKey: "h",
    children: [
      { id: "help.about", labelKey: "menu.help.about" },
    ],
  },
];

/** Dispatch a menu action via a single custom event. */
export function dispatchMenuAction(actionId: string): void {
  window.dispatchEvent(new CustomEvent("menu-action", { detail: actionId }));
}
