import { create } from "zustand";
import type { EncodingInfo } from "../types/ipc";
import { ipc } from "../lib/ipc";

export interface EncodingState {
  supportedEncodings: EncodingInfo[];
  encodingGroups: Record<string, EncodingInfo[]>;
  encodingDialogOpen: boolean;
  convertTargetEncoding: string | null;

  // Actions
  loadEncodings: () => Promise<void>;
  openEncodingDialog: () => void;
  closeEncodingDialog: () => void;
  setConvertTargetEncoding: (name: string | null) => void;
  convertTabEncoding: (
    content: string,
    fromEncoding: string,
    toEncoding: string,
  ) => Promise<string>;
}

function groupEncodings(
  encodings: EncodingInfo[],
): Record<string, EncodingInfo[]> {
  const groups: Record<string, EncodingInfo[]> = {};
  for (const enc of encodings) {
    if (!groups[enc.group]) {
      groups[enc.group] = [];
    }
    groups[enc.group].push(enc);
  }
  return groups;
}

export const useEncodingStore = create<EncodingState>((set) => ({
  supportedEncodings: [],
  encodingGroups: {},
  encodingDialogOpen: false,
  convertTargetEncoding: null,

  loadEncodings: async () => {
    try {
      const encodings = await ipc.listEncodings();
      set({
        supportedEncodings: encodings,
        encodingGroups: groupEncodings(encodings),
      });
    } catch (err) {
      console.error("Failed to load encodings:", err);
    }
  },

  openEncodingDialog: () => set({ encodingDialogOpen: true }),
  closeEncodingDialog: () => set({ encodingDialogOpen: false }),

  setConvertTargetEncoding: (name) => set({ convertTargetEncoding: name }),

  convertTabEncoding: async (content, fromEncoding, toEncoding) => {
    // Convert content string to bytes in source encoding, then to target encoding
    const bytes = await ipc.encodeWithEncoding(content, fromEncoding);
    const converted = await ipc.decodeWithEncoding(bytes, toEncoding);
    return converted;
  },
}));
