import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { findRenderer } from "../../lib/previewEngine";
import { ThreePreview } from "./ThreePreview";
import { DotPreview } from "./DotPreview";
import "./MarkdownPreview.css"; // reuse existing styles

export function GenericPreview() {
  const { t } = useTranslation();
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
  const [zipHtml, setZipHtml] = useState<string>("");
  const html = useMemo(() => {
    if (!renderer) return "";
    if (renderer.id === "zip") {
      // Load archive listing asynchronously
      if (activeTab?.path) {
        import("../../lib/ipc").then(({ ipc }) => {
          ipc.listArchive(activeTab.path!).then((entries) => {
            const rows = entries.map((e: any) =>
              `<div class="entry ${e.is_dir ? 'dir' : 'file'}"><span class="name">${e.is_dir ? '📁' : '📄'} ${e.name}</span><span class="size">${e.is_dir ? '' : formatSize(e.size)}</span></div>`
            ).join("");
            setZipHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
              *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px}
              h2{color:#9cdcfe;margin-bottom:8px}.entry{padding:4px 0;border-bottom:1px solid #2a2a2a;display:flex}
              .name{flex:1}.size{color:#888;text-align:right;min-width:80px}
              .dir{color:#569cd6}.file{color:#d4d4d4}.err{color:#999;text-align:center;padding:40px}
            </style></head><body><h2>${entries.length} entries</h2>${rows}</body></html>`);
          }).catch(() => setZipHtml(`<p class='err'>${t("preview.archiveFailed")}</p>`));
        });
      }
      return zipHtml || renderer.render({ content: "", filePath: activeTab?.path || null, assetUrl });
    }
    return renderer.render({
      content: activeTab?.content || "",
      filePath: activeTab?.path || null,
      assetUrl,
    });
  }, [renderer, activeTab?.content, activeTab?.path, assetUrl, zipHtml]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)}KB`;
    return `${(bytes/(1024*1024)).toFixed(1)}MB`;
  }

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
    return <div className="markdown-empty">{t("preview.noPreview")}</div>;
  }

  if (!activeTab?.content && !activeTab?.path) {
    return <div className="markdown-empty">{t("preview.saveFirst")}</div>;
  }

  // 3D model — React component (three.js from npm, fully offline)
  if (renderer.id === "3d") {
    return (
      <div className="markdown-preview">
        <ThreePreview />
      </div>
    );
  }

  // DOT/Graphviz — React component (@hpcc-js/wasm, fully offline)
  if (renderer.id === "dot") {
    return (
      <div className="markdown-preview">
        <DotPreview />
      </div>
    );
  }

  // PDF — render directly via asset URL (not double-wrapped iframe)
  if (renderer.id === "pdf" && assetUrl) {
    return (
      <div className="markdown-preview">
        <iframe src={assetUrl} className="preview-iframe" title={t("preview.pdfTitle")} />
      </div>
    );
  }

  // HTML iframe renderer
  if (renderer.useIframe) {
    // Asset-based renderers (docx/xlsx/3d/font/audio/video) need same-origin for local file access
    const needsAsset = ["docx", "xlsx", "pdf", "sqlite", "3d", "font", "audio", "video", "image"].includes(renderer.id);
    return (
      <div className="markdown-preview">
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          srcDoc={html}
          sandbox={needsAsset ? "allow-scripts allow-same-origin" : "allow-scripts"}
          title={t("preview.iframeTitle", { name: renderer.name })}
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
