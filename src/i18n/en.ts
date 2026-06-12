const en = {
  translation: {
    // ── Menu: File ──
    "menu.file": "&File",
    "menu.file.new": "&New",
    "menu.file.open": "&Open...",
    "menu.file.save": "&Save",
    "menu.file.saveAs": "Save &As...",
    "menu.file.saveAll": "Save A&ll",
    "menu.file.close": "&Close",
    "menu.file.closeAll": "Close All",
    "menu.file.closeOthers": "Close Others",
    "menu.file.reload": "&Reload from Disk",
    "menu.file.print": "&Print...",
    "menu.file.preferences": "&Preferences...",
    "menu.file.shortcutMapper": "Shortcut &Mapper...",
    "menu.file.exit": "E&xit",

    // ── Menu: Edit ──
    "menu.edit": "&Edit",
    "menu.edit.undo": "&Undo",
    "menu.edit.redo": "&Redo",
    "menu.edit.cut": "Cu&t",
    "menu.edit.copy": "&Copy",
    "menu.edit.paste": "&Paste",
    "menu.edit.delete": "&Delete",
    "menu.edit.selectAll": "Select &All",
    "menu.edit.duplicateLine": "Duplicate Line",
    "menu.edit.deleteLine": "Delete Line",
    "menu.edit.moveLineUp": "Move Line Up",
    "menu.edit.moveLineDown": "Move Line Down",
    "menu.edit.columnMode": "Column Mode",
    "menu.edit.trimTrailing": "Trim Trailing Space",
    "menu.edit.removeEmptyLines": "Remove Empty Lines",
    "menu.edit.toUpper": "To &Uppercase",
    "menu.edit.toLower": "To &Lowercase",

    // ── Menu: Search ──
    "menu.search": "&Search",
    "menu.search.find": "&Find...",
    "menu.search.findNext": "Find &Next",
    "menu.search.findPrev": "Find Pre&vious",
    "menu.search.replace": "&Replace...",
    "menu.search.goTo": "&Go to...",
    "menu.search.findInFiles": "Find &in Files...",
    "menu.search.markAll": "&Mark All",

    // ── Menu: View ──
    "menu.view": "&View",
    "menu.view.wordWrap": "&Word Wrap",
    "menu.view.showWhitespace": "Show &Symbols",
    "menu.view.showIndentGuide": "Show &Indent Guide",
    "menu.view.showLineNumbers": "Show &Line Numbers",
    "menu.view.showMinimap": "Show &Minimap",
    "menu.view.foldAll": "Fold &All",
    "menu.view.unfoldAll": "&Unfold All",
    "menu.view.zoomIn": "Zoom &In",
    "menu.view.zoomOut": "Zoom &Out",
    "menu.view.zoomReset": "&Reset Zoom",
    "menu.view.fullScreen": "&Full Screen",
    "menu.view.splitNone": "Single View",
    "menu.view.splitHorizontal": "Split Horizontally",
    "menu.view.splitVertical": "Split Vertically",
    "menu.view.alwaysOnTop": "Always on Top",
    "menu.view.toggleSidebar": "Show Sidebar",

    // ── Menu: Encoding ──
    "menu.encoding": "E&ncoding",
    "menu.encoding.encodeUtf8": "Encode in UTF-8",
    "menu.encoding.encodeUtf8Bom": "Encode in UTF-8 BOM",
    "menu.encoding.convertUtf8": "Convert to UTF-8",
    "menu.encoding.convertUtf8Bom": "Convert to UTF-8 BOM",
    "menu.encoding.convertAnsi": "Convert to ANSI",
    "menu.encoding.convertUtf16LE": "Convert to UTF-16 LE",
    "menu.encoding.convertUtf16BE": "Convert to UTF-16 BE",
    "menu.encoding.openDialog": "&Character Set...",

    // ── Menu: Language ──
    "menu.language": "&Language",
    "menu.language.plaintext": "Plain Text",
    "menu.language.javascript": "JavaScript",
    "menu.language.typescript": "TypeScript",
    "menu.language.json": "JSON",
    "menu.language.html": "HTML",
    "menu.language.css": "CSS",
    "menu.language.python": "Python",
    "menu.language.rust": "Rust",
    "menu.language.go": "Go",
    "menu.language.java": "Java",
    "menu.language.c": "C",
    "menu.language.cpp": "C++",
    "menu.language.xml": "XML",
    "menu.language.yaml": "YAML",
    "menu.language.markdown": "Markdown",
    "menu.language.sql": "SQL",
    "menu.language.shell": "Shell",

    // ── Menu: Macro ──
    "menu.macro": "&Macro",
    "menu.macro.startRecord": "&Start Recording",
    "menu.macro.stopRecord": "S&top Recording",
    "menu.macro.playback": "&Playback",
    "menu.macro.save": "Sa&ve Current Macro",

    // ── Menu: Run ──
    "menu.run": "&Run",
    "menu.run.dialog": "&Run...",
    "menu.run.openInBrowser": "Open in &Browser",

    // ── Menu: Window ──
    "menu.window": "&Window",
    "menu.window.nextTab": "&Next Tab",
    "menu.window.prevTab": "&Previous Tab",
    "menu.window.close": "&Close",
    "menu.window.closeAll": "Close All",

    // ── Menu: Help ──
    "menu.help": "&Help",
    "menu.help.about": "&About ripNotepad++",

    // ── Tab Context Menu ──
    "tab.close": "Close",
    "tab.closeOthers": "Close Others",
    "tab.closeAll": "Close All",
    "tab.copyPath": "Copy File Path",
    "tab.reload": "Reload",

    // ── Search Panel ──
    "search.findLabel": "Find",
    "search.replaceLabel": "Replace",
    "search.regex": "Regex",
    "search.caseSensitive": "Case Sensitive",
    "search.wholeWord": "Whole Word",
    "search.wrapAround": "Wrap Around",
    "search.findNextBtn": "Find Next",
    "search.findPrevBtn": "Find Previous",
    "search.replaceBtn": "Replace",
    "search.replaceAllBtn": "Replace All",
    "search.markAllBtn": "Mark All",
    "search.countBtn": "Count",
    "search.inFiles": "Find in Files",

    // ── Dialogs ──
    "dialog.save": "Save",
    "dialog.cancel": "Cancel",
    "dialog.discard": "Discard",
    "dialog.close": "Close",
    "dialog.ok": "OK",
    "dialog.run": "Run",
    "dialog.running": "Running...",
    "dialog.runCommand": "Run Command",
    "dialog.runPlaceholder": "Enter a shell command...",
    "dialog.about": "About ripNotepad++",
    "dialog.aboutText": "Built with Tauri v2 + Monaco Editor + React + TypeScript + Rust",
    "dialog.goToLine": "Go to Line",
    "dialog.lineNumber": "Line Number",
    "dialog.preferences": "Preferences",
    "dialog.shortcutMapper": "Shortcut Mapper",
    "dialog.encoding": "Encoding",
    "dialog.unsavedChanges": "Unsaved Changes",
    "dialog.unsavedMessage": "This file has unsaved changes. Do you want to save?",

    // ── Status Bar ──
    "status.encoding": "Encoding",
    "status.language": "Language",
    "status.line": "Ln",
    "status.column": "Col",

    // ── Welcome ──
    "welcome.title": "ripNotepad++",
    "welcome.subtitle": "Ctrl+N New · Ctrl+O Open · Ctrl+S Save",
    "welcome.dropHint": "Drop files here to open",

    // ── Sidebar ──
    "sidebar.files": "Files",
    "sidebar.symbols": "Symbols",
    "panel.noSymbols": "No symbols in current file",
    "panel.noFile": "No file open",

    // ── General ──
    "app.newFile": "New File",
    "app.close": "Close",
    "app.save": "Save",
    "app.saveAs": "Save As",
    "app.open": "Open",
    "app.reload": "Reload",
    "app.modified": "● ",
    "app.encoding.utf8": "UTF-8",
  },
};

export default en;
