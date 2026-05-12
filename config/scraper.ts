import type { JobsOptions } from "bullmq";

export const SCRAPE_DEFAULT_TIMEOUT = 30000;

export const RATE_LIMITER_CONFIG = {
  max: 5,
  duration: 2000,
};

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 86400,
    count: 500,
  },
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
};

export const MAX_PAGES = 500;
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

export const LOAD_MORE_KEYWORDS = [
  "xem thêm",
  "load more",
  "show more",
  "xem tiếp",
  "tải thêm",
  "view more",
];

/**
 * File extensions to exclude (non-HTML resources)
 */
export const EXCLUDED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".wav",
  ".ogg",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".xml",
  ".json",
  ".rss",
  ".atom",
];

/**
 * URL patterns to always exclude (auth, actions, etc.)
 */
export const EXCLUDED_PATTERNS = [
  "/login",
  "/logout",
  "/signin",
  "/signout",
  "/signup",
  "/register",
  "/cart",
  "/checkout",
  "/admin",
  "/wp-admin",
  "/account",
  "/my-account",
  "/password",
  "/reset",
  "/unsubscribe",
  "/delete",
  "/api/",
  "/feed",
  "/rss",
  "?action=",
  "?logout",
  "javascript:",
  "mailto:",
  "tel:",
  "data:",
];

export const PAAS_SUFFIXES = [
  "vercel.app",
  "onrender.com",
  "up.railway.app",
  "herokuapp.com",
  "netlify.app",
  "github.io",
  "webflow.io",
  "pages.dev",
  "firebaseapp.com",
];

export const KNOWN_SLDS = ["co", "com", "org", "net", "gov", "edu", "ac", "vn", "com.vn", "edu.vn"];

export const MAX_PAGES_PER_BROWSER = 100;
export const CLOSE_TIMEOUT_MS = 5000;
