import { useEffect, useRef, useState } from "react";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { useEditorStore } from "../../stores/editorStore";

let graphvizPromise: ReturnType<typeof Graphviz.load> | null = null;
function getGraphviz() {
  if (!graphvizPromise) graphvizPromise = Graphviz.load();
  return graphvizPromise;
}

export function DotPreview() {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeTab?.content) return;
    const container = containerRef.current;
    if (!container) return;

    getGraphviz().then((graphviz: any) => {
      try {
        const svg = graphviz.layout(activeTab.content, "svg", "dot");
        container.innerHTML = svg;
        const svgEl = container.querySelector("svg");
        if (svgEl) {
          svgEl.style.maxWidth = "100%";
          svgEl.style.maxHeight = "100%";
          svgEl.style.display = "block";
          svgEl.style.margin = "0 auto";
        }
      } catch (e: any) {
        setError(e.message || "Failed to render graph");
      }
    }).catch((e: any) => {
      setError(e.message || "Failed to load Graphviz engine");
    });
  }, [activeTab?.content]);

  if (!activeTab?.content) {
    return <div className="markdown-empty">No content</div>;
  }

  if (error) {
    return <div className="markdown-empty" style={{ color: "#f88" }}>{error}</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        overflow: "auto",
        padding: "16px",
      }}
    />
  );
}
