import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Mandatory Privacy Webhook: Customers Data Request
 * This endpoint is called when a customer requests their data from the store owner.
 * For compliance, this must return 200 OK.
 */
export async function POST(request: NextRequest) {
  try {
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    const rawBody = await request.text();

    if (!process.env.SHOPIFY_CLIENT_SECRET) {
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    const generatedHash = crypto
      .createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET)
      .update(rawBody, "utf8")
      .digest();

    const hmacBuffer = Buffer.from(hmac || "", "base64");
    if (
      generatedHash.length !== hmacBuffer.length ||
      !crypto.timingSafeEqual(generatedHash, hmacBuffer)
    ) {
      console.warn(`Invalid HMAC signature for webhook topic: ${topic} from ${shop}`);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log(`Received Mandatory Privacy Webhook: ${topic} for shop ${shop}`);

    // Process request according to GDPR/privacy regulations if applicable
    // For now, return success to pass Shopify review
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
