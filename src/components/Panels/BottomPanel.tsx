import { useState, useCallback } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { TerminalPanel } from "./TerminalPanel";
import "./BottomPanel.css";

export function BottomPanel() {
  const showTerminal = useSettingsStore((s) => s.showTerminal);
  const [height, setHeight] = useState(250);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const onMove = (ev: MouseEvent) => {
      const newH = Math.max(60, Math.min(600, startH + (startY - ev.clientY)));
      setHeight(newH);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  if (!showTerminal) return null;

  return (
    <div className="bottom-panel" style={{ height }}>
      <div className="bottom-panel-drag" onMouseDown={handleDrag} />
      <div className="bottom-panel-content">
        <TerminalPanel embedded />
      </div>
    </div>
  );
}
