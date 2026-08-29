import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function main() {
  const exportId = process.argv[2] || "poc-fixture";
  const outputPath = process.argv[3] || "poc-output.pdf";
  const baseUrl = process.env.INTERNAL_BASE_URL || "http://localhost:3000";
  const targetUrl = `${baseUrl}/internal/reports/render/${exportId}`;

  console.log(`[PoC Render] Target URL: ${targetUrl}`);
  console.log(`[PoC Render] Output PDF: ${path.resolve(outputPath)}`);

  console.log("[PoC Render] Launching dedicated Puppeteer instance...");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set A4 viewport ratio
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    console.log("[PoC Render] Navigating to render page...");
    await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    console.log("[PoC Render] Waiting for #report-ready marker (all charts mounted)...");
    await page.waitForFunction(() => document.getElementById("report-ready") !== null, {
      timeout: 30000,
    });

    console.log("[PoC Render] Generating PDF (A4, printBackground=true)...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    const stats = fs.statSync(outputPath);
    console.log(
      `[PoC Render] Successfully generated PDF: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`
    );
  } catch (error) {
    console.error("[PoC Render] Error during report PDF generation:", error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log("[PoC Render] Browser closed.");
  }
}

main().catch((err) => {
  console.error("[PoC Render] Fatal error:", err);
  process.exit(1);
});
