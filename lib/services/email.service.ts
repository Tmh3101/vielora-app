import { Resend } from "resend";
import { ESubscriptionCycle, EPaymentCurrency } from "@/types";
import { generateInvoiceToken } from "@/lib/helpers/invoice-token";

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

export function emailLayout(badge: string, heading: string, body: string) {
  const appUrl = APP_URL();
  return `<!doctype html>
<html lang="en">
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

export function ctaButton(text: string, href: string) {
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

export function paragraph(text: string) {
  return `<tr>
  <td align="center" style="padding-bottom: 24px">
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; font-size: 16px; line-height: 26px; color: #64748b; max-width: 90%;">${text}</p>
  </td>
</tr>`;
}

export function infoRow(label: string, value: string) {
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

export function infoTable(rows: string) {
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

export function buildWelcomeEmailHtml(fullName: string): { subject: string; html: string } {
  const appUrl = APP_URL();
  const body =
    paragraph(
      `Welcome <strong>${fullName}</strong> to <strong>Vielora</strong>! Your account has been successfully activated.`
    ) +
    infoTable(
      infoRow("Current Plan", "Free") +
        infoRow("Max Chatbots", "1") +
        infoRow("Monthly Credits", "100")
    ) +
    paragraph("Start creating your first AI chatbot for your website today!") +
    ctaButton("Start creating chatbot →", `${appUrl}/dashboard`);

  const html = emailLayout("🎉 Welcome", "Welcome to Vielora!", body);
  return { subject: "Welcome to Vielora! 🎉", html };
}

export async function sendWelcomeEmail(to: string, fullName: string): Promise<boolean> {
  const { subject, html } = buildWelcomeEmailHtml(fullName);
  return sendEmail(to, subject, html);
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

export function buildPaymentConfirmationEmailHtml(
  fullName: string,
  data: PaymentEmailData
): { subject: string; html: string } {
  const appUrl = APP_URL();
  const cycleLabel = data.billingCycle === ESubscriptionCycle.Yearly ? "Yearly" : "Monthly";
  const formattedAmount =
    data.currency === EPaymentCurrency.VND
      ? new Intl.NumberFormat("vi-VN").format(data.amount) + " ₫"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: EPaymentCurrency.USD,
        }).format(data.amount);

  const formattedCredits = new Intl.NumberFormat("en-US").format(data.monthlyCredits);

  const body =
    paragraph(`Hi <strong>${fullName}</strong>, your payment has been processed successfully!`) +
    infoTable(
      infoRow("Plan", `${data.planName} (${cycleLabel})`) +
        infoRow("Amount", formattedAmount) +
        infoRow("Transaction ID", data.txnId) +
        infoRow("Max Chatbots", `${data.botsLimit}`) +
        infoRow("Monthly Credits", formattedCredits) +
        infoRow("Billing Period", `${data.periodStart} → ${data.periodEnd}`)
    ) +
    ctaButton("Go to Dashboard →", `${appUrl}/dashboard`);

  const html = emailLayout("✅ Payment Successful", `${data.planName} Plan Activated`, body);
  return { subject: `Payment Confirmed: ${data.planName} Plan Active`, html };
}

export async function sendPaymentConfirmationEmail(
  to: string,
  fullName: string,
  data: PaymentEmailData
): Promise<boolean> {
  const { subject, html } = buildPaymentConfirmationEmailHtml(fullName, data);
  return sendEmail(to, subject, html);
}

// ============================================================
// UC3 — Subscription downgrade email
// ============================================================

export interface DowngradeEmailData {
  oldPlanName: string;
  expiryDate: string;
}

export function buildSubscriptionDowngradeEmailHtml(
  fullName: string,
  data: DowngradeEmailData
): { subject: string; html: string } {
  const appUrl = APP_URL();
  const body =
    paragraph(
      `Hi <strong>${fullName}</strong>, your <strong>${data.oldPlanName}</strong> subscription expired on <strong>${data.expiryDate}</strong> and your account has been moved to the Free plan.`
    ) +
    infoTable(
      infoRow("Previous Plan", data.oldPlanName) +
        infoRow("Current Plan", "Free") +
        infoRow("Monthly Credits", "100") +
        infoRow("Max Chatbots", "1")
    ) +
    paragraph(
      "⚠️ Active bots exceeding your Free limit have been paused. Please visit your Dashboard to manage active bots or renew your subscription."
    ) +
    ctaButton("Renew Subscription →", `${appUrl}/dashboard/upgrade`);

  const html = emailLayout("⚠️ Subscription Expired", `${data.oldPlanName} Plan Expired`, body);
  return {
    subject: `⚠️ Your ${data.oldPlanName} plan has expired — Account moved to Free`,
    html,
  };
}

export async function sendSubscriptionDowngradeEmail(
  to: string,
  fullName: string,
  data: DowngradeEmailData
): Promise<boolean> {
  const { subject, html } = buildSubscriptionDowngradeEmailHtml(fullName, data);
  return sendEmail(to, subject, html);
}

// ============================================================
// UC4 — Monthly credit reset email
// ============================================================

export interface CreditResetEmailData {
  planName: string;
  monthlyCredits: number;
  nextResetDate: string;
}

export function buildCreditResetEmailHtml(
  fullName: string,
  data: CreditResetEmailData
): { subject: string; html: string } {
  const appUrl = APP_URL();
  const formattedCredits = new Intl.NumberFormat("en-US").format(data.monthlyCredits);

  const body =
    paragraph(
      `Hi <strong>${fullName}</strong>, your monthly credits have been successfully refreshed!`
    ) +
    infoTable(
      infoRow("Plan", data.planName) +
        infoRow("New Credits", formattedCredits) +
        infoRow("Next Reset Date", data.nextResetDate)
    ) +
    ctaButton("View Dashboard →", `${appUrl}/dashboard`);

  const html = emailLayout(
    "🔄 Credits Refreshed",
    `${formattedCredits} credits for your new cycle`,
    body
  );
  return {
    subject: `🔄 Monthly Credits Refreshed — ${formattedCredits} credits available`,
    html,
  };
}

export async function sendCreditResetEmail(
  to: string,
  fullName: string,
  data: CreditResetEmailData
): Promise<boolean> {
  const { subject, html } = buildCreditResetEmailHtml(fullName, data);
  return sendEmail(to, subject, html);
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

export function buildLowCreditsWarningEmailHtml(
  fullName: string,
  data: LowCreditsEmailData
): { subject: string; html: string } {
  const appUrl = APP_URL();
  const remainingFormatted = new Intl.NumberFormat("en-US").format(data.remainingCredits);
  const totalFormatted = new Intl.NumberFormat("en-US").format(data.totalMonthlyCredits);

  const body =
    paragraph(`Hi <strong>${fullName}</strong>, your account credits are running low!`) +
    infoTable(
      infoRow("Remaining Credits", `${remainingFormatted} / ${totalFormatted}`) +
        infoRow("Usage", `${data.usagePercent}%`) +
        infoRow("Next Reset Date", data.nextResetDate)
    ) +
    paragraph(
      "💡 Upgrade your plan or enable Pay-As-You-Go to keep your chatbots responding without interruptions."
    ) +
    ctaButton("Upgrade Plan →", `${appUrl}/dashboard/upgrade`);

  const html = emailLayout(
    "🔔 Low Credits Warning",
    `Only ${remainingFormatted} credits left`,
    body
  );
  return {
    subject: `🔔 Low Credits Alert — Only ${remainingFormatted} credits remaining`,
    html,
  };
}

export async function sendLowCreditsWarningEmail(
  to: string,
  fullName: string,
  data: LowCreditsEmailData
): Promise<boolean> {
  const { subject, html } = buildLowCreditsWarningEmailHtml(fullName, data);
  return sendEmail(to, subject, html);
}

// ============================================================
// UC6 — Subscription expiry reminder email
// ============================================================

export interface ExpiryReminderEmailData {
  planName: string;
  expiryDate: string;
  daysRemaining: number;
}

export function buildSubscriptionExpiryReminderEmailHtml(
  fullName: string,
  data: ExpiryReminderEmailData
): { subject: string; html: string } {
  const appUrl = APP_URL();

  const body =
    paragraph(
      `Hi <strong>${fullName}</strong>, your <strong>${data.planName}</strong> plan will expire on <strong>${data.expiryDate}</strong>.`
    ) +
    infoTable(
      infoRow("Current Plan", data.planName) +
        infoRow("Expiration Date", data.expiryDate) +
        infoRow("Time Remaining", `${data.daysRemaining} days`)
    ) +
    paragraph(
      "⚠️ If not renewed, your account will be downgraded to Free (100 credits/month) and extra active bots will be paused."
    ) +
    ctaButton("Renew Subscription →", `${appUrl}/dashboard/upgrade`);

  const html = emailLayout("📅 Expiring Soon", `${data.planName} Plan Expiring Soon`, body);
  return {
    subject: `📅 Notice: Your ${data.planName} plan expires in ${data.daysRemaining} days`,
    html,
  };
}

export async function sendSubscriptionExpiryReminderEmail(
  to: string,
  fullName: string,
  data: ExpiryReminderEmailData
): Promise<boolean> {
  const { subject, html } = buildSubscriptionExpiryReminderEmailHtml(fullName, data);
  return sendEmail(to, subject, html);
}

// ============================================================
// UC7 — PAYG Credit Purchase email
// ============================================================

export interface PAYGPurchaseEmailData {
  packageName: string;
  amount: number;
  currency: string;
  txnId: string;
  creditsAdded: number;
  newTotalCredits: number;
}

export function buildPAYGPurchaseEmailHtml(
  fullName: string,
  data: PAYGPurchaseEmailData
): { subject: string; html: string } {
  const appUrl = APP_URL();
  const formattedAmount =
    data.currency === EPaymentCurrency.VND
      ? new Intl.NumberFormat("vi-VN").format(data.amount) + " ₫"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: EPaymentCurrency.USD,
        }).format(data.amount);

  const formattedCreditsAdded = new Intl.NumberFormat("en-US").format(data.creditsAdded);
  const formattedTotalCredits = new Intl.NumberFormat("en-US").format(data.newTotalCredits);

  const body =
    paragraph(
      `Hi <strong>${fullName}</strong>, you have successfully added <strong>${formattedCreditsAdded} credits</strong> to your account!`
    ) +
    infoTable(
      infoRow("Package", data.packageName) +
        infoRow("Amount", formattedAmount) +
        infoRow("Transaction ID", data.txnId) +
        infoRow("Credits Added", `+${formattedCreditsAdded}`) +
        infoRow("Total Balance", formattedTotalCredits)
    ) +
    ctaButton("Go to Dashboard →", `${appUrl}/dashboard`);

  const html = emailLayout("✅ Credits Added", `+${formattedCreditsAdded} credits added`, body);
  return {
    subject: `Payment Confirmed: +${formattedCreditsAdded} Credits Added`,
    html,
  };
}

export async function sendPAYGPurchaseEmail(
  to: string,
  fullName: string,
  data: PAYGPurchaseEmailData
): Promise<boolean> {
  const { subject, html } = buildPAYGPurchaseEmailHtml(fullName, data);
  return sendEmail(to, subject, html);
}

// ============================================================
// UC8 — Invoice issued email
// ============================================================

export interface InvoiceIssuedEmailData {
  invoiceId: string;
  companyName: string;
  invoiceNo: string;
  amount: number;
}

export function buildInvoiceIssuedEmailHtml(data: InvoiceIssuedEmailData): {
  subject: string;
  html: string;
} {
  const appUrl = APP_URL();
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(data.amount);

  // Signed link with 7-day expiration
  const { token: invoiceToken, exp: invoiceTokenExp } = generateInvoiceToken(data.invoiceId);
  const invoicePdfUrl = `${appUrl}/api/invoices/${data.invoiceId}/pdf?token=${invoiceToken}&exp=${invoiceTokenExp}`;

  const body =
    paragraph(`Hello,`) +
    paragraph(
      `The electronic invoice for <strong>${data.companyName}</strong> has been successfully issued.`
    ) +
    infoTable(
      infoRow("Invoice No.", data.invoiceNo) +
        infoRow("Total Amount", formattedAmount) +
        infoRow("Status", "Issued / Đã phát hành")
    ) +
    ctaButton("View & Download Invoice →", invoicePdfUrl) +
    paragraph(
      `🔗 <em>This link will expire in <strong>7 days</strong>. You can also access all your past invoices anytime in the <strong>Billing History</strong> section of your Vielora Dashboard.</em>`
    );

  const html = emailLayout("Electronic Invoice", "E-Invoice Issued", body);
  return { subject: `E-Invoice Issued - ${data.invoiceNo}`, html };
}

export async function sendInvoiceIssuedEmail(
  to: string,
  data: InvoiceIssuedEmailData
): Promise<boolean> {
  const { subject, html } = buildInvoiceIssuedEmailHtml(data);
  return sendEmail(to, subject, html);
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

/**
 * Get email and full name of all members (and workspace owner).
 */
export async function getWorkspaceMemberEmails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  workspaceId: string
): Promise<Array<{ email: string; fullName: string }>> {
  try {
    const { data: members } = await adminClient
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    const userIds = new Set<string>();
    if (members && Array.isArray(members)) {
      members.forEach((m: { user_id: string }) => {
        if (m.user_id) userIds.add(m.user_id);
      });
    }

    const { data: ws } = await adminClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (ws?.owner_id) {
      userIds.add(ws.owner_id);
    }

    const results: Array<{ email: string; fullName: string }> = [];
    for (const uid of Array.from(userIds)) {
      const userInfo = await getUserEmailById(adminClient, uid);
      if (userInfo && !results.some((r) => r.email === userInfo.email)) {
        results.push(userInfo);
      }
    }

    return results;
  } catch (err) {
    console.error(
      `[EmailService] Failed to fetch member emails for workspace ${workspaceId}:`,
      err
    );
    return [];
  }
}

// ============================================================
// Workspace Invitation Email
// ============================================================

export interface InvitationEmailData {
  workspaceName: string;
  workspaceSlug: string;
  invitedByName: string;
  acceptUrl: string;
}

export function buildWorkspaceInvitationEmailHtml(data: InvitationEmailData): {
  subject: string;
  html: string;
} {
  const body =
    paragraph(
      `<strong>${data.invitedByName}</strong> has invited you to join the workspace <strong>${data.workspaceName}</strong> on Vielora.`
    ) +
    infoTable(
      infoRow("Workspace", data.workspaceName) +
        infoRow("Invited By", data.invitedByName) +
        infoRow("Invitation Validity", "7 days")
    ) +
    paragraph("Click the button below to accept the invitation and join the workspace:") +
    ctaButton("Accept Invitation →", data.acceptUrl) +
    paragraph(
      `<span style="font-size: 13px; color: #94a3b8;">If you were not expecting this invitation or do not wish to join, you can safely ignore this email.</span>`
    );

  const html = emailLayout("✉️ Workspace Invitation", `Join ${data.workspaceName}`, body);

  return {
    subject: `${data.invitedByName} invited you to join "${data.workspaceName}" on Vielora`,
    html,
  };
}

export async function sendWorkspaceInvitationEmail(
  to: string,
  data: InvitationEmailData
): Promise<boolean> {
  const { subject, html } = buildWorkspaceInvitationEmailHtml(data);
  return sendEmail(to, subject, html);
}

// ============================================================
// Group Chat Invitation Email
// ============================================================

export interface GroupInviteEmailData {
  botName: string;
  invitedByName: string;
  actionUrl?: string;
  groupUrl?: string;
  isNewAccount: boolean;
}

export function buildGroupInviteEmailHtml(data: GroupInviteEmailData): {
  subject: string;
  html: string;
} {
  const targetUrl = data.actionUrl || data.groupUrl;
  const accountNote = data.isNewAccount
    ? paragraph(
        "Your account has been automatically created on Vielora. Click below to verify and access your group chat immediately:"
      )
    : paragraph("Click below to access the group conversation:");

  const body =
    paragraph(
      `<strong>${data.invitedByName}</strong> has added you to the group chat for bot <strong>${data.botName}</strong> on Vielora.`
    ) +
    infoTable(infoRow("Chatbot", data.botName) + infoRow("Invited By", data.invitedByName)) +
    accountNote +
    (targetUrl ? ctaButton("Join Group Chat Now →", targetUrl) : "");

  const html = emailLayout("💬 Added to Group Chat", `${data.botName} Group Chat`, body);

  return {
    subject: `[Vielora] Invitation to join "${data.botName}" group chat`,
    html,
  };
}

export async function sendGroupInviteEmail(
  to: string,
  data: GroupInviteEmailData
): Promise<boolean> {
  const { subject, html } = buildGroupInviteEmailHtml(data);
  return sendEmail(to, subject, html);
}
