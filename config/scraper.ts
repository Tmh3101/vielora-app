export const SCRAPE_DEFAULT_TIMEOUT = 30000;

export const MAX_PAGES = 100;
export const MAX_DEPTH = 2;

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; VieloraCrawler/2.0; +https://vielora.app)";

/**
 * Resource types to block for performance
 * NOTE: Stylesheets are NOT blocked as some SPAs need CSS to render
 */
export const BLOCKED_RESOURCE_TYPES = [
  "image",
  "media",
  "font",
  // 'stylesheet', // Don't block CSS - some SPAs need it to render
];

/**
 * URL patterns to block (ads, trackers, etc.)
 */
export const BLOCKED_URL_PATTERNS = [
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "doubleclick.net",
  "analytics",
  "tracking",
  "ads",
];

// Build browser args for Puppeteer (used by extractDynamic)
// NOTE: GPU/WebGL flags are intentionally omitted here.
//
// "--enable-webgl" is deprecated in favor of the more fine-grained controls below.
// The flags below force Chromium to use a software (CPU) renderer (SwiftShader via ANGLE)
// which is critical for WebGL-dependent sites to work inside Docker where no GPU is present.
// This is required for SPAs using libraries like Mapbox GL JS.
export const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-web-security",
  "--disable-features=IsolateOrigins,site-per-process",
  "--no-first-run",
  "--disable-extensions",
  "--disable-blink-features=AutomationControlled", // Hide automation detection
  "--ignore-gpu-blocklist",
  "--use-gl=angle",
  "--use-angle=swiftshader",
];

/**
 * Detect soft-404: pages that return HTTP 200 but whose content signals
 * a "not found" / error state (title-based + thin-content checks).
 */
export const SOFT_404_TITLE_PATTERNS = [
  "404",
  "not found",
  "page not found",
  "error page",
  "không tìm thấy",
  "trang không tồn tại",
  "không tồn tại",
];
