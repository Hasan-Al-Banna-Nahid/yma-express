"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmupEmail = warmupEmail;
exports.sendEmailHtml = sendEmailHtml;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendResetSuccessEmail = sendResetSuccessEmail;
exports.sendPlainMail = sendPlainMail;
// src/services/email.service.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mail_1 = __importDefault(require("@sendgrid/mail"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dns_1 = __importDefault(require("dns"));
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "YMABouncyCastle";
if (!SENDGRID_API_KEY)
    throw new Error("SENDGRID_API_KEY is not set");
if (!SENDGRID_FROM_EMAIL)
    throw new Error("SENDGRID_FROM_EMAIL is not set");
mail_1.default.setApiKey(SENDGRID_API_KEY);
// ---------- template resolver ----------
function resolveTemplatePath(name) {
    const candidates = [
        path_1.default.resolve(process.cwd(), "src", "app", "views", "auth", `${name}.ejs`),
        path_1.default.resolve(process.cwd(), "dist", "app", "views", "auth", `${name}.ejs`),
    ];
    for (const p of candidates)
        if (fs_1.default.existsSync(p))
            return p;
    throw new Error(`Email template not found: ${name}.ejs`);
}
// ---------- precompiled template cache ----------
const templateCache = new Map();
function compileTemplate(name) {
    const file = resolveTemplatePath(name);
    const source = fs_1.default.readFileSync(file, "utf8");
    const compiled = ejs_1.default.compile(source, { filename: file });
    templateCache.set(name, compiled);
    return compiled;
}
function render(name, vars) {
    const tpl = templateCache.get(name) ?? compileTemplate(name);
    return tpl(vars);
}
// ---------- warmup on startup (optional but helps) ----------
async function warmupEmail() {
    try {
        // Compile templates so first request doesn’t hit disk
        compileTemplate("passwordReset");
        compileTemplate("resetSuccess");
        // Warm DNS for SendGrid host (avoid first DNS stall)
        dns_1.default.lookup("api.sendgrid.com", (err) => {
            if (err)
                console.warn("[email warmup] DNS warmup failed:", err.message);
        });
    }
    catch (e) {
        console.warn("[email warmup] skipped:", e?.message);
    }
}
// ---------- core sender ----------
async function sendEmailHtml(to, subject, html) {
    await mail_1.default.send({
        to,
        from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
        subject,
        html,
    });
}
// ---------- high-level helpers ----------
async function sendPasswordResetEmail(to, name, resetURL) {
    const html = render("passwordReset", {
        brand: SENDGRID_FROM_NAME,
        name,
        resetURL,
        preheader: "Tap the button to reset your YMA Bouncy Castle password. Link expires in 10 minutes.",
        year: new Date().getFullYear(),
        brandColor: "#7C3AED",
    });
    return sendEmailHtml(to, "Reset your YMA Bouncy Castle password (valid 10 minutes)", html);
}
async function sendResetSuccessEmail(to, name) {
    const html = render("resetSuccess", {
        brand: SENDGRID_FROM_NAME,
        name,
        preheader: "This is a confirmation that your password was successfully changed.",
        year: new Date().getFullYear(),
        brandColor: "#7C3AED",
        securityNote: "If this wasn't you, please reset your password immediately and contact support.",
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
async function sendPlainMail(opts) {
    const { to, subject, message, senderName = "Anonymous", senderEmail, fromEmail, fromName, } = opts;
    // Always use a verified FROM for SendGrid compliance
    const finalFromEmail = fromEmail && fromEmail.trim() ? fromEmail : SENDGRID_FROM_EMAIL;
    const finalFromName = fromName && fromName.trim() ? fromName : SENDGRID_FROM_NAME;
    const textBody = `New message from contact form\n\n` +
        `Sender: ${senderName}\n` +
        (senderEmail ? `Email: ${senderEmail}\n` : ``) +
        `Subject: ${subject}\n\n` +
        `${message}\n`;
    await mail_1.default.send({
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
