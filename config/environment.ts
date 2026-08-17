export function getRootDomain(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      return url.hostname.replace(/^www\./, "");
    } catch {
      // Fallback if invalid URL format
    }
  }
  return "vielora.vn";
}

export const PRODUCTION_ROOT = getRootDomain();
export const LOCAL_ROOT = "vielora.local";
