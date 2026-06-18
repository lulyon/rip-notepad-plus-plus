import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import zh from "./zh";
import ja from "./ja";
import ko from "./ko";
import fr from "./fr";
import ar from "./ar";
import he from "./he";
import de from "./de";
import es from "./es";
import pt from "./pt";
import ru from "./ru";
import it from "./it";
import tr from "./tr";
import pl from "./pl";
import cs from "./cs";
import hu from "./hu";
import zhTw from "./zh-tw";
import fa from "./fa";
import uk from "./uk";
import vi from "./vi";
import hi from "./hi";
import nl from "./nl";
import sv from "./sv";
import fi from "./fi";
import da from "./da";
import nb from "./nb";
import th from "./th";
import id from "./id";
import ro from "./ro";
import sk from "./sk";
import el from "./el";
import sr from "./sr";
import bg from "./bg";
import lt from "./lt";
import lv from "./lv";
import sl from "./sl";
import hr from "./hr";
import et from "./et";
import ca from "./ca";
import eu from "./eu";
import gl from "./gl";
import ur from "./ur";
import pa from "./pa";
import sw from "./sw";
import ha from "./ha";
import am from "./am";
import my from "./my";
import bn from "./bn";
import te from "./te";
import mr from "./mr";
import ta from "./ta";
import gu from "./gu";
import kn from "./kn";
import tl from "./tl";
import km from "./km";
import ne from "./ne";
import yo from "./yo";
import ig from "./ig";

const savedLang = localStorage.getItem("ripnotepadpp-lang") || "zh";

i18n.use(initReactI18next).init({
  resources: {
    en, zh, ja, ko, fr, ar, he,
    de, es, pt, ru, it, tr, pl, cs, hu,
    "zh-tw": zhTw, fa, uk, vi, hi, nl, sv, fi, da,
    nb, th, id, ro, sk, el, sr, bg, lt,
    lv, sl, hr, et, ca, eu, gl,
    ur, pa, sw, ha, am, my,
    bn, te, mr, ta, gu, kn, tl, km, ne, yo, ig,
  } as unknown as Record<string, { translation: Record<string, string> }>,
  lng: savedLang,
  fallbackLng: {
    "zh-tw": ["en"],  // prevent fallback to zh (Simplified)
    default: ["en"],
  },
  supportedLngs: [
    "zh", "en", "ja", "ko", "fr", "ar", "he",
    "de", "es", "pt", "ru", "it", "tr", "pl", "cs", "hu",
    "zh-tw", "fa", "uk", "vi", "hi", "nl", "sv", "fi", "da",
    "nb", "th", "id", "ro", "sk", "el", "sr", "bg", "lt",
    "lv", "sl", "hr", "et", "ca", "eu", "gl",
    "ur", "pa", "sw", "ha", "am", "my",
    "bn", "te", "mr", "ta", "gu", "kn", "tl", "km", "ne", "yo", "ig",
  ],
  nonExplicitSupportedLngs: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const LANGUAGES = [
  { code: "zh", name: "中文" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية" },
  { code: "he", name: "עברית" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "it", name: "Italiano" },
  { code: "tr", name: "Türkçe" },
  { code: "pl", name: "Polski" },
  { code: "cs", name: "Čeština" },
  { code: "hu", name: "Magyar" },
  { code: "zh-tw", name: "繁體中文" },
  { code: "fa", name: "فارسی" },
  { code: "uk", name: "Українська" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "hi", name: "हिन्दी" },
  { code: "nl", name: "Nederlands" },
  { code: "sv", name: "Svenska" },
  { code: "fi", name: "Suomi" },
  { code: "da", name: "Dansk" },
  { code: "nb", name: "Norsk (Bokmål)" },
  { code: "th", name: "ภาษาไทย" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ro", name: "Română" },
  { code: "sk", name: "Slovenčina" },
  { code: "el", name: "Ελληνικά" },
  { code: "sr", name: "Српски" },
  { code: "bg", name: "Български" },
  { code: "lt", name: "Lietuvių" },
  { code: "lv", name: "Latviešu" },
  { code: "sl", name: "Slovenščina" },
  { code: "hr", name: "Hrvatski" },
  { code: "et", name: "Eesti" },
  { code: "ca", name: "Català" },
  { code: "eu", name: "Euskara" },
  { code: "gl", name: "Galego" },
  { code: "ur", name: "اردو" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "sw", name: "Kiswahili" },
  { code: "ha", name: "Hausa" },
  { code: "am", name: "አማርኛ" },
  { code: "my", name: "မြန်မာဘာသာ" },
  { code: "bn", name: "বাংলা" },
  { code: "te", name: "తెలుగు" },
  { code: "mr", name: "मराठी" },
  { code: "ta", name: "தமிழ்" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "tl", name: "Tagalog" },
  { code: "km", name: "ភាសាខ្មែរ" },
  { code: "ne", name: "नेपाली" },
  { code: "yo", name: "Yorùbá" },
  { code: "ig", name: "Igbo" },
];

/** RTL languages: set html[dir] accordingly */
const RTL_CODES = new Set(["ar", "he", "fa", "ur", "pa"]);

export function applyDirection(lang: string) {
  document.documentElement.dir = RTL_CODES.has(lang) ? "rtl" : "ltr";
}

applyDirection(savedLang);
i18n.on("languageChanged", applyDirection);

export default i18n;
