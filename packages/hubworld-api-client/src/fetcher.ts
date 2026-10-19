let baseUrl = "";

/** Points every generated request at the hubworld API, e.g. "http://localhost:3002". */
export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, "");
}

export function getBaseUrl() {
  return baseUrl;
}

// Orval's fetch client expects the mutator to resolve to { data, status, headers }.
export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${url}`, init);
  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  const data = body ? JSON.parse(body) : {};
  return { data, status: res.status, headers: res.headers } as T;
}
