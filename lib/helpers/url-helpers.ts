/**
 * Format URL to ensure it has a protocol
 */
export function formatUrl(url: string): string {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }
  return formattedUrl;
}

/**
 * Normalize URL by removing trailing slashes, lowercasing hostname, and removing default ports
 */
export function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    url.pathname = url.pathname.replace(/\/+/g, "/");

    if (url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    if (url.search) {
      const params = new URLSearchParams(url.search);
      const sortedParams = new URLSearchParams(Array.from(params.entries()).sort());
      url.search = sortedParams.toString();
    }

    url.hash = "";

    return url.href;
  } catch {
    return urlString;
  }
}

export const normalizeSeedUrl = (value: string): string => normalizeUrl(formatUrl(value));

export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const canonicalizeActionKey = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    url.pathname = url.pathname.replace(/\/+/g, "/");
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    if (url.search) {
      const sortedParams = new URLSearchParams(
        Array.from(new URLSearchParams(url.search).entries()).sort(([a], [b]) => a.localeCompare(b))
      );
      const sorted = sortedParams.toString();
      url.search = sorted ? `?${sorted}` : "";
    }

    url.hash = "";
    return url.toString();
  } catch {
    return trimmed.replace(/\s+/g, " ").toLowerCase();
  }
};
