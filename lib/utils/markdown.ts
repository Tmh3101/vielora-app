import fs from "fs";
import path from "path";

export async function getLegalContent(filename: string, locale: string = "vi") {
  const localizedPath = path.join(process.cwd(), "docs", "legal", `${filename}.${locale}.md`);
  if (fs.existsSync(localizedPath)) {
    return fs.readFileSync(localizedPath, "utf8");
  }

  const defaultViPath = path.join(process.cwd(), "docs", "legal", `${filename}.vi.md`);
  if (fs.existsSync(defaultViPath)) {
    return fs.readFileSync(defaultViPath, "utf8");
  }

  const fallbackPath = path.join(process.cwd(), "docs", "legal", `${filename}.md`);
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath, "utf8");
  }

  throw new Error(`Legal markdown document not found for ${filename} (locale: ${locale})`);
}
