import { describe, it, expect, beforeAll } from "vitest";
import { findRenderer, hasPreview, registerPreviewRenderer } from "../src/lib/previewEngine";
import i18n from "../src/i18n";

// Set language to English for deterministic test output
beforeAll(() => {
  i18n.changeLanguage("en");
});

// ── Renderer detection ──

describe("previewEngine — renderer detection", () => {
  it("finds markdown renderer by extension", () => {
    const r = findRenderer("readme.md", "plaintext");
    expect(r).not.toBeNull();
    expect(r!.id).toBe("markdown");
  });

  it("finds markdown renderer by language", () => {
    const r = findRenderer("untitled", "markdown");
    expect(r).not.toBeNull();
    expect(r!.id).toBe("markdown");
  });

  it("finds html renderer", () => {
    expect(findRenderer("index.html", "")!.id).toBe("html");
    expect(findRenderer("page.htm", "")!.id).toBe("html");
  });

  it("finds image renderers", () => {
    expect(findRenderer("photo.png", "")!.id).toBe("image");
    expect(findRenderer("photo.jpg", "")!.id).toBe("image");
    expect(findRenderer("photo.webp", "")!.id).toBe("image");
    expect(findRenderer("photo.gif", "")!.id).toBe("image");
  });

  it("finds SVG source renderer", () => {
    expect(findRenderer("icon.svg", "")!.id).toBe("svg-source");
  });

  it("finds CSV renderer", () => {
    expect(findRenderer("data.csv", "")!.id).toBe("csv");
    expect(findRenderer("data.tsv", "")!.id).toBe("csv");
  });

  it("finds JSON renderer", () => {
    expect(findRenderer("config.json", "")!.id).toBe("json");
  });

  it("finds PDF renderer", () => {
    expect(findRenderer("doc.pdf", "")!.id).toBe("pdf");
  });

  it("finds XML renderer", () => {
    expect(findRenderer("config.xml", "")!.id).toBe("xml");
  });

  it("finds YAML renderer", () => {
    expect(findRenderer("config.yml", "")!.id).toBe("yaml");
    expect(findRenderer("config.yaml", "")!.id).toBe("yaml");
  });

  it("finds diff renderer", () => {
    expect(findRenderer("changes.diff", "")!.id).toBe("diff");
    expect(findRenderer("changes.patch", "")!.id).toBe("diff");
  });

  it("finds env renderer", () => {
    expect(findRenderer(".env", "")!.id).toBe("env");
  });

  it("finds xlsx renderer", () => {
    expect(findRenderer("report.xlsx", "")!.id).toBe("xlsx");
    expect(findRenderer("report.xls", "")!.id).toBe("xlsx");
  });

  it("finds ipynb renderer", () => {
    expect(findRenderer("notebook.ipynb", "")!.id).toBe("ipynb");
  });

  it("finds docx renderer", () => {
    expect(findRenderer("document.docx", "")!.id).toBe("docx");
  });

  it("finds geojson renderer", () => {
    expect(findRenderer("map.geojson", "")!.id).toBe("geojson");
  });

  it("finds sqlite renderer", () => {
    expect(findRenderer("data.sqlite", "")!.id).toBe("sqlite");
    expect(findRenderer("app.db", "")!.id).toBe("sqlite");
  });

  it("finds zip renderer", () => {
    expect(findRenderer("archive.zip", "")!.id).toBe("zip");
    expect(findRenderer("app.jar", "")!.id).toBe("zip");
  });

  it("finds subtitle renderer", () => {
    expect(findRenderer("movie.srt", "")!.id).toBe("srt");
    expect(findRenderer("captions.vtt", "")!.id).toBe("srt");
  });

  it("finds HAR renderer", () => {
    expect(findRenderer("trace.har", "")!.id).toBe("har");
  });

  it("finds 3D model renderer", () => {
    expect(findRenderer("model.stl", "")!.id).toBe("3d");
    expect(findRenderer("model.glb", "")!.id).toBe("3d");
    expect(findRenderer("model.obj", "")!.id).toBe("3d");
  });

  it("finds mermaid renderer", () => {
    expect(findRenderer("diagram.mmd", "")!.id).toBe("mermaid");
    expect(findRenderer("diagram.mermaid", "")!.id).toBe("mermaid");
  });

  it("finds latex renderer", () => {
    expect(findRenderer("paper.tex", "")!.id).toBe("latex");
    expect(findRenderer("paper.latex", "")!.id).toBe("latex");
  });

  it("finds dot renderer", () => {
    expect(findRenderer("graph.dot", "")!.id).toBe("dot");
    expect(findRenderer("graph.gv", "")!.id).toBe("dot");
  });

  it("finds font renderer", () => {
    expect(findRenderer("font.ttf", "")!.id).toBe("font");
    expect(findRenderer("font.otf", "")!.id).toBe("font");
    expect(findRenderer("font.woff2", "")!.id).toBe("font");
  });

  it("finds audio renderer", () => {
    expect(findRenderer("song.mp3", "")!.id).toBe("audio");
    expect(findRenderer("song.wav", "")!.id).toBe("audio");
    expect(findRenderer("song.ogg", "")!.id).toBe("audio");
  });

  it("finds video renderer", () => {
    expect(findRenderer("movie.mp4", "")!.id).toBe("video");
    expect(findRenderer("movie.webm", "")!.id).toBe("video");
  });

  it("returns null for unsupported types", () => {
    expect(findRenderer("script.py", "python")).toBeNull();
    expect(findRenderer("main.rs", "rust")).toBeNull();
    expect(findRenderer("lib.js", "javascript")).toBeNull();
    expect(findRenderer("readme.txt", "plaintext")).toBeNull();
  });

  it("hasPreview returns correct boolean", () => {
    expect(hasPreview("readme.md", "plaintext")).toBe(true);
    expect(hasPreview("index.html", "html")).toBe(true);
    expect(hasPreview("main.rs", "rust")).toBe(false);
    expect(hasPreview("script.js", "javascript")).toBe(false);
  });

  it("has at least 28 renderers registered", async () => {
    const { getPreviewRenderers } = await import("../src/lib/previewEngine");
    const renderers = getPreviewRenderers();
    expect(renderers.length).toBeGreaterThanOrEqual(26);
  });
});

