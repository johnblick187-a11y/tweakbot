export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function webSearch(query: string, numResults = 5): Promise<SearchResult[] | { error: string }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    return { error: "Web search is not available: BRAVE_SEARCH_API_KEY is not configured." };
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(numResults));

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`Brave Search failed: ${resp.status}`);

  const data = await resp.json() as any;
  return (data.web?.results ?? []).slice(0, numResults).map((r: any) => ({
    title: r.title ?? "",
    snippet: r.description ?? "",
    url: r.url ?? "",
  })).filter((r: any) => r.url);
}
