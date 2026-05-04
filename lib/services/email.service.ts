import { Resend } from "resend";

// ============================================================
// Resend client (lazy-init singleton)
// ============================================================

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = () => {
  const fromEnv = process.env.RESEND_FROM_EMAIL;
  if (!fromEnv) return "Vielora <noreply@vielora.vn>";
  return fromEnv.replace(/^["'](.+)["']$/, "$1");
};
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://dev-velora.vercel.app";

// ============================================================
// Generic send helper — email failures NEVER block business logic
// ============================================================

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[EmailService] RESEND_API_KEY not configured — skipping email");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM(),
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[EmailService] Failed to send email:", { to, subject, error });
      return false;
    }

    console.log(`[EmailService] ✓ Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error("[EmailService] Unexpected error:", err instanceof Error ? err.message : err);
    return false;
  }
}

// ============================================================
// Shared template parts
// ============================================================

function emailLayout(badge: string, heading: string, body: string) {
  const appUrl = APP_URL();
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading} - Vielora</title>
    <style>
      body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      img { border: 0; outline: none; text-decoration: none; }
      a { text-decoration: none; }
      .cta-button:hover { background-color: #2563eb !important; border-color: #2563eb !important; }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f0f9ff">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f9ff">
      <tr>
        <td align="center" style="padding: 40px 15px">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);">
            <tr>
              <td style="padding: 48px 40px">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="padding-bottom: 24px">
                      <img src="${appUrl + "/images/logo-full.png"}" alt="Vielora" width="180" style="display: block; font-family: sans-serif; font-size: 20px; color: #3c83f6; font-weight: bold;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #eff6ff; color: #3c83f6; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 100px; display: inline-block; border: 1px solid #dbeafe;">${badge}</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 16px">
                      <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; font-size: 28px; line-height: 36px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">${heading}</h1>
                    </td>
                  </tr>
                  ${body}
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" style="padding-top: 24px">
                <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0 0 8px 0; font-size: 12px; color: #94a3b8">© 2026 Vielora Platform. All rights reserved.</p>
                <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; font-size: 12px; color: #94a3b8">
                  <a href="${appUrl}" style="color: #94a3b8; text-decoration: underline;">vielora.vn</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(text: string, href: string) {
  return `<tr>
  <td align="center" style="padding-bottom: 32px">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" bgcolor="#3C83F6" style="border-radius: 12px">
          <a href="${href}" class="cta-button" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #3c83f6; border: 1px solid #3c83f6; box-shadow: 0 4px 10px -2px rgba(60,131,246,0.4);">${text}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function paragraph(text: string) {
  return `<tr>
  <td align="center" style="padding-bottom: 24px">
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; font-size: 16px; line-height: 26px; color: #64748b; max-width: 90%;">${text}</p>
  </td>
</tr>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #64748b; width: 40%;">${label}</td>
        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${value}</td>
      </tr>
    </table>
  </td>
</tr>`;
}

function infoTable(rows: string) {
  return `<tr>
  <td style="padding-bottom: 32px">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 16px;">
      <tr><td style="padding: 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          ${rows}
        </table>
      </td></tr>
    </table>
  </td>
</tr>`;
}

// ============================================================
// UC1 — Welcome email
// ============================================================

export async function sendWelcomeEmail(to: string, fullName: string): Promise<boolean> {
  const appUrl = APP_URL();
  const body =
    paragraph(
      `Chào mừng <strong>${fullName}</strong> đã gia nhập <strong>Vielora</strong>! Tài khoản của bạn đã được kích hoạt thành công.`
    ) +
    infoTable(
      infoRow("Gói hiện tại", "Free") +
        infoRow("Chatbot tối đa", "1") +
        infoRow("Credits/tháng", "100")
    ) +
    paragraph("Bắt đầu tạo chatbot AI đầu tiên cho website của bạn ngay hôm nay!") +
    ctaButton("Bắt đầu tạo chatbot →", `${appUrl}/dashboard`);

  const html = emailLayout("🎉 Chào mừng bạn", "Chào mừng đến với Vielora!", body);
  return sendEmail(to, "Chào mừng bạn đến với Vielora! 🎉", html);
}

// ============================================================
// UC2 — Payment confirmation email
// ============================================================

export interface PaymentEmailData {
  planName: string;
  billingCycle: string;
  amount: number;
  currency: string;
  txnId: string;
  botsLimit: number;
  monthlyCredits: number;
  periodStart: string;
  periodEnd: string;
}

export async function sendPaymentConfirmationEmail(
  to: string,
  fullName: string,
  data: PaymentEmailData
): Promise<boolean> {
  const appUrl = APP_URL();
  const cycleLabel = data.billingCycle === "yearly" ? "Hàng năm" : "Hàng tháng";
  const formattedAmount =
    data.currency === "VND"
      ? new Intl.NumberFormat("vi-VN").format(data.amount) + " ₫"
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.amount);

  const body =
    paragraph(
      `Xin chào <strong>${fullName}</strong>, thanh toán của bạn đã được xử lý thành công!`
    ) +
    infoTable(
      infoRow("Gói", `${data.planName} (${cycleLabel})`) +
        infoRow("Số tiền", formattedAmount) +
        infoRow("Mã giao dịch", data.txnId) +
        infoRow("Bot tối đa", `${data.botsLimit}`) +
        infoRow("Credits/tháng", `${new Intl.NumberFormat("vi-VN").format(data.monthlyCredits)}`) +
        infoRow("Chu kỳ", `${data.periodStart} → ${data.periodEnd}`)
    ) +
    ctaButton("Truy cập Dashboard →", `${appUrl}/dashboard`);

  const html = emailLayout(
    "✅ Thanh toán thành công",
    `Gói ${data.planName} đã được kích hoạt`,
    body
  );
  return sendEmail(to, `✅ Thanh toán thành công — Gói ${data.planName} đã được kích hoạt`, html);
}

