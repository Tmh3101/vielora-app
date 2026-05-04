import * as fs from "fs";
import * as path from "path";

const dir = path.resolve(process.cwd(), "docs/email-templates");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

const LOGO_HTML = `
                                <tr>
                                    <td align="center" style="padding-bottom: 24px">
                                        <img src="https://dev-velora.vercel.app/images/logo-full.png" alt="Vielora" width="180"
                                            style="display: block; font-family: sans-serif; font-size: 20px; color: #3c83f6; font-weight: bold;" />
                                    </td>
                                </tr>`;

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, "utf8");

  // Skip if already contains the logo
  if (!content.includes("logo-full.png")) {
    // Inject the new logo row right above the row containing the badge span
    content = content.replace(
      /(\s*<tr>\s*<td[^>]*>\s*<span[^>]*>(?:[^<]+|.+?)<\/span>\s*<\/td>\s*<\/tr>)/,
      LOGO_HTML + "$1"
    );
    fs.writeFileSync(p, content, "utf8");
    console.log(`Injected logo into: ${file}`);
  }
}