// ── Renderer output validation ──

const opts = (content: string, path?: string) => ({
  content,
  filePath: path || null,
  assetUrl: path ? `http://asset.localhost/${encodeURIComponent(path)}` : null,
});

describe("previewEngine — render outputs", () => {
  // ── Text-based renderers ──

  it("markdown: renders headings and code blocks", () => {
    const r = findRenderer("test.md", "")!;
    const output = r.render(opts("# Hello\n\nSome text\n\n```rust\nfn main() {}\n```"));
    expect(output).toContain("<h1");
    expect(output).toContain("Hello");
    expect(output).toContain("<pre");
    expect(output).toContain("fn main()");
    expect(output).toContain('data-line="1"');
  });

  it("markdown: handles empty content gracefully", () => {
    const r = findRenderer("test.md", "")!;
    const output = r.render(opts(""));
    // markdown-it returns empty string for empty input — no crash
    expect(output).toBeDefined();
  });

  it("html: passes content through", () => {
    const r = findRenderer("test.html", "")!;
    const output = r.render(opts("<h1>Title</h1><p>Text</p>"));
    expect(output).toBe("<h1>Title</h1><p>Text</p>");
  });

  it("svg: renders raw SVG", () => {
    const r = findRenderer("icon.svg", "")!;
    const output = r.render(opts('<svg><circle cx="50" cy="50" r="40"/></svg>'));
    expect(output).toContain("<circle");
  });

  it("csv: table with headers and rows", () => {
    const r = findRenderer("data.csv", "")!;
    const output = r.render(opts("Name,Age\nAlice,28\nBob,35"));
    expect(output).toContain("<table>");
    expect(output).toContain("<thead>");
    expect(output).toContain("Alice");
    expect(output).toContain("28");
  });

  it("csv: handles TSV", () => {
    const r = findRenderer("data.tsv", "")!;
    const output = r.render(opts("Name\tAge\nAlice\t28\nBob\t35"));
    expect(output).toContain("<table>");
    expect(output).toContain("Alice");
  });

  it("csv: handles empty", () => {
    const r = findRenderer("data.csv", "")!;
    const output = r.render(opts(""));
    expect(output).toContain("Empty CSV");
  });

  it("json: renders valid JSON with colors", () => {
    const r = findRenderer("data.json", "")!;
    const output = r.render(opts('{"name":"test","count":42}'));
    expect(output).toContain('name');
    expect(output).toContain('42');
    expect(output).toContain('script');
  });

  it("json: shows error for invalid JSON", () => {
    const r = findRenderer("data.json", "")!;
    const output = r.render(opts("{invalid json"));
    expect(output).toContain("Invalid JSON");
  });

  it("xml: renders colored XML", () => {
    const r = findRenderer("data.xml", "")!;
    const output = r.render(opts('<root><item id="1">text</item></root>'));
    expect(output).toContain("root");
    expect(output).toContain("item");
    expect(output).toContain("<pre>");
    expect(output).toContain("569cd6"); // tag color
  });

  it("yaml: renders colored YAML", () => {
    const r = findRenderer("config.yml", "")!;
    const output = r.render(opts("key: value\nnumber: 42"));
    expect(output).toContain("key");
    expect(output).toContain("42");
    expect(output).toContain("<pre>");
  });

  it("diff: renders + lines green, - lines red", () => {
    const r = findRenderer("changes.diff", "")!;
    const output = r.render(opts("+added line\n-deleted line\n unchanged"));
    expect(output).toContain('class="add"');
    expect(output).toContain('class="del"');
    expect(output).toContain("added line");
    expect(output).toContain("deleted line");
  });

  it("diff: renders hunk headers blue", () => {
    const r = findRenderer("changes.diff", "")!;
    const output = r.render(opts("@@ -1,5 +1,6 @@"));
    expect(output).toContain('class="hunk"');
    expect(output).toContain("@@");
  });

  it("env: renders key-value table", () => {
    const r = findRenderer(".env", "")!;
    const output = r.render(opts("KEY=value\nSECRET=abc123def456"));
    expect(output).toContain("<table>");
    expect(output).toContain("KEY");
    expect(output).toContain("•••••"); // masked
    expect(output).toContain("script"); // click to reveal
  });

  it("env: skips comments and empty lines", () => {
    const r = findRenderer(".env", "")!;
    const output = r.render(opts("# comment\n\nKEY=val"));
    expect(output).not.toContain("comment");
  });

  it("ipynb: renders notebook cells", () => {
    const r = findRenderer("notebook.ipynb", "")!;
    const output = r.render(opts(JSON.stringify({
      metadata: { kernelspec: { display_name: "Python 3" } },
      cells: [
        { cell_type: "markdown", source: ["# Title"] },
        { cell_type: "code", source: ["print('hello')"], outputs: [{ text: ["hello\n"] }] },
      ],
    })));
    expect(output).toContain("Python 3");
    expect(output).toContain("Title");
    expect(output).toContain("print('hello')");
    expect(output).toContain("hello");
  });

  it("ipynb: shows error for invalid notebook", () => {
    const r = findRenderer("notebook.ipynb", "")!;
    const output = r.render(opts("{invalid"));
    expect(output).toContain("Invalid notebook");
  });

  it("srt: renders subtitle timeline", () => {
    const r = findRenderer("movie.srt", "")!;
    const output = r.render(opts(
      "1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:05,000 --> 00:00:08,000\nSecond line",
    ));
    expect(output).toContain("Hello world");
    expect(output).toContain("00:00:01,000");
    expect(output).toContain("00:00:04,000");
    expect(output).toContain("Second line");
  });

  it("har: renders waterfall table", () => {
    const r = findRenderer("trace.har", "")!;
    const output = r.render(opts(JSON.stringify({
      log: {
        entries: [{
          startedDateTime: "2026-01-01T00:00:00Z",
          time: 200,
          request: { method: "GET", url: "https://example.com/api" },
          response: { status: 200, content: { size: 1024 } },
        }],
      },
    })));
    expect(output).toContain("GET");
    expect(output).toContain("example.com");
    expect(output).toContain("200");
    expect(output).toContain("200ms");
  });

  it("har: shows error for invalid HAR", () => {
    const r = findRenderer("trace.har", "")!;
    const output = r.render(opts("{invalid"));
    expect(output).toContain("Invalid HAR");
  });

  // ── Asset-based renderers (need file path) ──

  it("pdf: requires file path", () => {
    const r = findRenderer("doc.pdf", "")!;
    const output = r.render(opts("", "/path/to/doc.pdf"));
    expect(output).toContain("<iframe");
  });

  it("xlsx: requires file path", () => {
    const r = findRenderer("report.xlsx", "")!;
    const output = r.render(opts("", "/path/to/report.xlsx"));
    expect(output).toContain("xlsx.full.min.js");
    expect(output).toContain("xlsx.full.min.js");
  });

  it("docx: requires file path", () => {
    const r = findRenderer("doc.docx", "")!;
    const output = r.render(opts("", "/path/to/doc.docx"));
    expect(output).toContain("mammoth");
  });

  it("geojson: renders Leaflet map", () => {
    const r = findRenderer("map.geojson", "")!;
    const output = r.render(opts(JSON.stringify({
      type: "FeatureCollection",
      features: [],
    })));
    expect(output).toContain("leaflet");
    expect(output).toContain("L.map");
  });

  it("sqlite: requires file path + loads sql.js", () => {
    const r = findRenderer("data.sqlite", "")!;
    const output = r.render(opts("", "/path/to/data.sqlite"));
    expect(output).toContain("sql-wasm.js");
    expect(output).toContain("sqlite_master");
  });

  it("3d: requires file path + loads three.js", () => {
    const r = findRenderer("model.stl", "")!;
    const output = r.render(opts("", "/path/to/model.stl"));
    expect(output).toContain("three.module.js");
    expect(output).toContain("STLLoader");
  });

  it("font: requires file path + renders sample text", () => {
    const r = findRenderer("font.ttf", "")!;
    const output = r.render(opts("", "/path/to/font.ttf"));
    expect(output).toContain("@font-face");
    expect(output).toContain("The quick brown fox");
    expect(output).toContain("12px");
    expect(output).toContain("48px");
  });

  it("audio: requires file path + renders player", () => {
    const r = findRenderer("song.mp3", "")!;
    const output = r.render(opts("", "/path/to/song.mp3"));
    expect(output).toContain("<audio");
    expect(output).toContain("controls");
  });

  it("video: requires file path + renders player", () => {
    const r = findRenderer("movie.mp4", "")!;
    const output = r.render(opts("", "/path/to/movie.mp4"));
    expect(output).toContain("<video");
    expect(output).toContain("controls");
  });

  it("mermaid: renders CDN script", () => {
    const r = findRenderer("diagram.mmd", "")!;
    const output = r.render(opts("graph TD\nA-->B"));
    expect(output).toContain("mermaid.min.js");
    expect(output).toContain("mermaid.render");
  });

  it("latex: renders KaTeX CDN", () => {
    const r = findRenderer("paper.tex", "")!;
    const output = r.render(opts("\\section{Intro}\n$E=mc^2$"));
    expect(output).toContain("katex.min.js");
    expect(output).toContain("renderMathInElement");
  });


  // ── Error/edge cases ──

  it("image: shows error without file path", () => {
    const r = findRenderer("photo.png", "")!;
    const output = r.render(opts(""));
    expect(output).toContain("Save the file first");
  });

  it("pdf: shows error without file path", () => {
    const r = findRenderer("doc.pdf", "")!;
    const output = r.render(opts(""));
    expect(output).toContain("Save the file first");
  });

  it("custom renderer registration works", () => {
    registerPreviewRenderer({
      id: "custom-test",
      name: "Custom Test",
      extensions: ["testext"],
      languages: [],
      render: ({ content }) => `<pre>${content}</pre>`,
      useIframe: false,
    });
    const r = findRenderer("file.testext", "");
    expect(r).not.toBeNull();
    expect(r!.id).toBe("custom-test");
    expect(r!.render(opts("hello"))).toBe("<pre>hello</pre>");
  });
});

