// src/services/email.service.ts
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import ejs from "ejs";
import path from "path";
import fs from "fs";

dotenv.config();

// ---- Env checks ----
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL!;
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME! || "YMABouncyCastle";

if (!SENDGRID_API_KEY) new Error("SENDGRID_API_KEY is not set");
if (!SENDGRID_FROM_EMAIL) new Error("SENDGRID_FROM_EMAIL is not set");

sgMail.setApiKey(SENDGRID_API_KEY);

// ---- Template resolver ----
// Works in ts-node (src/…) and compiled (dist/…)
function resolveEmailTemplate(templateName: string): any {
  const candidates = [
    path.resolve(process.cwd(), "src", "views", "auth", `${templateName}.ejs`),
    path.resolve(process.cwd(), "dist", "views", "auth", `${templateName}.ejs`),
    path.resolve(__dirname, "..", "views", "emails", `${templateName}.ejs`),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  new Error(`Email template not found: ${templateName}.ejs`);
}

// ---- Render EJS with provided variables ----
async function renderTemplate(
  templateName: "passwordReset" | "resetSuccess",
  templateVars: Record<string, any>
): Promise<string> {
  const filePath = resolveEmailTemplate(templateName);
  return await ejs.renderFile(filePath, templateVars, { async: true });
}

// ---- Core sender (HTML already rendered) ----
export async function sendEmailHtml(to: string, subject: string, html: string) {
  try {
    await sgMail.send({
      to,
      from: { email: SENDGRID_FROM_EMAIL!, name: SENDGRID_FROM_NAME },
      subject,
      html,
    });
    console.log("[sendEmailHtml] Sent:", { to, subject });
  } catch (err: any) {
    console.error("[sendEmailHtml] SendGrid error:", {
      message: err?.message,
      status: err?.code,
      response: err?.response?.body, // detailed reasons from SendGrid
    });
    err;
  }
}

// ---- High-level helper: send via EJS template ----
export async function sendTemplatedEmail(
  to: string,
  subject: string,
  templateName: "passwordReset" | "resetSuccess",
  templateVars: Record<string, any>
) {
  const html = await renderTemplate(templateName, templateVars);
  return sendEmailHtml(to, subject, html);
}

// ---- Convenience wrappers for your auth flow ----
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetURL: string
) {
  return sendTemplatedEmail(
    to,
    "Reset your YMA Bouncy Castle password (valid 10 minutes)",
    "passwordReset",
    {
      brand: process.env.SENDGRID_FROM_NAME || "YMABouncyCastle",
      name,
      resetURL,
      preheader:
        "Tap the button to reset your YMA Bouncy Castle password. Link expires in 10 minutes.",
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
    }
  );
}

export async function sendResetSuccessEmail(to: string, name: string) {
  return sendTemplatedEmail(
    to,
    "Your YMA Bouncy Castle password was changed",
    "resetSuccess",
    {
      brand: process.env.SENDGRID_FROM_NAME || "YMABouncyCastle",
      name,
      preheader:
        "This is a confirmation that your password was successfully changed.",
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      securityNote:
        "If this wasn't you, please reset your password immediately and contact support.",
    }
  );
}
