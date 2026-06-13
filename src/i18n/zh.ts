const zh = {
  translation: {
    // ── Menu: File ──
    "menu.file": "文件(&F)",
    "menu.file.new": "新建(&N)",
    "menu.file.open": "打开(&O)...",
    "menu.file.openFolder": "打开文件夹(&F)...",
    "menu.file.save": "保存(&S)",
    "menu.file.saveAs": "另存为(&A)...",
    "menu.file.saveAll": "全部保存(&L)",
    "menu.file.close": "关闭(&C)",
    "menu.file.closeAll": "全部关闭",
    "menu.file.closeOthers": "关闭其他标签",
    "menu.file.reload": "从磁盘重新加载(&R)",
    "menu.file.print": "打印(&P)...",
    "menu.file.preferences": "首选项(&P)...",
    "menu.file.shortcutMapper": "快捷键管理(&K)...",
    "menu.file.exit": "退出(&X)",

    // ── Menu: Edit ──
    "menu.edit": "编辑(&E)",
    "menu.edit.undo": "撤销(&U)",
    "menu.edit.redo": "重做(&R)",
    "menu.edit.cut": "剪切(&T)",
    "menu.edit.copy": "复制(&C)",
    "menu.edit.paste": "粘贴(&P)",
    "menu.edit.delete": "删除(&D)",
    "menu.edit.selectAll": "全选(&A)",
    "menu.edit.duplicateLine": "复制行",
    "menu.edit.deleteLine": "删除行",
    "menu.edit.moveLineUp": "上移行",
    "menu.edit.moveLineDown": "下移行",
    "menu.edit.columnMode": "列编辑模式",
    "menu.edit.trimTrailing": "去除尾随空格",
    "menu.edit.removeEmptyLines": "删除空行",
    "menu.edit.toUpper": "转为大写(&U)",
    "menu.edit.toLower": "转为小写(&L)",
    "menu.edit.copyFilePath": "复制文件路径到剪贴板",
    "menu.edit.copyFileName": "复制文件名到剪贴板",
    "menu.edit.copyDirPath": "复制目录路径到剪贴板",
    "menu.edit.insertDateTime": "插入日期时间",
    "menu.edit.sortAscending": "升序排列文本行",
    "menu.edit.sortDescending": "降序排列文本行",
    "menu.edit.removeDupLines": "移除重复行",

    // ── Menu: Search ──
    "menu.search": "搜索(&S)",
    "menu.search.find": "查找(&F)...",
    "menu.search.findNext": "查找下一个(&N)",
    "menu.search.findPrev": "查找上一个(&V)",
    "menu.search.replace": "替换(&R)...",
    "menu.search.goTo": "转到(&G)...",
    "menu.search.findInFiles": "在文件中查找(&F)...",
    "menu.search.markAll": "标记所有(&M)",

    // ── Menu: View ──
    "menu.view": "视图(&V)",
    "menu.view.wordWrap": "自动换行(&W)",
    "menu.view.showWhitespace": "显示所有字符(&S)",
    "menu.view.showIndentGuide": "显示缩进线(&I)",
    "menu.view.showLineNumbers": "显示行号(&L)",
    "menu.view.showMinimap": "显示缩略图(&M)",
    "menu.view.foldAll": "全部折叠(&A)",
    "menu.view.unfoldAll": "全部展开(&U)",
    "menu.view.zoomIn": "放大(&I)",
    "menu.view.zoomOut": "缩小(&O)",
    "menu.view.zoomReset": "重置缩放(&R)",
    "menu.view.fullScreen": "全屏(&F)",
    "menu.view.splitNone": "单窗口",
    "menu.view.splitHorizontal": "水平分屏",
    "menu.view.splitVertical": "垂直分屏",
    "menu.view.alwaysOnTop": "窗口置顶",
    "menu.view.toggleSidebar": "显示侧边栏",

    // ── Menu: Encoding ──
    "menu.encoding": "编码(&N)",
    "menu.encoding.encodeUtf8": "以 UTF-8 编码",
    "menu.encoding.encodeUtf8Bom": "以 UTF-8 BOM 编码",
    "menu.encoding.convertUtf8": "转换为 UTF-8",
    "menu.encoding.convertUtf8Bom": "转换为 UTF-8 BOM",
    "menu.encoding.convertAnsi": "转换为 ANSI",
    "menu.encoding.convertUtf16LE": "转换为 UTF-16 LE",
    "menu.encoding.convertUtf16BE": "转换为 UTF-16 BE",
    "menu.encoding.openDialog": "字符集(&C)...",

    // ── Menu: Language ──
    "menu.language": "语言(&L)",
    "menu.language.plaintext": "纯文本",
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
    "menu.macro": "宏(&M)",
    "menu.macro.startRecord": "开始录制(&S)",
    "menu.macro.stopRecord": "停止录制(&T)",
    "menu.macro.playback": "回放(&P)",
    "menu.macro.save": "保存当前宏(&V)",

    // ── Menu: Run ──
    "menu.run": "运行(&R)",
    "menu.run.dialog": "运行(&R)...",
    "menu.run.openInBrowser": "在浏览器中打开(&B)",
    "menu.run.openTerminal": "打开终端(&T)",
    "menu.run.claudeCode": "启动 Claude",

    // ── Menu: Window ──
    "menu.window": "窗口(&W)",
    "menu.window.nextTab": "下一个标签(&N)",
    "menu.window.prevTab": "上一个标签(&P)",
    "menu.window.close": "关闭(&C)",
    "menu.window.closeAll": "全部关闭",

    // ── Menu: Help ──
    "menu.help": "帮助(&H)",
    "menu.help.about": "关于 ripNotepad++(&A)",

    // ── Tab Context Menu ──
    "tab.close": "关闭",
    "tab.closeOthers": "关闭其他标签",
    "tab.closeAll": "全部关闭",
    "tab.copyPath": "复制文件路径",
    "tab.reload": "重新加载",

    // ── Search Panel ──
    "search.findLabel": "查找",
    "search.replaceLabel": "替换",
    "search.regex": "正则",
    "search.caseSensitive": "区分大小写",
    "search.wholeWord": "全词匹配",
    "search.wrapAround": "循环",
    "search.findNextBtn": "查找下一个",
    "search.findPrevBtn": "查找上一个",
    "search.replaceBtn": "替换",
    "search.replaceAllBtn": "全部替换",
    "search.markAllBtn": "标记所有",
    "search.countBtn": "计数",
    "search.inFiles": "在文件中查找",

    // ── Dialogs ──
    "dialog.save": "保存",
    "dialog.cancel": "取消",
    "dialog.discard": "不保存",
    "dialog.close": "关闭",
    "dialog.ok": "确定",
    "dialog.run": "运行",
    "dialog.running": "运行中...",
    "dialog.runCommand": "运行命令",
    "dialog.runPlaceholder": "输入命令...",
    "dialog.about": "关于 ripNotepad++",
    "dialog.aboutText": "基于 Tauri v2 + Monaco Editor + React + TypeScript + Rust 构建",
    "dialog.goToLine": "转到行",
    "dialog.lineNumber": "行号",
    "dialog.preferences": "首选项",
    "dialog.shortcutMapper": "快捷键管理",
    "dialog.encoding": "编码",
    "dialog.unsavedChanges": "未保存的更改",
    "dialog.unsavedMessage": "文件有未保存的更改，是否保存？",

    // ── Status Bar ──
    "status.encoding": "编码",
    "status.language": "语言",
    "status.line": "行",
    "status.column": "列",

    // ── Welcome ──
    "welcome.title": "ripNotepad++",
    "welcome.subtitle": "Ctrl+N 新建 · Ctrl+O 打开 · Ctrl+S 保存",
    "welcome.dropHint": "拖放文件到此处打开",

    // ── Sidebar ──
    "sidebar.files": "文件",
    "sidebar.doclist": "文档列表",
    "sidebar.clipboard": "剪贴板历史",
    "sidebar.symbols": "符号",
    "sidebar.git": "Git",

    // ── Clipboard ──
    "clipboard.search": "搜索...",
    "clipboard.clear": "清空历史",
    "clipboard.empty": "复制内容将显示在此处",
    "clipboard.noResults": "无匹配结果",
    "clipboard.paste": "粘贴到编辑器",
    "clipboard.copy": "复制到系统剪贴板",
    "clipboard.pin": "固定/取消固定",
    "clipboard.remove": "移除",
    "sidebar.jsonViewer": "JSON",
    "sidebar.taskList": "任务列表",

    // ── JSON Viewer ──
    "json.noFile": "打开 JSON 文件以查看树形结构",
    "json.notJson": "当前文件不是 JSON 格式",
    "json.invalid": "JSON 解析错误",
    "json.empty": "文件为空",

    // ── Task List ──
    "tasklist.noFile": "打开文件以扫描待办事项",
    "tasklist.empty": "未发现待办事项",
    "tasklist.count": "个待办事项",

    // ── Compare ──
    "compare.title": "文件对比",
    "compare.back": "返回选择",
    "compare.left": "左侧文件（原始）",
    "compare.right": "右侧文件（修改后）",
    "compare.selectFile": "选择文件...",
    "compare.browse": "浏览",
    "compare.compare": "开始对比",
    "menu.compare": "文件对比(&C)...",
    "menu.edit.formatXml": "格式化 XML",
    "menu.edit.validateXml": "校验 XML",

    // ── Command Palette ──
    "cmdPalette.placeholder": "输入命令名称搜索...",
    "cmdPalette.noResults": "未找到匹配的命令",

    // ── Run Dialog ──
    "run.variables": "变量",
    "run.clear": "清空",

    // ── DocList ──
    "doclist.empty": "没有打开的文档",
    "doclist.count": "个文档",

    // ── Git ──
    "git.noProject": "打开一个文件夹以查看 Git 状态",
    "git.loading": "加载中...",
    "git.notRepo": "非 Git 仓库",
    "git.filesChanged": "个文件已更改",
    "git.refresh": "刷新",
    "git.clean": "✅ 工作区干净",
    "git.viewDiff": "查看差异",
    // ── Plugin ──
    "plugin.title": "插件管理",
    "plugin.loading": "加载中...",
    "plugin.empty": "未发现插件。将插件文件夹放入 plugins/ 目录。",
    "plugin.running": "运行中",
    "plugin.disabled": "已禁用",
    "plugin.start": "启动",
    "plugin.stop": "停止",
    "menu.plugins": "插件(&P)",

    "panel.noSymbols": "当前文件无符号",
    "panel.noFile": "未打开文件",

    // ── General ──
    "app.newFile": "新建文件",
    "app.close": "关闭",
    "app.save": "保存",
    "app.saveAs": "另存为",
    "app.open": "打开",
    "app.reload": "重新加载",
    "app.modified": "● ",
    "app.encoding.utf8": "UTF-8",
  },
};

export default zh;
