import { useEffect, useRef, useCallback, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { findRenderer } from "../../lib/previewEngine";
import "./MarkdownPreview.css"; // reuse existing styles

export function GenericPreview() {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useEditorRefStore((s) => s.editorRef);
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollSyncRef = useRef<{ dispose(): void } | null>(null);

  // Find matching renderer
  const renderer = activeTab
    ? findRenderer(activeTab.name, activeTab.language)
    : null;

  // Compute asset URL for local file access (images etc.)
  const assetUrl = useMemo(() => {
    if (!activeTab?.path) return null;
    try { return convertFileSrc(activeTab.path); } catch { return null; }
  }, [activeTab?.path]);

  // Render content to HTML
  const html = useMemo(() => {
    if (!renderer) return "";
    return renderer.render({
      content: activeTab?.content || "",
      filePath: activeTab?.path || null,
      assetUrl,
    });
  }, [renderer, activeTab?.content, activeTab?.path, assetUrl]);

  // Scroll sync: editor → preview
  const syncScroll = useCallback(() => {
    scrollSyncRef.current?.dispose();
    if (!editorRef) return;

    scrollSyncRef.current = editorRef.onDidScrollChange(() => {
      if (renderer?.useIframe) return; // iframe handles its own scroll
      if (!previewRef.current) return;
      const model = editorRef.getModel();
      if (!model) return;

      const ranges = editorRef.getVisibleRanges();
      const topLine = ranges[0]?.startLineNumber ?? 1;
      const totalLines = model.getLineCount();
      const scrollRatio = topLine / totalLines;

      const targetEl = previewRef.current.querySelector(`[data-line="${topLine}"]`) as HTMLElement;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        previewRef.current.scrollTop = scrollRatio * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
      }
    });
  }, [editorRef, renderer]);

  useEffect(() => {
    syncScroll();
    return () => scrollSyncRef.current?.dispose();
  }, [syncScroll, activeTab?.id]);

  // Iframe scroll sync: editor → iframe
  useEffect(() => {
    if (!renderer?.useIframe || !editorRef) return;
    if (!iframeRef.current?.contentWindow) return;

    const disposable = editorRef.onDidScrollChange(() => {
      const ranges = editorRef.getVisibleRanges();
      const topLine = ranges[0]?.startLineNumber ?? 1;
      const model = editorRef.getModel();
      if (!model) return;
      const totalLines = model.getLineCount();
      const ratio = topLine / Math.max(totalLines, 1);
      try {
        iframeRef.current!.contentWindow!.scrollTo({
          top: ratio * iframeRef.current!.contentDocument!.body.scrollHeight,
          behavior: "smooth",
        });
      } catch { /* cross-origin guard */ }
    });

    return () => disposable.dispose();
  }, [renderer, editorRef, activeTab?.id]);

  // Click on preview → jump to editor line
  const handleClick = useCallback(
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

  if (!renderer) {
    return <div className="markdown-empty">No preview available for this file type</div>;
  }

  if (!activeTab?.content && !activeTab?.path) {
    return <div className="markdown-empty">Save the file first to preview</div>;
  }

  // HTML iframe renderer
  if (renderer.useIframe) {
    return (
      <div className="markdown-preview">
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          title={`${renderer.name} Preview`}
        />
      </div>
    );
  }

  // Markdown/DOM renderer
  return (
    <div className="markdown-preview" ref={previewRef} onClick={handleClick}>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
