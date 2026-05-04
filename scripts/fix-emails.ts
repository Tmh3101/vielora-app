import * as fs from "fs";
import * as path from "path";

const dir = path.resolve(process.cwd(), "docs/email-templates");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

const fontStack = `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";`;

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, "utf8");

  // Fix image URL to use a public vercel URL so it loads in gmail
  content = content.replace(
    /\{\{ \.SiteURL \}\}\/images\/logo-full\.png/g,
    "https://dev-velora.vercel.app/images/logo-full.png"
  );
  content = content.replace(
    /\{\{ \.SiteURL \}\}\/logo-full\.png/g,
    "https://dev-velora.vercel.app/images/logo-full.png"
  );

  // Downgrade 800 to 700 to avoid bold rendering issues on Windows/Fallback fonts
  content = content.replace(/font-weight: 800;/g, "font-weight: 700;");

  // Inject font stack directly into key elements (H1, p, span, a, td) to avoid client stripping
  content = content.replace(/<h1 style="/g, `<h1 style="${fontStack} `);
  content = content.replace(/<p style="/g, `<p style="${fontStack} `);
  content = content.replace(/<span style="/g, `<span style="${fontStack} `);

  fs.writeFileSync(p, content, "utf8");
}

console.log("Fixed HTML templates in docs/email-templates");
