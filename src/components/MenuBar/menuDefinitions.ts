export interface MenuItemDef {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  type?: "item" | "separator";
  children?: MenuItemDef[];
}

// Helper
function sep(n: number): MenuItemDef {
  return { id: `_sep_${n}`, label: "", type: "separator" };
}

let si = 0;
const S = () => sep(++si);

export interface MenuDef {
  id: string;
  label: string;
  altKey: string;
  children: MenuItemDef[];
}

export const MENU_STRUCTURE: MenuDef[] = [
  {
    id: "file",
    label: "文件(&F)",
    altKey: "f",
    children: [
      { id: "file.new", label: "新建(&N)", shortcut: "Ctrl+N" },
      { id: "file.open", label: "打开(&O)...", shortcut: "Ctrl+O" },
      S(),
      { id: "file.save", label: "保存(&S)", shortcut: "Ctrl+S" },
      { id: "file.saveAs", label: "另存为(&A)...", shortcut: "Ctrl+Shift+S" },
      { id: "file.saveAll", label: "全部保存(&L)" },
      S(),
      { id: "file.close", label: "关闭(&C)", shortcut: "Ctrl+W" },
      { id: "file.closeAll", label: "全部关闭" },
      { id: "file.closeOthers", label: "关闭其他标签" },
      S(),
      { id: "file.reload", label: "从磁盘重新加载(&R)" },
      S(),
      { id: "file.preferences", label: "首选项(&P)..." },
      { id: "file.shortcutMapper", label: "快捷键管理(&K)..." },
      S(),
      { id: "file.exit", label: "退出(&X)", shortcut: "Alt+F4" },
    ],
  },
  {
    id: "edit",
    label: "编辑(&E)",
    altKey: "e",
    children: [
      { id: "edit.undo", label: "撤销(&U)", shortcut: "Ctrl+Z" },
      { id: "edit.redo", label: "重做(&R)", shortcut: "Ctrl+Y" },
      S(),
      { id: "edit.cut", label: "剪切(&T)", shortcut: "Ctrl+X" },
      { id: "edit.copy", label: "复制(&C)", shortcut: "Ctrl+C" },
      { id: "edit.paste", label: "粘贴(&P)", shortcut: "Ctrl+V" },
      { id: "edit.delete", label: "删除(&D)", shortcut: "Del" },
      { id: "edit.selectAll", label: "全选(&A)", shortcut: "Ctrl+A" },
      S(),
      { id: "edit.duplicateLine", label: "复制行", shortcut: "Ctrl+D" },
      { id: "edit.deleteLine", label: "删除行", shortcut: "Ctrl+L" },
      S(),
      { id: "edit.trimTrailing", label: "去除尾随空格" },
      { id: "edit.removeEmptyLines", label: "删除空行" },
      S(),
      { id: "edit.toUpper", label: "转为大写(&U)" },
      { id: "edit.toLower", label: "转为小写(&L)" },
    ],
  },
  {
    id: "search",
    label: "搜索(&S)",
    altKey: "s",
    children: [
      { id: "search.find", label: "查找(&F)...", shortcut: "Ctrl+F" },
      { id: "search.findNext", label: "查找下一个(&N)", shortcut: "F3" },
      { id: "search.findPrev", label: "查找上一个(&V)", shortcut: "Shift+F3" },
      { id: "search.replace", label: "替换(&R)...", shortcut: "Ctrl+H" },
      S(),
      { id: "search.goTo", label: "转到(&G)...", shortcut: "Ctrl+G" },
      S(),
      { id: "search.findInFiles", label: "在文件中查找(&F)...", shortcut: "Ctrl+Shift+F" },
      S(),
      { id: "search.markAll", label: "标记所有(&M)" },
    ],
  },
  {
    id: "view",
    label: "视图(&V)",
    altKey: "v",
    children: [
      { id: "view.wordWrap", label: "自动换行(&W)" },
      { id: "view.showWhitespace", label: "显示所有字符(&S)" },
      { id: "view.showIndentGuide", label: "显示缩进线(&I)" },
      { id: "view.showLineNumbers", label: "显示行号(&L)" },
      { id: "view.showMinimap", label: "显示缩略图(&M)" },
      S(),
      { id: "view.foldAll", label: "全部折叠(&A)" },
      { id: "view.unfoldAll", label: "全部展开(&U)" },
      S(),
      { id: "view.zoomIn", label: "放大(&I)", shortcut: "Ctrl++" },
      { id: "view.zoomOut", label: "缩小(&O)", shortcut: "Ctrl+-" },
      { id: "view.zoomReset", label: "重置缩放(&R)", shortcut: "Ctrl+0" },
      S(),
      { id: "view.fullScreen", label: "全屏(&F)", shortcut: "F11" },
      S(),
      { id: "view.splitNone", label: "单窗口" },
      { id: "view.splitHorizontal", label: "水平分屏" },
      { id: "view.splitVertical", label: "垂直分屏" },
    ],
  },
  {
    id: "encoding",
    label: "编码(&N)",
    altKey: "n",
    children: [
      { id: "encoding.encodeUtf8", label: "以 UTF-8 编码" },
      { id: "encoding.encodeUtf8Bom", label: "以 UTF-8 BOM 编码" },
      { id: "encoding.convertUtf8", label: "转换为 UTF-8" },
      { id: "encoding.convertUtf8Bom", label: "转换为 UTF-8 BOM" },
      S(),
      { id: "encoding.convertAnsi", label: "转换为 ANSI" },
      { id: "encoding.convertUtf16LE", label: "转换为 UTF-16 LE" },
      { id: "encoding.convertUtf16BE", label: "转换为 UTF-16 BE" },
      S(),
      { id: "encoding.openDialog", label: "字符集(&C)..." },
    ],
  },
  {
    id: "language",
    label: "语言(&L)",
    altKey: "l",
    children: [
      { id: "lang.plaintext", label: "纯文本" },
      S(),
      { id: "lang.javascript", label: "JavaScript" },
      { id: "lang.typescript", label: "TypeScript" },
      { id: "lang.json", label: "JSON" },
      { id: "lang.html", label: "HTML" },
      { id: "lang.css", label: "CSS" },
      S(),
      { id: "lang.python", label: "Python" },
      { id: "lang.rust", label: "Rust" },
      { id: "lang.go", label: "Go" },
      { id: "lang.java", label: "Java" },
      { id: "lang.c", label: "C" },
      { id: "lang.cpp", label: "C++" },
      S(),
      { id: "lang.xml", label: "XML" },
      { id: "lang.yaml", label: "YAML" },
      { id: "lang.markdown", label: "Markdown" },
      { id: "lang.sql", label: "SQL" },
      { id: "lang.shell", label: "Shell" },
    ],
  },
  {
    id: "macro",
    label: "宏(&M)",
    altKey: "m",
    children: [
      { id: "macro.startRecord", label: "开始录制(&S)" },
      { id: "macro.stopRecord", label: "停止录制(&T)" },
      { id: "macro.playback", label: "回放(&P)" },
      S(),
      { id: "macro.save", label: "保存当前宏(&V)" },
    ],
  },
  {
    id: "run",
    label: "运行(&R)",
    altKey: "r",
    children: [
      { id: "run.dialog", label: "运行(&R)..." },
      S(),
      { id: "run.openInBrowser", label: "在浏览器中打开(&B)" },
    ],
  },
  {
    id: "window",
    label: "窗口(&W)",
    altKey: "w",
    children: [
      { id: "window.nextTab", label: "下一个标签(&N)", shortcut: "Ctrl+Tab" },
      { id: "window.prevTab", label: "上一个标签(&P)", shortcut: "Ctrl+Shift+Tab" },
      S(),
      { id: "window.close", label: "关闭(&C)", shortcut: "Ctrl+W" },
      { id: "window.closeAll", label: "全部关闭" },
    ],
  },
  {
    id: "help",
    label: "帮助(&H)",
    altKey: "h",
    children: [
      { id: "help.about", label: "关于 ripNotepad++(&A)" },
    ],
  },
];

/** Dispatch a menu action via a single custom event. */
export function dispatchMenuAction(actionId: string): void {
  window.dispatchEvent(new CustomEvent("menu-action", { detail: actionId }));
}
