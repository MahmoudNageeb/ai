import { registerTool } from './index';
import { logger } from '../utils/logger';

/**
 * Future-ready abstraction. If a search backend env var is configured we use it,
 * otherwise we return a structured "not configured" response so the agent can
 * gracefully fall back to its own knowledge.
 *
 * Supported backends (auto-selected if env vars present):
 *   - Tavily   : TAVILY_API_KEY
 *   - Serper   : SERPER_API_KEY
 *   - DuckDuckGo Instant Answer (no key, very limited)
 */

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function tavilySearch(query: string, key: string, max = 5): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query, max_results: max, search_depth: 'basic' }),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.results || []).map((r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.content || '',
  }));
}

async function serperSearch(query: string, key: string, max = 5): Promise<SearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: max }),
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.organic || []).slice(0, max).map((r: any) => ({
    title: r.title || '',
    url: r.link || '',
    snippet: r.snippet || '',
  }));
}

async function ddgInstantAnswer(query: string): Promise<SearchResult[]> {
  const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`);
  if (!res.ok) return [];
  const data: any = await res.json();
  const out: SearchResult[] = [];
  if (data.AbstractText) {
    out.push({
      title: data.Heading || query,
      url: data.AbstractURL || '',
      snippet: data.AbstractText,
    });
  }
  for (const t of (data.RelatedTopics || []).slice(0, 4)) {
    if (t.Text && t.FirstURL) out.push({ title: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text });
  }
  return out;
}

registerTool({
  name: 'web_search',
  description: 'Searches the web for up-to-date information. Returns a list of {title, url, snippet}. Configure TAVILY_API_KEY or SERPER_API_KEY for best results.',
  parameters: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'Search query.' },
      max_results: { type: 'number', description: 'Maximum results (default 5, max 10).' },
    },
  },
  execute: async (input: { query: string; max_results?: number }) => {
    if (!input?.query || typeof input.query !== 'string') {
      throw new Error('web_search requires "query"');
    }
    const max = Math.min(Math.max(input.max_results ?? 5, 1), 10);
    const tavily = process.env.TAVILY_API_KEY;
    const serper = process.env.SERPER_API_KEY;

    try {
      if (tavily) return { provider: 'tavily', query: input.query, results: await tavilySearch(input.query, tavily, max) };
      if (serper) return { provider: 'serper', query: input.query, results: await serperSearch(input.query, serper, max) };
      const ddg = await ddgInstantAnswer(input.query);
      if (ddg.length > 0) return { provider: 'duckduckgo', query: input.query, results: ddg.slice(0, max) };
      return {
        provider: 'none',
        query: input.query,
        results: [],
        note: 'No search backend configured (set TAVILY_API_KEY or SERPER_API_KEY). Falling back to LLM knowledge.',
      };
    } catch (e: any) {
      logger.warn(`[web_search] backend error: ${e.message}`);
      return { provider: 'error', query: input.query, results: [], note: e.message };
    }
  },
});
