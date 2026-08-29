import crypto from "crypto";

const SECRET = () => {
  const s = process.env.REPORT_TOKEN_SECRET;
  if (!s) throw new Error("REPORT_TOKEN_SECRET is not set");
  return s;
};

// Internal render token (5 min, for worker → render route)
export function signInternalRenderToken(exportId: string): string {
  const exp = Date.now() + 5 * 60 * 1000; // 5 minutes
  const payload = `${exportId}:${exp}`;
  const sig = crypto.createHmac("sha256", SECRET()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyInternalRenderToken(token: string, exportId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;
    const [id, expStr, sig] = parts;
    if (id !== exportId) return false;
    if (Date.now() > Number(expStr)) return false; // expired
    const expected = crypto.createHmac("sha256", SECRET()).update(`${id}:${expStr}`).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    // Return false on any decoding or verification failure
    return false;
  }
}

// Signed download link token (7 days)
export function signDownloadToken(exportId: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${exportId}:${exp}`;
  const sig = crypto.createHmac("sha256", SECRET()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyDownloadToken(token: string): { exportId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [exportId, expStr, sig] = parts;
    if (Date.now() > Number(expStr)) return null;
    const expected = crypto
      .createHmac("sha256", SECRET())
      .update(`${exportId}:${expStr}`)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return { exportId };
  } catch {
    // Return null on any decoding or verification failure
    return null;
  }
}
