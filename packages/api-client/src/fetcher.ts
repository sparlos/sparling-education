let baseUrl = "";
let send: typeof fetch = (input, init) => fetch(input, init);

/** Points every generated request at the platform's API, e.g. "http://localhost:3002". */
export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, "");
}

export function getBaseUrl() {
  return baseUrl;
}

/** Sends every generated request through `fetch`, e.g. the in-process API in tests. */
export function setFetch(fetch: typeof globalThis.fetch) {
  send = fetch;
}

// Orval's fetch client expects the mutator to resolve to { data, status, headers }.
export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await send(`${baseUrl}${url}`, init);
  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  return { data: parse(body), status: res.status, headers: res.headers } as T;
}

// A failure answered by something other than the API (a proxy's error page,
// say) isn't JSON; its status still has to reach the caller.
function parse(body: string | null) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}
