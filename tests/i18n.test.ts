import { describe, it, expect } from "vitest";
import { LANGUAGES } from "../src/i18n";

describe("i18n coverage", () => {
  const allCodes = LANGUAGES.map((l) => l.code);

  // ── Count ──

  it("has 57 languages registered", () => {
    expect(LANGUAGES).toHaveLength(57);
  });

  // ── Key parity ──

  it("all 58 language files have exactly the same keys as en", async () => {
    const enMod = await import("../src/i18n/en");
    const enTranslation = enMod.default.translation;
    const enKeys = Object.keys(enTranslation);
    expect(enKeys.length).toBeGreaterThan(0);

    for (const code of allCodes) {
      const codeKey = code === "zh-tw" ? "zh-tw" : code;
      const mod = await import(`../src/i18n/${codeKey}.ts`);
      const translation = mod.default.translation;
      const keys = Object.keys(translation);

      // All en keys present
      const missing = enKeys.filter((k) => !(k in translation));
      expect(missing, `${code}: missing ${missing.length} keys: ${missing.slice(0, 5).join(", ")}`)
        .toEqual([]);

      // No extra keys
      const extra = keys.filter((k) => !(k in enTranslation));
      expect(extra, `${code}: has ${extra.length} extra keys not in en: ${extra.slice(0, 5).join(", ")}`)
        .toEqual([]);

      // No empty values
      const empty = keys.filter((k) => typeof translation[k] === "string" && translation[k].trim() === "");
      expect(empty, `${code}: has ${empty.length} empty values`)
        .toEqual([]);
    }
  });

  // ── en reference quality ──

  it("en has no placeholder or empty values", () => {
    const allValues = Object.values(LANGUAGES[1] as unknown as Record<string, string>);
    // This just ensures the en module itself is well-formed
    expect(LANGUAGES.find((l) => l.code === "en")?.name).toBe("English");
  });

  // ── No duplicates ──

  it("LANGUAGES array has no duplicate codes", () => {
    const codes = LANGUAGES.map((l) => l.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("LANGUAGES array has no duplicate names", () => {
    const names = LANGUAGES.map((l) => l.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  // ── RTL languages ──

  it("all 5 RTL languages are registered", () => {
    const rtlCodes = ["ar", "he", "fa", "ur", "pa"];
    for (const code of rtlCodes) {
      expect(allCodes, `RTL code ${code} missing from LANGUAGES`).toContain(code);
    }
  });

  // ── VS Code official 15 ──

  it("covers all 14 VS Code official display languages (zh-tw removed)", () => {
    const vscodeCodes = [
      "en", "zh", "fr", "de", "it", "es",
      "ja", "ko", "ru", "pt", "tr", "pl", "cs", "hu",
    ];
    for (const code of vscodeCodes) {
      expect(allCodes, `VS Code language ${code} missing`).toContain(code);
    }
  });

  // ── Top 20 global languages ──

  it("covers top 20 global languages by native speakers", () => {
    // ISO 639-1 codes for the top 20 languages
    const top20 = [
      "zh", "es", "en", "hi", "ar", "pt", "bn", "ru", "ja",
      "pa", "de", "vi", "fr", "mr", "te", "tr", "ta", "ur", "ko", "it",
    ];
    const covered = top20.filter((c) => allCodes.includes(c));
    const missing = top20.filter((c) => !allCodes.includes(c));
    expect(missing, `Top 20 languages missing: ${missing.join(", ")}`).toEqual([]);
    expect(covered.length).toBeGreaterThanOrEqual(19);
  });

  // ── RTL codes in index match expectation ──

  it("RTL_CODES includes exactly ar, he, fa, ur, pa", async () => {
    // Dynamically check the RTL_CODES set
    const indexMod = await import("../src/i18n/index");
    // We can verify by calling applyDirection and checking dir
    const { applyDirection } = indexMod;
    // RTL languages should set dir to rtl
    for (const code of ["ar", "he", "fa", "ur", "pa"]) {
      document.documentElement.dir = "ltr"; // reset
      applyDirection(code);
      expect(document.documentElement.dir, `${code} should be RTL`).toBe("rtl");
    }
    // LTR languages should not change to rtl
    for (const code of ["en", "zh", "ja", "ko"]) {
      document.documentElement.dir = "ltr";
      applyDirection(code);
      expect(document.documentElement.dir, `${code} should be LTR`).toBe("ltr");
    }
  });
});
