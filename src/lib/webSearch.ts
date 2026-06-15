/**
 * Lightweight web search using DuckDuckGo (free, no API key).
 * Returns search result snippets to inject into AI context.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    // DuckDuckGo HTML (no API key needed)
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();

    // Parse search result snippets from HTML
    const results: SearchResult[] = [];
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let linkMatch;
    const links: { title: string; url: string }[] = [];
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      links.push({ url: linkMatch[1], title: linkMatch[2].replace(/<[^>]*>/g, "").trim() });
    }

    let idx = 0;
    while ((linkMatch = snippetRegex.exec(html)) !== null && idx < links.length) {
      results.push({
        ...links[idx],
        snippet: linkMatch[1].replace(/<[^>]*>/g, "").trim(),
      });
      idx++;
    }

    return results.slice(0, 5);
  } catch {
    return [];
  }
}
