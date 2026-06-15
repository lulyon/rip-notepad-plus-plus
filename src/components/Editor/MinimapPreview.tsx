import { useState, useRef, useCallback } from "react";
import "./MinimapPreview.css";

export function useMinimapPreview(editorRef: any) {
  const [visible, setVisible] = useState(false);
  const [lines, setLines] = useState<{ num: number; text: string; isTarget: boolean }[]>([]);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<number>(0);

  const showPreview = useCallback((lineNumber: number, clientX: number, clientY: number) => {
    if (!editorRef) return;
    const model = editorRef.getModel();
    if (!model) return;

    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const total = model.getLineCount();
      const start = Math.max(1, lineNumber - 10);
      const end = Math.min(total, lineNumber + 10);
      const previewLines = [];
      for (let i = start; i <= end; i++) {
        previewLines.push({
          num: i,
          text: model.getLineContent(i).slice(0, 150),
          isTarget: i === lineNumber,
        });
      }
      setLines(previewLines);
      setPos({ x: clientX + 12, y: clientY - 12 });
      setVisible(true);
    }, 80);
  }, [editorRef]);

  const hidePreview = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return { visible, lines, pos, showPreview, hidePreview };
}

export function MinimapPreview({
  visible, lines, pos,
}: {
  visible: boolean; lines: { num: number; text: string; isTarget: boolean }[]; pos: { x: number; y: number };
}) {
  if (!visible || lines.length === 0) return null;

  return (
    <div className="minimap-preview" style={{ left: pos.x, top: pos.y }}>
      {lines.map((l) => (
        <div key={l.num} className={`minimap-preview-line ${l.isTarget ? "target" : ""}`}>
          <span className="minimap-preview-ln">{l.num}</span>
          <span className="minimap-preview-code">{l.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
