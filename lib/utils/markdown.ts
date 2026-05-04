import fs from "fs";
import path from "path";

export async function getLegalContent(filename: string) {
  const filePath = path.join(process.cwd(), "docs", "legal", `${filename}.md`);
  const fileContents = fs.readFileSync(filePath, "utf8");
  return fileContents;
}