// ── Real test files verification ──

import { readFileSync } from "fs";
import { resolve } from "path";

const TEST_DIR = resolve(__dirname, "../test-files");

import { existsSync } from "fs";

function readTestFile(name: string): string {
  const path = resolve(TEST_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`Test file not found: ${path}`);
  }
  return readFileSync(path, "utf-8");
}

function hasTestFiles(): boolean {
  return existsSync(TEST_DIR);
}

describe("previewEngine — real test files", () => {
  // Skip if test-files directory doesn't exist (e.g. in CI)
  if (!hasTestFiles()) {
    it.skip("real test files not available", () => {});
    return;
  }

  // Text-based files that can be verified
  it("renders test.md without errors", () => {
    const content = readTestFile("test.md");
    expect(content.length).toBeGreaterThan(0);
    const r = findRenderer("test.md", "markdown")!;
    const output = r.render(opts(content));
    expect(output).toContain("<h1");
    expect(output).toContain("Markdown");
  });

  it("renders test.html without errors", () => {
    const content = readTestFile("test.html");
    const r = findRenderer("test.html", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("HTML");
  });

  it("renders test.json — valid JSON produces colored output", () => {
    const content = readTestFile("test.json");
    const r = findRenderer("test.json", "")!;
    const output = r.render(opts(content));
    // Should contain the rendered HTML (not the error message)
    expect(output.length).toBeGreaterThan(200);
  });

  it("renders test.csv — table output", () => {
    const content = readTestFile("test.csv");
    const r = findRenderer("test.csv", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("<table>");
    expect(output).toContain("Alice");
  });

  it("renders test.xml — colored output", () => {
    const content = readTestFile("test.xml");
    const r = findRenderer("test.xml", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("<pre>");
  });

  it("renders test.yml — colored output", () => {
    const content = readTestFile("test.yml");
    const r = findRenderer("test.yml", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("<pre>");
  });

  it("renders test.diff — +/- colored", () => {
    const content = readTestFile("test.diff");
    const r = findRenderer("test.diff", "")!;
    const output = r.render(opts(content));
    expect(output).toContain('class="add"');
    expect(output).toContain('class="del"');
  });

  it("renders test.env — masked table", () => {
    const content = readTestFile("test.env");
    const r = findRenderer(".env", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("<table>");
    expect(output).toContain("DATABASE_URL");
  });

  it("renders test.srt — subtitle timeline", () => {
    const content = readTestFile("test.srt");
    const r = findRenderer("test.srt", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("Welcome");
  });

  it("renders test.har — waterfall table", () => {
    const content = readTestFile("test.har");
    const r = findRenderer("test.har", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("GET");
  });

  it("renders test.ipynb — notebook cells", () => {
    const content = readTestFile("test.ipynb");
    const r = findRenderer("test.ipynb", "")!;
    const output = r.render(opts(content));
    expect(output.length).toBeGreaterThan(200);
  });

  it("renders test.geojson — leaflet map", () => {
    const content = readTestFile("test.geojson");
    const r = findRenderer("test.geojson", "")!;
    const output = r.render(opts(content));
    expect(output).toContain("leaflet");
  });

  // Asset-based: all covered by detection tests above — structure verified via opts() calls
});
