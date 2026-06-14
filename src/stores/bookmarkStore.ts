import { create } from "zustand";

/**
 * Bookmarks — gutter markers per tab.
 * NP++ style: toggle on line, navigate next/prev, clear all.
 */
export interface BookmarkEntry {
  line: number;
  column: number;
}

interface BookmarkState {
  /** Map of tabId → sorted array of bookmark lines */
  bookmarks: Record<string, BookmarkEntry[]>;
  toggleBookmark: (tabId: string, line: number, column?: number) => void;
  clearBookmarks: (tabId: string) => void;
  hasBookmark: (tabId: string, line: number) => boolean;
  getBookmarks: (tabId: string) => BookmarkEntry[];
  /** Find bookmark line before/after the given line */
  findPrevBookmark: (tabId: string, currentLine: number) => number | null;
  findNextBookmark: (tabId: string, currentLine: number) => number | null;
  removeBookmarksForTab: (tabId: string) => void;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: {},

  toggleBookmark: (tabId, line, column = 1) => {
    set((s) => {
      const entries = [...(s.bookmarks[tabId] || [])];
      const idx = entries.findIndex((b) => b.line === line);
      if (idx >= 0) {
        entries.splice(idx, 1);
      } else {
        entries.push({ line, column });
        entries.sort((a, b) => a.line - b.line);
      }
      return { bookmarks: { ...s.bookmarks, [tabId]: entries } };
    });
  },

  clearBookmarks: (tabId) => {
    set((s) => {
      const { [tabId]: _, ...rest } = s.bookmarks;
      return { bookmarks: rest };
    });
  },

  hasBookmark: (tabId, line) => {
    const entries = get().bookmarks[tabId] || [];
    return entries.some((b) => b.line === line);
  },

  getBookmarks: (tabId) => {
    return get().bookmarks[tabId] || [];
  },

  findPrevBookmark: (tabId, currentLine) => {
    const entries = get().bookmarks[tabId] || [];
    if (entries.length === 0) return null;
    // Find last bookmark before currentLine
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].line < currentLine) return entries[i].line;
    }
    // Wrap: return last bookmark
    return entries[entries.length - 1].line;
  },

  findNextBookmark: (tabId, currentLine) => {
    const entries = get().bookmarks[tabId] || [];
    if (entries.length === 0) return null;
    // Find first bookmark after currentLine
    for (const b of entries) {
      if (b.line > currentLine) return b.line;
    }
    // Wrap: return first bookmark
    return entries[0].line;
  },

  removeBookmarksForTab: (tabId) => {
    set((s) => {
      const { [tabId]: _, ...rest } = s.bookmarks;
      return { bookmarks: rest };
    });
  },
}));
