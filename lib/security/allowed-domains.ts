export const MAX_ALLOWED_DOMAINS = 5;

export interface AllowedDomainsValidationResult {
  valid: boolean;
  domains: string[];
  error?: string;
}

function parseHostname(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.includes("*")) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname;
  } catch {
    return null;
  }
}

export function normalizeAllowedDomain(value: string): string | null {
  const hostname = parseHostname(value);
  if (!hostname) return null;

  const normalized = hostname.replace(/^www\./, "").replace(/\.$/, "");
  if (!normalized || normalized === "localhost") return normalized || null;
  if (!normalized.includes(".")) return null;

  return normalized;
}

export function validateAllowedDomains(input: unknown): AllowedDomainsValidationResult {
  if (!Array.isArray(input)) {
    return { valid: false, domains: [], error: "Allowed domains must be an array." };
  }

  if (input.length > MAX_ALLOWED_DOMAINS) {
    return {
      valid: false,
      domains: [],
      error: `Tối đa ${MAX_ALLOWED_DOMAINS} domain được phép.`,
    };
  }

  const domains: string[] = [];
  const seen = new Set<string>();

  for (const item of input) {
    if (typeof item !== "string") {
      return { valid: false, domains: [], error: "Domain không hợp lệ." };
    }

    const normalized = normalizeAllowedDomain(item);
    if (!normalized) {
      return { valid: false, domains: [], error: `"${item}" không phải domain hợp lệ.` };
    }

    if (seen.has(normalized)) {
      return { valid: false, domains: [], error: `"${normalized}" bị trùng.` };
    }

    seen.add(normalized);
    domains.push(normalized);
  }

  return { valid: true, domains };
}

function originMatchesDomain(origin: string, domain: string): boolean {
  const normalizedOrigin = normalizeAllowedDomain(origin);
  const normalizedDomain = normalizeAllowedDomain(domain);

  return Boolean(normalizedOrigin && normalizedDomain && normalizedOrigin === normalizedDomain);
}

function originMatchesDomainOrSubdomain(origin: string, domain: string): boolean {
  const normalizedOrigin = normalizeAllowedDomain(origin);
  const normalizedDomain = normalizeAllowedDomain(domain);

  return Boolean(
    normalizedOrigin &&
    normalizedDomain &&
    (normalizedOrigin === normalizedDomain || normalizedOrigin.endsWith(`.${normalizedDomain}`))
  );
}

export function getEffectiveAllowedDomains(
  allowedDomains: string[] | null | undefined,
  fallbackDomain: string
): string[] {
  const normalizedAllowed = validateAllowedDomains(allowedDomains ?? []);
  if (normalizedAllowed.valid && normalizedAllowed.domains.length > 0) {
    return normalizedAllowed.domains;
  }

  const fallback = normalizeAllowedDomain(fallbackDomain);
  return fallback ? [fallback] : [];
}

export function isOriginAllowedForWidget(params: {
  origin: string | null;
  allowedDomains: string[] | null | undefined;
  fallbackDomain: string;
  appUrl?: string;
}): boolean {
  const { origin, allowedDomains, fallbackDomain, appUrl } = params;
  if (!origin) return false;

  if (appUrl && originMatchesDomain(origin, appUrl)) {
    return true;
  }

  const hasAllowedDomains = Array.isArray(allowedDomains) && allowedDomains.length > 0;
  if (!hasAllowedDomains) {
    return originMatchesDomainOrSubdomain(origin, fallbackDomain);
  }

  return getEffectiveAllowedDomains(allowedDomains, fallbackDomain).some((domain) =>
    originMatchesDomain(origin, domain)
  );
}
