import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/constants";
import {
  getBotByOwner,
  updateBotVerificationToken,
  markBotVerified,
} from "@/lib/services/bot.service";

const BRAND = "vielora";
const LEGACY_BRAND = "chatbotai";
const DNS_PREFIXES = [`_${BRAND}`, `_${LEGACY_BRAND}`];
const META_NAMES = [`${BRAND}-verification`, `${LEGACY_BRAND}-verification`];
const FILE_NAMES = [`${BRAND}-verification.txt`, `${LEGACY_BRAND}-verification.txt`];
const USER_AGENT = "Vielora-Verifier/1.0";

interface VerifyRequest {
  botId: string;
  action: "generate" | "verify";
  method?: "dns" | "meta" | "file";
}

// DNS lookup using Google DNS-over-HTTPS
async function lookupDnsTxt(domain: string): Promise<string[]> {
  try {
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, "");

    const allRecords: string[] = [];

    for (const prefix of DNS_PREFIXES) {
      const recordName = `${prefix}.${cleanDomain}`;
      console.log(`Looking up TXT records for: ${recordName}`);

      const response = await fetch(`https://dns.google/resolve?name=${recordName}&type=TXT`, {
        headers: { Accept: "application/dns-json" },
      });

      if (!response.ok) {
        console.log(`DNS lookup failed for ${recordName}:`, response.status);
        continue;
      }

      const data = await response.json();
      console.log("DNS response:", JSON.stringify(data));

      if (!data.Answer) {
        console.log(`No TXT records found for ${recordName}`);
        continue;
      }

      const txtRecords = data.Answer.filter((record: { type: number }) => record.type === 16).map(
        (record: { data: string }) => record.data.replace(/"/g, "")
      );

      allRecords.push(...txtRecords);
    }

    const uniqueRecords = Array.from(new Set(allRecords));
    console.log("Found TXT records:", uniqueRecords);
    return uniqueRecords;
  } catch (error) {
    console.error("DNS lookup error:", error);
    return [];
  }
}

// Check for meta tag verification
async function checkMetaTag(domain: string, token: string): Promise<boolean> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const url = `https://${cleanDomain}`;

    console.log(`Checking meta tag at: ${url}`);

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      console.log("Failed to fetch website:", response.status);
      return false;
    }

    const html = await response.text();

    const metaRegex = new RegExp(
      `<meta\\s+name=["'](${META_NAMES.join("|")})["']\\s+content=["']([^"']+)["']`,
      "i"
    );
    const match = html.match(metaRegex);

    if (match && match[2]) {
      console.log("Found meta tag with content:", match[2]);
      return match[2].includes(token);
    }

    const metaRegex2 = new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+name=["'](${META_NAMES.join("|")})["']`,
      "i"
    );
    const match2 = html.match(metaRegex2);

    if (match2 && match2[1]) {
      console.log("Found meta tag (alt order) with content:", match2[1]);
      return match2[1].includes(token);
    }

    console.log(`No ${META_NAMES.join(" or ")} meta tag found`);
    return false;
  } catch (error) {
    console.error("Meta tag check error:", error);
    return false;
  }
}

// Check for file verification
async function checkVerificationFile(domain: string, token: string): Promise<boolean> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    for (const fileName of FILE_NAMES) {
      const fileUrl = `https://${cleanDomain}/${fileName}`;

      console.log(`Checking verification file at: ${fileUrl}`);

      const response = await fetch(fileUrl, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (!response.ok) {
        console.log(`Verification file not found (${fileName}):`, response.status);
        continue;
      }

      const content = await response.text();
      console.log("File content:", content.substring(0, 100));

      if (content.trim().includes(token)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("File verification error:", error);
    return false;
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = user.id;
    const { botId, action, method }: VerifyRequest = await req.json();

    if (!botId || !action) {
      return NextResponse.json(
        { success: false, error: "botId and action are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get bot and verify ownership
    const bot = await getBotByOwner(supabase, botId, userId);

    if (!bot) {
      console.error("Bot not found or access denied");
      return NextResponse.json(
        { success: false, error: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (action === "generate") {
      // Generate a new verification token
      let verificationToken = bot.verification_token;

      if (!verificationToken) {
        // Generate a random token
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        const hexString = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        verificationToken = `${BRAND}-verify-${hexString}`;

        // Save token to database
        try {
          await updateBotVerificationToken(supabase, botId, verificationToken);
        } catch (updateErr) {
          console.error("Error saving verification token:", updateErr);
          throw new Error("Failed to generate verification token");
        }
      }

      const cleanDomain = bot.domain
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/^www\./, "");

      return NextResponse.json(
        {
          success: true,
          data: {
            domain: bot.domain,
            verificationToken,
            dnsRecord: {
              type: "TXT",
              name: `_${BRAND}.${cleanDomain}`,
              value: verificationToken,
            },
            metaTag: `<meta name="${BRAND}-verification" content="${verificationToken}">`,
            fileName: `${BRAND}-verification.txt`,
            fileContent: verificationToken,
          },
        },
        { headers: corsHeaders }
      );
    }

    if (action === "verify") {
      if (!bot.verification_token) {
        return NextResponse.json(
          { success: false, error: "No verification token generated" },
          { status: 400, headers: corsHeaders }
        );
      }

      let isVerified = false;
      let methodUsed: "dns" | "meta" | "file" = (method || "dns") as "dns" | "meta" | "file";

      if (methodUsed === "dns") {
        const txtRecords = await lookupDnsTxt(bot.domain);
        isVerified = txtRecords.some((record) => record.includes(bot.verification_token!));
      } else if (methodUsed === "meta") {
        isVerified = await checkMetaTag(bot.domain, bot.verification_token);
      } else if (methodUsed === "file") {
        isVerified = await checkVerificationFile(bot.domain, bot.verification_token);
      } else {
        const txtRecords = await lookupDnsTxt(bot.domain);
        if (txtRecords.some((record) => record.includes(bot.verification_token!))) {
          isVerified = true;
          methodUsed = "dns";
        } else if (await checkMetaTag(bot.domain, bot.verification_token)) {
          isVerified = true;
          methodUsed = "meta";
        } else if (await checkVerificationFile(bot.domain, bot.verification_token)) {
          isVerified = true;
          methodUsed = "file";
        }
      }

      if (isVerified) {
        // Update bot as verified
        try {
          await markBotVerified(supabase, botId);
        } catch (updateErr) {
          console.error("Error updating verification status:", updateErr);
          throw new Error("Failed to update verification status");
        }

        console.log(`Domain ${bot.domain} verified successfully`);

        return NextResponse.json(
          {
            success: true,
            data: {
              verified: true,
              verifiedAt: new Date().toISOString(),
              method: methodUsed,
            },
          },
          { headers: corsHeaders }
        );
      }

      const messages: Record<string, string> = {
        dns: "DNS TXT record chưa được tìm thấy. Vui lòng thêm record _vielora (hoặc _chatbotai) và đợi DNS propagate (có thể mất đến 48 giờ).",
        meta: "Không tìm thấy meta tag trên trang chủ. Hãy chắc chắn đã thêm thẻ vielora-verification (hoặc chatbotai-verification) vào phần <head> và refresh cache.",
        file: "Không tìm thấy file xác thực. Hãy chắc chắn đã upload file vielora-verification.txt (hoặc chatbotai-verification.txt) lên thư mục gốc website.",
      };

      return NextResponse.json(
        {
          success: true,
          data: {
            verified: false,
            message: messages[methodUsed] || "Không thể xác thực domain. Vui lòng kiểm tra lại.",
          },
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in verify-domain:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
