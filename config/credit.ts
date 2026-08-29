export const CREDIT_PER_PAGE = 5;
export const CREDIT_PER_MESSAGE = 1;

/**
 * Credits deducted per PDF report export generation.
 * Trade-off: Generating a report invokes an isolated headless Puppeteer browser instance,
 * performs template layout rendering with charts, and uploads the resulting PDF to private storage.
 * Setting this to 10 credits aligns with compute and storage cost (equivalent to indexing 2 pages).
 */
export const CREDIT_PER_REPORT = 10;
