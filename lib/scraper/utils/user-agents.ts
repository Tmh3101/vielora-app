/**
 * Modern User-Agent strings for anti-detection
 * Rotates between common browsers on different platforms
 */

/**
 * Chrome on Windows 10/11
 */
const CHROME_WINDOWS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

/**
 * Chrome on macOS
 */
const CHROME_MAC = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

/**
 * Chrome on Linux
 */
const CHROME_LINUX = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

/**
 * Firefox on various platforms
 */
const FIREFOX = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
];

/**
 * Safari on macOS
 */
const SAFARI_MAC = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
];

/**
 * Edge on Windows
 */
const EDGE_WINDOWS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
];

/**
 * All user agents combined
 */
export const USER_AGENTS = [
  ...CHROME_WINDOWS,
  ...CHROME_MAC,
  ...CHROME_LINUX,
  ...FIREFOX,
  ...SAFARI_MAC,
  ...EDGE_WINDOWS,
];

/**
 * Desktop-only user agents (higher success rate for complex sites)
 */
export const DESKTOP_USER_AGENTS = [...CHROME_WINDOWS, ...CHROME_MAC, ...FIREFOX, ...EDGE_WINDOWS];

/**
 * Get a random user agent from the list
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get a random desktop user agent
 */
export function getRandomDesktopUserAgent(): string {
  return DESKTOP_USER_AGENTS[Math.floor(Math.random() * DESKTOP_USER_AGENTS.length)];
}

/**
 * Get user agent by platform preference
 */
export function getUserAgentByPlatform(
  platform: "windows" | "mac" | "linux" | "random" = "random"
): string {
  switch (platform) {
    case "windows":
      return CHROME_WINDOWS[Math.floor(Math.random() * CHROME_WINDOWS.length)];
    case "mac": {
      const macAgents = [...CHROME_MAC, ...SAFARI_MAC];
      return macAgents[Math.floor(Math.random() * macAgents.length)];
    }
    case "linux":
      return CHROME_LINUX[Math.floor(Math.random() * CHROME_LINUX.length)];
    default:
      return getRandomUserAgent();
  }
}

/**
 * Common HTTP headers to accompany user agents
 */
export function getRealisticHeaders(userAgent: string): Record<string, string> {
  const isChrome = userAgent.includes("Chrome");
  const isFirefox = userAgent.includes("Firefox");
  // const isSafari = userAgent.includes('Safari') && !isChrome;

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };

  if (isChrome) {
    headers["sec-ch-ua"] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    headers["sec-ch-ua-mobile"] = "?0";
    headers["sec-ch-ua-platform"] = '"Windows"';
    headers["Sec-Fetch-Dest"] = "document";
    headers["Sec-Fetch-Mode"] = "navigate";
    headers["Sec-Fetch-Site"] = "none";
    headers["Sec-Fetch-User"] = "?1";
  }

  if (isFirefox) {
    headers["DNT"] = "1";
  }

  return headers;
}
