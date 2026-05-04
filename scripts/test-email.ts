import { sendWelcomeEmail } from "@/lib/services/email.service";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testEmail() {
  console.log("=== Testing Resend Email Setup ===");
  console.log(
    "RESEND_API_KEY:",
    process.env.RESEND_API_KEY
      ? "Loaded (starts with " + process.env.RESEND_API_KEY.slice(0, 5) + "...)"
      : "Not configured"
  );
  console.log(
    "RESEND_FROM_EMAIL:",
    process.env.RESEND_FROM_EMAIL ?? "Not configured (will use fallback)"
  );

  // Use a fallback or the email configured in RESEND_FROM_EMAIL to send to self
  // Extract email address from string format "Name <email@domain.com>"
  let testToEmail = "nguyentruongson2402@gmail.com"; // Let's try sending to a default test email if none provided

  if (process.env.RESEND_FROM_EMAIL) {
    const match = process.env.RESEND_FROM_EMAIL.match(/<([^>]+)>/);
    if (match && match[1]) {
      // By default test sending to the sender address (only works if no domain restriction, but the user is using their personal resend account so it should work)
      testToEmail = match[1];
    } else {
      testToEmail = process.env.RESEND_FROM_EMAIL;
    }
  }

  // Allow passing test email via command line arguments
  if (process.argv[2]) {
    testToEmail = process.argv[2];
  }

  console.log(`\nSending test welcome email to: ${testToEmail}...`);

  try {
    const success = await sendWelcomeEmail(testToEmail, "Test User");
    if (success) {
      console.log("✅ Email sent successfully! Check your inbox.");
    } else {
      console.log("❌ Failed to send email. Check error logs above.");
    }
  } catch (error) {
    console.error("❌ Exception during send:", error);
  }
}

testEmail();
