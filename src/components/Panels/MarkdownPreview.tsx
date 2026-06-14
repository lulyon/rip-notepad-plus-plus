import { useEffect, useRef, useCallback } from "react";
import MarkdownIt from "markdown-it";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./MarkdownPreview.css";

// Initialize markdown-it with common plugins
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str: string, lang: string) {
    // Code blocks — wrap in pre/code with language class
    const escaped = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="hljs"><code class="language-${lang || "plaintext"}">${escaped}</code></pre>`;
  },
});

/** Inject data-line attributes for scroll sync */
function injectLineNumbers(html: string): string {
  // Wrap each block-level element with data-line tracking
  // We parse the source lines and map them to rendered elements
  // For now, a simplified approach: add data-line to headings and paragraphs
  let lineIndex = 0;
  return html.replace(/<(h[1-6]|p|li|blockquote|pre|table|hr)([\s>])/gi, (match) => {
    lineIndex++;
    return match.replace(/^<(\w+)/, `<$1 data-line="${lineIndex}"`);
  });
}

export function MarkdownPreview() {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useEditorRefStore((s) => s.editorRef);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollSyncRef = useRef<{ dispose(): void } | null>(null);

  const isMarkdown = activeTab?.language === "markdown" ||
    activeTab?.name?.endsWith(".md") ||
    activeTab?.path?.endsWith(".md");

  // Render markdown to HTML
  const html = activeTab?.content
    ? injectLineNumbers(md.render(activeTab.content))
    : "";

  // Scroll sync: editor → preview
  const setupScrollSync = useCallback(() => {
    if (!editorRef) return;
    scrollSyncRef.current?.dispose();

    scrollSyncRef.current = editorRef.onDidScrollChange((_e) => {
      if (!previewRef.current) return;
      const model = editorRef.getModel();
      if (!model) return;

      // Get the top visible line in the editor
      const ranges = editorRef.getVisibleRanges();
      const topLine = ranges[0]?.startLineNumber ?? 1;
      const totalLines = model.getLineCount();
      const scrollRatio = topLine / totalLines;

      // Find the corresponding element in the preview
      const targetEl = previewRef.current.querySelector(`[data-line="${topLine}"]`) as HTMLElement;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Fallback: proportional scroll
        previewRef.current.scrollTop =
          scrollRatio * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
      }
    });
  }, [editorRef]);

  // Setup scroll sync when preview becomes active
  useEffect(() => {
    setupScrollSync();
    return () => scrollSyncRef.current?.dispose();
  }, [setupScrollSync, activeTab?.id]);

  // Click on preview element → jump to editor line
  const handlePreviewClick = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-line]") as HTMLElement;
      if (!target || !editorRef) return;
      const line = parseInt(target.dataset.line || "0", 10);
      if (line > 0) {
        editorRef.revealLineInCenter(line);
        editorRef.setPosition({ lineNumber: line, column: 1 });
        editorRef.focus();
      }
    },
    [editorRef],
  );

  if (!isMarkdown) {
    return (
      <div className="markdown-preview">
        <div className="markdown-empty">Open a .md file to preview</div>
      </div>
    );
  }

  if (!activeTab?.content) {
    return (
      <div className="markdown-preview">
        <div className="markdown-empty">No content</div>
      </div>
    );
  }

  return (
    <div className="markdown-preview" ref={previewRef} onClick={handlePreviewClick}>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
