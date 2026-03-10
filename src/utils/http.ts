const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
} as const;

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }

  return response.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`JSON request failed: ${response.status} ${url}`);
  }

  return (await response.json()) as T;
}
