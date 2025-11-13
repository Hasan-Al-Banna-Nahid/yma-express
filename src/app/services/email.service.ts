// src/services/email.service.ts
import dotenv from "dotenv";
dotenv.config();

import sgMail from "@sendgrid/mail";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import dns from "dns";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL!;
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "YMABouncyCastle";
if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY is not set");
if (!SENDGRID_FROM_EMAIL) throw new Error("SENDGRID_FROM_EMAIL is not set");

sgMail.setApiKey(SENDGRID_API_KEY);
// In your email.service.ts, add validation:
if (!SENDGRID_API_KEY || SENDGRID_API_KEY.length < 20) {
  throw new Error("SENDGRID_API_KEY is invalid or too short");
}
console.log("SendGrid API Key present:", SENDGRID_API_KEY ? "Yes" : "No");
// ---------- template resolver ----------
function resolveTemplatePath(name: string) {
  const candidates = [
    path.resolve(process.cwd(), "src", "app", "views", "auth", `${name}.ejs`),
    path.resolve(process.cwd(), "dist", "app", "views", "auth", `${name}.ejs`),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error(`Email template not found: ${name}.ejs`);
}

// ---------- precompiled template cache ----------
const templateCache = new Map<string, ejs.TemplateFunction>();

function compileTemplate(name: string) {
  const file = resolveTemplatePath(name);
  const source = fs.readFileSync(file, "utf8");
  const compiled = ejs.compile(source, { filename: file });
  templateCache.set(name, compiled);
  return compiled;
}

function render(
  name: "passwordReset" | "resetSuccess",
  vars: Record<string, any>
): string {
  const tpl = templateCache.get(name) ?? compileTemplate(name);
  return tpl(vars);
}

// ---------- warmup on startup (optional but helps) ----------
export async function warmupEmail(): Promise<void> {
  try {
    // Compile templates so first request doesn’t hit disk
    compileTemplate("passwordReset");
    compileTemplate("resetSuccess");

    // Warm DNS for SendGrid host (avoid first DNS stall)
    dns.lookup("api.sendgrid.com", (err) => {
      if (err) console.warn("[email warmup] DNS warmup failed:", err.message);
    });
  } catch (e: any) {
    console.warn("[email warmup] skipped:", e?.message);
  }
}

// ---------- core sender ----------
// In email.service.ts - sendEmailHtml function
export async function sendEmailHtml(to: string, subject: string, html: string) {
  try {
    console.log("📧 Attempting to send email to:", to);

    const msg = {
      to,
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      subject,
      html,
    };

    // Test SendGrid connection
    console.log("🔧 SendGrid Config:", {
      hasApiKey: !!SENDGRID_API_KEY,
      fromEmail: SENDGRID_FROM_EMAIL,
      fromName: SENDGRID_FROM_NAME,
    });

    const response = await sgMail.send(msg);
    console.log("✅ Email sent successfully. Status:", response[0]?.statusCode);
    return response;
  } catch (error: any) {
    console.error("🔴 SendGrid Raw Error:", {
      name: error.name,
      code: error.code,
      message: error.message,
      response: error.response
        ? {
            status: error.response.status,
            headers: error.response.headers,
            body: error.response.body,
          }
        : "No response",
    });

    // Handle specific SendGrid error codes
    if (error.response) {
      const { body, statusCode } = error.response;
      console.error("SendGrid API Response:", body);

      if (statusCode === 401) {
        throw new Error("SendGrid: Unauthorized - Check your API key");
      } else if (statusCode === 403) {
        throw new Error("SendGrid: Forbidden - Check sending permissions");
      } else if (statusCode === 429) {
        throw new Error("SendGrid: Rate limit exceeded");
      }
    }

    throw error;
  }
}

// ---------- high-level helpers ----------
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetURL: string
) {
  const html = render("passwordReset", {
    brand: SENDGRID_FROM_NAME,
    name,
    resetURL,
    preheader:
      "Tap the button to reset your YMA Bouncy Castle password. Link expires in 10 minutes.",
    year: new Date().getFullYear(),
    brandColor: "#7C3AED",
  });
  return sendEmailHtml(
    to,
    "Reset your YMA Bouncy Castle password (valid 10 minutes)",
    html
  );
}

export async function sendResetSuccessEmail(to: string, name: string) {
  const html = render("resetSuccess", {
    brand: SENDGRID_FROM_NAME,
    name,
    preheader:
      "This is a confirmation that your password was successfully changed.",
    year: new Date().getFullYear(),
    brandColor: "#7C3AED",
    securityNote:
      "If this wasn't you, please reset your password immediately and contact support.",
  });
  return sendEmailHtml(to, "Your YMA Bouncy Castle password was changed", html);
}

// import { htmlToText } from "html-to-text"; // npm i html-to-text

// export async function sendEmailHtml(to: string, subject: string, html: string) {
//   const text = htmlToText(html, { wordwrap: 130 });

//   await sgMail.send({
//     to,
//     from: { email: process.env.SENDGRID_FROM_EMAIL!, name: process.env.SENDGRID_FROM_NAME || "YMABouncyCastle" },
//     replyTo: "support@yma-bouncycastle.com", // optional, but nice
//     subject,
//     html,
//     text,
//     trackingSettings: {
//       clickTracking: { enable: false, enableText: false },
//       openTracking: { enable: false },
//       subscriptionTracking: { enable: false },
//     },
//     mailSettings: {
//       // keep this ON for transactional
//       bypassListManagement: { enable: true },
//     },
//     // categories: ["transactional"], // keep categories minimal or omit
//   });
// }

export async function sendPlainMail(opts: {
  to: string; // recipient (can be hardcoded or dynamic)
  subject: string;
  message: string;
  senderName?: string; // shown in body / used in replyTo name
  senderEmail?: string; // used as replyTo
  fromEmail?: string; // OPTIONAL: only use if verified; else fallback to SENDGRID_FROM_EMAIL
  fromName?: string; // OPTIONAL: override FROM name
}) {
  const {
    to,
    subject,
    message,
    senderName = "Anonymous",
    senderEmail,
    fromEmail,
    fromName,
  } = opts;

  // Always use a verified FROM for SendGrid compliance
  const finalFromEmail =
    fromEmail && fromEmail.trim() ? fromEmail : SENDGRID_FROM_EMAIL;
  const finalFromName =
    fromName && fromName.trim() ? fromName : SENDGRID_FROM_NAME;

  const textBody =
    `New message from contact form\n\n` +
    `Sender: ${senderName}\n` +
    (senderEmail ? `Email: ${senderEmail}\n` : ``) +
    `Subject: ${subject}\n\n` +
    `${message}\n`;

  await sgMail.send({
    to,
    from: { email: finalFromEmail, name: finalFromName },
    subject,
    text: textBody,
    // minimal HTML (still no template)
    html: `<pre style="font-family:inherit;white-space:pre-wrap;">${textBody
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`,
    ...(senderEmail
      ? { replyTo: { email: senderEmail, name: senderName } }
      : {}),
  });
}
