import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import zh from "./zh";
import ja from "./ja";
import ko from "./ko";
import fr from "./fr";

const savedLang = localStorage.getItem("ripnotepadpp-lang") || "zh";

i18n.use(initReactI18next).init({
  resources: { en, zh, ja, ko, fr },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const LANGUAGES = [
  { code: "zh", name: "中文" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "fr", name: "Français" },
];

export default i18n;