// ============================================================
// UC3 — Subscription downgrade email
// ============================================================

export interface DowngradeEmailData {
  oldPlanName: string;
  expiryDate: string;
}

export async function sendSubscriptionDowngradeEmail(
  to: string,
  fullName: string,
  data: DowngradeEmailData
): Promise<boolean> {
  const appUrl = APP_URL();
  const body =
    paragraph(
      `Xin chào <strong>${fullName}</strong>, gói <strong>${data.oldPlanName}</strong> của bạn đã hết hạn vào <strong>${data.expiryDate}</strong> và tài khoản đã được chuyển về gói Free.`
    ) +
    infoTable(
      infoRow("Gói cũ", data.oldPlanName) +
        infoRow("Gói hiện tại", "Free") +
        infoRow("Credits mới", "100/tháng") +
        infoRow("Chatbot tối đa", "1")
    ) +
    paragraph(
      "⚠️ Tất cả các bot đang hoạt động đã bị tạm dừng. Vui lòng truy cập Dashboard để chọn bot muốn tiếp tục sử dụng hoặc gia hạn gói."
    ) +
    ctaButton("Gia hạn ngay →", `${appUrl}/dashboard/upgrade`);

  const html = emailLayout("⚠️ Subscription hết hạn", `Gói ${data.oldPlanName} đã hết hạn`, body);
  return sendEmail(to, `⚠️ Gói ${data.oldPlanName} đã hết hạn — Tài khoản đã chuyển về Free`, html);
}

// ============================================================
// UC4 — Monthly credit reset email
// ============================================================

export interface CreditResetEmailData {
  planName: string;
  monthlyCredits: number;
  nextResetDate: string;
}

