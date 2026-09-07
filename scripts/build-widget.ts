import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const SOURCE_FILE = path.resolve(__dirname, "../widget/widget.src.js");
const OUTPUT_FILE = path.resolve(__dirname, "../public/widget.js");

export interface BuildResult {
  originalSize: number;
  minifiedSize: number;
  savings: number;
}

export function buildWidget(): BuildResult {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source file not found: ${SOURCE_FILE}`);
  }

  const rawCode = fs.readFileSync(SOURCE_FILE, "utf8");
  const originalSize = Buffer.byteLength(rawCode, "utf8");

  const result = esbuild.transformSync(rawCode, {
    minify: true,
    target: "es2018",
    legalComments: "none",
    charset: "utf8",
  });

  // Write minified code directly to public/widget.js
  fs.writeFileSync(OUTPUT_FILE, result.code, "utf8");

  const minifiedSize = Buffer.byteLength(result.code, "utf8");
  const savings = ((originalSize - minifiedSize) / originalSize) * 100;

  console.log(`⚡ [Widget Build] Minified ${path.basename(SOURCE_FILE)} -> public/widget.js`);
  console.log(
    `📊 Size: ${(originalSize / 1024).toFixed(2)} KB -> ${(minifiedSize / 1024).toFixed(
      2
    )} KB (Saved ${savings.toFixed(1)}%)`
  );

  return { originalSize, minifiedSize, savings };
}

if (require.main === module) {
  try {
    buildWidget();
  } catch (err) {
    console.error("❌ [Widget Build Error]:", err);
    process.exit(1);
  }
}
