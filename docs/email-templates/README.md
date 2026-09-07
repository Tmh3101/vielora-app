# Supabase Auth Email Templates

This directory contains production-ready HTML email templates for **Supabase Auth**.

## 📌 Configured Templates in Supabase Dashboard

Copy and paste the HTML content of these files into **Authentication → Email Templates** on your [Supabase Dashboard](https://supabase.com/dashboard):

| File | Supabase Template Type | Variables Used |
|---|---|---|
| [`confirm-signup.html`](./confirm-signup.html) | **Confirm signup** | `{{ .ConfirmationURL }}`, `{{ .AppURL }}` |
| [`reset-password.html`](./reset-password.html) | **Reset password** | `{{ .ConfirmationURL }}`, `{{ .AppURL }}` |
| [`welcome.html`](./welcome.html) | **Welcome / Onboarding** | `{{ .FullName }}`, `{{ .DashboardURL }}`, `{{ .AppURL }}` |

---

## ℹ️ Other Transactional Emails

All other transactional emails (payment confirmation, credit resets, subscription reminders, workspace invites, e-invoices, group chat invites) are programmatically generated in English and delivered via **Resend API** in:
👉 [`lib/services/email.service.ts`](../../lib/services/email.service.ts)