export async function sendCreditResetEmail(
  to: string,
  fullName: string,
  data: CreditResetEmailData
): Promise<boolean> {
  const appUrl = APP_URL();
  const formattedCredits = new Intl.NumberFormat("vi-VN").format(data.monthlyCredits);

  const body =
    paragraph(
      `Xin chào <strong>${fullName}</strong>, credits hàng tháng của bạn đã được nạp lại thành công!`
    ) +
    infoTable(
      infoRow("Gói", data.planName) +
        infoRow("Credits mới", formattedCredits) +
        infoRow("Kỳ reset tiếp theo", data.nextResetDate)
    ) +
    ctaButton("Xem Dashboard →", `${appUrl}/dashboard`);

  const html = emailLayout(
    "🔄 Credits đã nạp lại",
    `${formattedCredits} credits cho tháng mới`,
    body
  );
  return sendEmail(
    to,
    `🔄 Credits đã được nạp lại — ${formattedCredits} credits cho tháng mới`,
    html
  );
}

// ============================================================
// UC5 — Low credits warning email
// ============================================================

export interface LowCreditsEmailData {
  remainingCredits: number;
  totalMonthlyCredits: number;
  usagePercent: number;
  nextResetDate: string;
}

export async function sendLowCreditsWarningEmail(
  to: string,
  fullName: string,
  data: LowCreditsEmailData
): Promise<boolean> {
  const appUrl = APP_URL();

  const body =
    paragraph(`Xin chào <strong>${fullName}</strong>, credits của bạn đang ở mức thấp!`) +
    infoTable(
      infoRow("Credits còn lại", `${data.remainingCredits} / ${data.totalMonthlyCredits}`) +
        infoRow("Đã sử dụng", `${data.usagePercent}%`) +
        infoRow("Kỳ reset tiếp theo", data.nextResetDate)
    ) +
    paragraph(
      "💡 Nâng cấp gói để có thêm credits hoặc bật Pay-as-you-go để tiếp tục sử dụng khi hết credits."
    ) +
    ctaButton("Nâng cấp gói →", `${appUrl}/dashboard/upgrade`);

  const html = emailLayout("🔔 Credits sắp hết", `Chỉ còn ${data.remainingCredits} credits`, body);
  return sendEmail(to, `🔔 Credits sắp hết — Chỉ còn ${data.remainingCredits} credits`, html);
}

// ============================================================
// UC6 — Subscription expiry reminder email
// ============================================================

export interface ExpiryReminderEmailData {
  planName: string;
  expiryDate: string;
  daysRemaining: number;
}

export async function sendSubscriptionExpiryReminderEmail(
  to: string,
  fullName: string,
  data: ExpiryReminderEmailData
): Promise<boolean> {
  const appUrl = APP_URL();

  const body =
    paragraph(
      `Xin chào <strong>${fullName}</strong>, gói <strong>${data.planName}</strong> của bạn sẽ hết hạn vào <strong>${data.expiryDate}</strong>.`
    ) +
    infoTable(
      infoRow("Gói hiện tại", data.planName) +
        infoRow("Ngày hết hạn", data.expiryDate) +
        infoRow("Thời gian còn lại", `${data.daysRemaining} ngày`)
    ) +
    paragraph(
      "⚠️ Nếu không gia hạn, tài khoản sẽ chuyển về gói Free, credits sẽ bị reset về 100/tháng và các bot vượt giới hạn sẽ bị tạm dừng."
    ) +
    ctaButton("Gia hạn ngay →", `${appUrl}/dashboard/upgrade`);

  const html = emailLayout("📅 Sắp hết hạn", `Gói ${data.planName} sắp hết hạn`, body);
  return sendEmail(
    to,
    `📅 Gói ${data.planName} sắp hết hạn trong ${data.daysRemaining} ngày`,
    html
  );
}

// ============================================================
// Helper: get user email from Supabase admin client
// ============================================================

export async function getUserEmailById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  userId: string
): Promise<{ email: string; fullName: string } | null> {
  try {
    const {
      data: { user },
      error,
    } = await adminClient.auth.admin.getUserById(userId);

    if (error || !user?.email) return null;

    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email.split("@")[0];

    return { email: user.email, fullName };
  } catch {
    console.error(`[EmailService] Failed to fetch user ${userId}`);
    return null;
  }
}
