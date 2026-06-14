import { create } from "zustand";

/**
 * 5-style Mark system (NP++ compatible).
 * Each style is a distinct highlight color.
 * Operations: mark, unmark, navigate, copy/cut/paste/delete marked lines, inverse.
 */
export type MarkStyleId = 1 | 2 | 3 | 4 | 5;

export interface MarkedLine {
  line: number;
  style: MarkStyleId;
}

interface MarkState {
  /** Map of tabId → array of marked lines */
  marks: Record<string, MarkedLine[]>;

  /** Mark all occurrences of a word with given style */
  markAll: (tabId: string, lines: number[], style: MarkStyleId) => void;
  /** Mark a single line with given style */
  markOne: (tabId: string, line: number, style: MarkStyleId) => void;
  /** Unmark all lines of a given style */
  unmarkAll: (tabId: string, style: MarkStyleId) => void;
  /** Clear ALL marks for a tab */
  clearAllMarks: (tabId: string) => void;
  /** Inverse marks (swap marked ↔ unmarked for a style) */
  inverseMarks: (tabId: string, style: MarkStyleId, totalLines: number) => void;
  /** Get all marks for a tab */
  getMarks: (tabId: string) => MarkedLine[];
  /** Check if a line is marked */
  isMarked: (tabId: string, line: number) => MarkStyleId | null;
  /** Find next/prev mark from a given line */
  findNextMark: (tabId: string, currentLine: number, style?: MarkStyleId) => number | null;
  findPrevMark: (tabId: string, currentLine: number, style?: MarkStyleId) => number | null;
  /** Get all lines marked with a specific style */
  getLinesForStyle: (tabId: string, style: MarkStyleId) => number[];
  /** Remove bookmarks for closed tab */
  removeMarksForTab: (tabId: string) => void;
}

const MARK_STYLE_COLORS: Record<MarkStyleId, string> = {
  1: "#4FC1FF", // blue
  2: "#7BC86B", // green
  3: "#FFA344", // orange
  4: "#FF6B8A", // pink
  5: "#C586C0", // purple
};

export { MARK_STYLE_COLORS };

export const useMarkStore = create<MarkState>((set, get) => ({
  marks: {},

  markAll: (tabId, lines, style) => {
    set((s) => {
      const existing = (s.marks[tabId] || []).filter(
        (m) => m.style !== style || lines.includes(m.line)
      );
      for (const line of lines) {
        if (!existing.some((m) => m.line === line && m.style === style)) {
          existing.push({ line, style });
        }
      }
      existing.sort((a, b) => a.line - b.line);
      return { marks: { ...s.marks, [tabId]: existing } };
    });
  },

  markOne: (tabId, line, style) => {
    set((s) => {
      const existing = [...(s.marks[tabId] || [])];
      const idx = existing.findIndex(
        (m) => m.line === line && m.style === style
      );
      if (idx >= 0) {
        existing.splice(idx, 1);
      } else {
        // Remove any other style on same line, then add
        const other = existing.filter((m) => m.line !== line);
        other.push({ line, style });
        other.sort((a, b) => a.line - b.line);
        return { marks: { ...s.marks, [tabId]: other } };
      }
      return { marks: { ...s.marks, [tabId]: existing } };
    });
  },

  unmarkAll: (tabId, style) => {
    set((s) => ({
      marks: {
        ...s.marks,
        [tabId]: (s.marks[tabId] || []).filter((m) => m.style !== style),
      },
    }));
  },

  clearAllMarks: (tabId) => {
    set((s) => {
      const { [tabId]: _, ...rest } = s.marks;
      return { marks: rest };
    });
  },

  inverseMarks: (tabId, style, totalLines) => {
    set((s) => {
      const existing = s.marks[tabId] || [];
      const markedLines = new Set(
        existing.filter((m) => m.style === style).map((m) => m.line)
      );
      const newMarks = existing.filter((m) => m.style !== style);
      for (let l = 1; l <= totalLines; l++) {
        if (!markedLines.has(l)) {
          newMarks.push({ line: l, style });
        }
      }
      newMarks.sort((a, b) => a.line - b.line);
      return { marks: { ...s.marks, [tabId]: newMarks } };
    });
  },

  getMarks: (tabId) => get().marks[tabId] || [],

  isMarked: (tabId, line) => {
    const mark = (get().marks[tabId] || []).find((m) => m.line === line);
    return mark ? mark.style : null;
  },

  findNextMark: (tabId, currentLine, style) => {
    const entries = (get().marks[tabId] || []).filter(
      (m) => !style || m.style === style
    );
    for (const b of entries) {
      if (b.line > currentLine) return b.line;
    }
    return entries.length > 0 ? entries[0].line : null;
  },

  findPrevMark: (tabId, currentLine, style) => {
    const entries = (get().marks[tabId] || []).filter(
      (m) => !style || m.style === style
    );
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].line < currentLine) return entries[i].line;
    }
    return entries.length > 0 ? entries[entries.length - 1].line : null;
  },

  getLinesForStyle: (tabId, style) => {
    return (get().marks[tabId] || [])
      .filter((m) => m.style === style)
      .map((m) => m.line);
  },

  removeMarksForTab: (tabId) => {
    set((s) => {
      const { [tabId]: _, ...rest } = s.marks;
      return { marks: rest };
    });
  },
}));
