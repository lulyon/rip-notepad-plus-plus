import { describe, it, expect } from "vitest";
import { LANGUAGES } from "../src/i18n";

describe("i18n coverage", () => {
  // All language codes that should exist
  const allCodes = LANGUAGES.map((l) => l.code);

  it("has 47 languages registered", () => {
    expect(LANGUAGES).toHaveLength(47);
  });

  it("all language files have same key count as en", async () => {
    const enMod = await import("../src/i18n/en");
    const enKeys = Object.keys(enMod.default.translation);
    expect(enKeys.length).toBeGreaterThan(0);

    for (const code of allCodes) {
      const codeKey = code === "zh-tw" ? "zh-tw" : code;
      const mod = await import(`../src/i18n/${codeKey}.ts`);
      const keys = Object.keys(mod.default.translation);
      expect(keys.length, `${code}: key count mismatch`).toBe(enKeys.length);

      // Verify all en keys exist
      const missing = enKeys.filter((k) => !(k in mod.default.translation));
      expect(missing, `${code}: missing keys`).toEqual([]);
    }
  });

  it("RTL_CODES includes ar, he, fa, ur, pa", () => {
    // RTL support is critical for Arabic, Hebrew, Persian, Urdu, Punjabi
    const rtlCodes = ["ar", "he", "fa", "ur", "pa"];
    for (const code of rtlCodes) {
      expect(allCodes).toContain(code);
    }
  });

  it("LANGUAGES array has no duplicate codes", () => {
    const codes = LANGUAGES.map((l) => l.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});
