import { normalizeAllowedDomain } from "./allowed-domains";

/**
 * Validate a navigation target URL against the bot's allowed domains.
 *
 * Checks that the target hostname matches the bot's `allowed_domains` list
 * (from widget_settings). Subdomain matching is supported: a URL on
 * `sub.example.com` is valid when `example.com` is in `allowed_domains`.
 * Returns `{ ok: true }` if valid, `{ ok: false; reason: string }` if invalid.
 *
 * Called from the chat route after the intent matcher finds a match.
 */
export function validateNavigationTarget(
  url: string,
  bot: { domain: string; allowed_domains: string[] }
): { ok: true } | { ok: false; reason: string } {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return { ok: false, reason: "Navigation target URL is empty." };
  }

  const targetHostname = normalizeAllowedDomain(url);
  if (!targetHostname) {
    return { ok: false, reason: "Navigation target URL is not valid." };
  }

  // Build the effective allowed list: prefer explicit allowed_domains, fall
  // back to bot.domain when the list is empty.
  const rawList =
    Array.isArray(bot.allowed_domains) && bot.allowed_domains.length > 0
      ? bot.allowed_domains
      : [bot.domain];

  const normalizedList = rawList
    .map((d) => normalizeAllowedDomain(d))
    .filter((d): d is string => d !== null);

  // Allow exact match OR subdomain match (e.g. sub.example.com ✓ example.com)
  const isAllowed = normalizedList.some(
    (domain) => targetHostname === domain || targetHostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return {
      ok: false,
      reason: "Navigation target is not permitted for this widget.",
    };
  }

  return { ok: true };
}
