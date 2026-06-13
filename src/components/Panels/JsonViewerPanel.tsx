import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import "./JsonViewerPanel.css";

interface JsonNode {
  key: string;
  value: unknown;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  children?: JsonNode[];
  path: string;
}

function parseJsonValue(key: string, value: unknown, path: string): JsonNode {
  if (value === null) return { key, value: null, type: "null", path };
  if (typeof value === "string") return { key, value, type: "string", path };
  if (typeof value === "number") return { key, value, type: "number", path };
  if (typeof value === "boolean") return { key, value, type: "boolean", path };
  if (Array.isArray(value)) {
    return {
      key, value, type: "array", path,
      children: value.map((v, i) => parseJsonValue(`[${i}]`, v, `${path}.[${i}]`)),
    };
  }
  if (typeof value === "object") {
    return {
      key, value, type: "object", path,
      children: Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        parseJsonValue(k, v, path ? `${path}.${k}` : k)),
    };
  }
  return { key, value: String(value), type: "string", path };
}

function JsonNodeRow({ node, depth }: { node: JsonNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const typeClass = `json-type-${node.type}`;
  const indent = depth * 16;

  const handleCopyPath = useCallback(async () => {
    await navigator.clipboard.writeText(node.path);
  }, [node.path]);

  const valuePreview = () => {
    if (hasChildren) return node.type === "array" ? `[${node.children!.length}]` : `{${node.children!.length}}`;
    const v = node.value;
    if (typeof v === "string") return `"${(v as string).substring(0, 40)}${(v as string).length > 40 ? "…" : ""}"`;
    return String(v);
  };

  return (
    <>
      <div className="json-row" style={{ paddingLeft: `${indent + 8}px` }}>
        {hasChildren ? (
          <span className="json-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="json-toggle-placeholder" />
        )}
        {node.key && <span className="json-key">{node.key}: </span>}
        <span className={`json-value ${typeClass}`} title={node.path} onClick={handleCopyPath}>
          {valuePreview()}
        </span>
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
        <JsonNodeRow key={child.path} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function JsonViewerPanel() {
  const { t } = useTranslation();
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTab = useEditorStore((s) => s.tabs.find((tb) => tb.id === activeTabId));

  const { tree, error } = useMemo(() => {
    if (!activeTab?.content) return { tree: null, error: null };
    try {
      const parsed = JSON.parse(activeTab.content);
      const root = parseJsonValue("root", parsed, "");
      return { tree: root, error: null };
    } catch (e) {
      return { tree: null, error: String(e) };
    }
  }, [activeTab?.content]);

  if (!activeTab) {
    return <div className="json-panel"><div className="json-empty">{t("json.noFile")}</div></div>;
  }

  if (activeTab.language !== "json" && !activeTab.name.endsWith(".json")) {
    return <div className="json-panel"><div className="json-empty">{t("json.notJson")}</div></div>;
  }

  if (error) {
    return <div className="json-panel"><div className="json-error">{t("json.invalid")}: {error}</div></div>;
  }

  if (!tree) {
    return <div className="json-panel"><div className="json-empty">{t("json.empty")}</div></div>;
  }

  return (
    <div className="json-panel">
      <div className="json-tree">
        {tree.children?.map((child) => (
          <JsonNodeRow key={child.path} node={child} depth={0} />
        ))}
      </div>
    </div>
  );
}
