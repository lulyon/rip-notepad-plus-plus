# ripNotepad++ Supported Languages

41 languages with 100% translation coverage. Covers all VS Code official languages + significant Notepad++ translations.

```
┌──────┬───────────────────────────────────────┬──────┬──────────┐
│  #   │              Language                 │ Code │  Source  │
├──────┼───────────────────────────────────────┼──────┼──────────┤
│    1 │ 中文 (简体)                           │  zh  │ Existing │
│    2 │ English                               │  en  │ Existing │
│    3 │ 日本語                                │  ja  │ Existing │
│    4 │ 한국어                                │  ko  │ Existing │
│    5 │ Français                              │  fr  │ Existing │
│    6 │ العربية                               │  ar  │ Existing │
│    7 │ עברית                                 │  he  │ Existing │
├──────┼───────────────────────────────────────┼──────┼──────────┤
│    8 │ Deutsch                               │  de  │ VS Code  │
│    9 │ Español                               │  es  │ VS Code  │
│   10 │ Português                             │  pt  │ VS Code  │
│   11 │ Русский                               │  ru  │ VS Code  │
│   12 │ Italiano                              │  it  │ VS Code  │
│   13 │ Türkçe                                │  tr  │ VS Code  │
│   14 │ Polski                                │  pl  │ VS Code  │
│   15 │ Čeština                               │  cs  │ VS Code  │
│   16 │ Magyar                                │  hu  │ VS Code  │
├──────┼───────────────────────────────────────┼──────┼──────────┤
│   17 │ 繁體中文                              │zh-tw │  NP++    │
│   18 │ فارسی                                 │  fa  │  NP++ ✨ │
│   19 │ Українська                            │  uk  │  NP++    │
│   20 │ Tiếng Việt                            │  vi  │  NP++    │
│   21 │ हिन्दी                                │  hi  │  NP++    │
│   22 │ Nederlands                            │  nl  │  NP++    │
│   23 │ Svenska                               │  sv  │  NP++    │
│   24 │ Suomi                                 │  fi  │  NP++    │
│   25 │ Dansk                                 │  da  │  NP++    │
│   26 │ Norsk (Bokmål)                        │  nb  │  NP++    │
│   27 │ ภาษาไทย                               │  th  │  NP++    │
│   28 │ Bahasa Indonesia                      │  id  │  NP++    │
│   29 │ Română                                │  ro  │  NP++    │
│   30 │ Slovenčina                            │  sk  │  NP++    │
│   31 │ Ελληνικά                              │  el  │  NP++    │
│   32 │ Српски (Latinica)                     │  sr  │  NP++    │
│   33 │ Български                             │  bg  │  NP++    │
│   34 │ Lietuvių                              │  lt  │  NP++    │
│   35 │ Latviešu                              │  lv  │  NP++    │
│   36 │ Slovenščina                           │  sl  │  NP++    │
│   37 │ Hrvatski                              │  hr  │  NP++    │
│   38 │ Eesti                                 │  et  │  NP++    │
│   39 │ Català                                │  ca  │  NP++    │
│   40 │ Euskara                               │  eu  │  NP++    │
│   41 │ Galego                                │  gl  │  NP++    │
└──────┴───────────────────────────────────────┴──────┴──────────┘
```

## Coverage

| Benchmark | Status |
|-----------|:---:|
| VS Code official 15 | ✅ 15/15 |
| Notepad++ significant | ✅ All |
| RTL languages | ar, he, fa (VS Code has no native RTL) |

## Adding a New Language

1. Create `src/i18n/<code>.ts` with all 495 keys
2. Add to `src/i18n/index.ts`: import + LANGUAGES array entry
3. If RTL, add code to `RTL_CODES` set
4. Run `npx vitest run` to verify key count matches en
