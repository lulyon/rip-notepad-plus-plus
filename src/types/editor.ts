export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export type SplitView = "none" | "horizontal" | "vertical";
export type WordWrap = "off" | "on" | "wordWrapColumn" | "bounded";
