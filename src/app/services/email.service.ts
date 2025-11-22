// src/services/email.service.ts
import dotenv from "dotenv";
import nodemailer from "nodemailer";
// import sgMail, { MailDataRequired } from "@sendgrid/mail"; // Commented out SendGrid
import ejs from "ejs";
import path from "path";
import fs from "fs";

dotenv.config();

// Environment variables with proper validation
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@ymabouncycastle.com";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "YMABouncyCastle";

// Validate required environment variables
if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
  console.warn("⚠️ Email environment variables are not fully configured");
  console.warn(
    "EMAIL_HOST, EMAIL_USER, and EMAIL_PASS are required for Nodemailer"
  );
}

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Verify transporter connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ Nodemailer transporter verification failed:", error);
  } else {
    console.log("✅ Nodemailer transporter is ready to send emails");
  }
});

// Commented out SendGrid configuration
/*
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "YMABouncyCastle";

if (!SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not set");
}
if (!SENDGRID_FROM_EMAIL) {
  throw new Error("SENDGRID_FROM_EMAIL is not set");
}

sgMail.setApiKey(SENDGRID_API_KEY);
*/

// Email template types
export type EmailTemplate =
  | "passwordReset"
  | "resetSuccess"
  | "orderConfirmation"
  | "deliveryReminder"
  | "preDeliveryConfirmation";

// Template resolver
function resolveEmailTemplate(templateName: EmailTemplate): string {
  const candidates = [
    path.resolve(
      process.cwd(),
      "src",
      "views",
      "emails",
      `${templateName}.ejs`
    ),
    path.resolve(
      process.cwd(),
      "dist",
      "views",
      "emails",
      `${templateName}.ejs`
    ),
    path.resolve(__dirname, "..", "views", "emails", `${templateName}.ejs`),
  ];

  for (const templatePath of candidates) {
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
  }

  throw new Error(`Email template not found: ${templateName}.ejs`);
}

// Render EJS template
async function renderTemplate(
  templateName: EmailTemplate,
  templateVars: Record<string, any>
): Promise<string> {
  const filePath = resolveEmailTemplate(templateName);
  return await ejs.renderFile(filePath, templateVars, { async: true });
}

// Core email sender with Nodemailer
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
  text?: string; // Plain text version
}

export async function sendEmailHtml(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, fromEmail, fromName, text } = options;

  try {
    const mailOptions = {
      from: `"${fromName || EMAIL_FROM_NAME}" <${fromEmail || EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Basic HTML to text conversion
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[sendEmailHtml] Email sent successfully:", {
      to,
      subject,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("[sendEmailHtml] Nodemailer error:", {
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }

  // Commented out SendGrid implementation
  /*
  try {
    const msg: MailDataRequired = {
      to,
      from: {
        email: fromEmail || SENDGRID_FROM_EMAIL,
        name: fromName || SENDGRID_FROM_NAME,
      },
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log("[sendEmailHtml] Email sent successfully:", { to, subject });
  } catch (error: any) {
    console.error("[sendEmailHtml] SendGrid error:", {
      message: error?.message,
      status: error?.code,
      response: error?.response?.body,
    });
    throw error;
  }
  */
}

// High-level template email sender
export interface TemplatedEmailOptions {
  to: string;
  subject: string;
  templateName: EmailTemplate;
  templateVars: Record<string, any>;
  fromEmail?: string;
  fromName?: string;
}

export async function sendTemplatedEmail(
  options: TemplatedEmailOptions
): Promise<void> {
  const { to, subject, templateName, templateVars, fromEmail, fromName } =
    options;

  const html = await renderTemplate(templateName, templateVars);

  await sendEmailHtml({
    to,
    subject,
    html,
    fromEmail,
    fromName,
  });
}

// Plain text email sender
export interface PlainEmailOptions {
  to: string;
  subject: string;
  message: string;
  senderName?: string;
  senderEmail?: string;
  fromEmail?: string;
  fromName?: string;
}

export async function sendPlainMail(options: PlainEmailOptions): Promise<void> {
  const { to, subject, message, senderName, senderEmail, fromEmail, fromName } =
    options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7C3AED; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .sender-info { margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${EMAIL_FROM_NAME}</h1>
        </div>
        <div class="content">
          ${message.replace(/\n/g, "<br>")}
        </div>
        ${
          senderName || senderEmail
            ? `
        <div class="sender-info">
          <strong>Sender Information:</strong><br>
          ${senderName ? `Name: ${senderName}<br>` : ""}
          ${senderEmail ? `Email: ${senderEmail}` : ""}
        </div>
        `
            : ""
        }
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${EMAIL_FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailHtml({
    to,
    subject,
    html,
    fromEmail,
    fromName,
  });
}

// Auth email helpers
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetURL: string
): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: "Reset your YMA Bouncy Castle password (valid 10 minutes)",
    templateName: "passwordReset",
    templateVars: {
      brand: EMAIL_FROM_NAME,
      name,
      resetURL,
      preheader:
        "Tap the button to reset your YMA Bouncy Castle password. Link expires in 10 minutes.",
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
    },
  });
}

export async function sendResetSuccessEmail(
  to: string,
  name: string
): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: "Your YMA Bouncy Castle password was changed",
    templateName: "resetSuccess",
    templateVars: {
      brand: EMAIL_FROM_NAME,
      name,
      preheader:
        "This is a confirmation that your password was successfully changed.",
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      securityNote:
        "If this wasn't you, please reset your password immediately and contact support.",
    },
  });
}

// Order email functions
export async function sendOrderConfirmationEmail(order: any): Promise<void> {
  try {
    const html = await renderTemplate("orderConfirmation", {
      order,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
    });

    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `Order Confirmed - ${order.orderNumber}`,
      html,
    });

    console.log(`✅ Order confirmation email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email:`, error);
  }
}

export async function sendDeliveryReminderEmail(order: any): Promise<void> {
  try {
    const html = await renderTemplate("deliveryReminder", {
      order,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      deliveryDate: order.estimatedDeliveryDate,
    });

    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `Delivery Reminder - Your Order #${order.orderNumber} Arrives Soon`,
      html,
    });

    console.log(`✅ Delivery reminder email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to send delivery reminder email:`, error);
  }
}

export async function sendPreDeliveryConfirmationEmail(
  order: any
): Promise<void> {
  try {
    const html = await renderTemplate("preDeliveryConfirmation", {
      order,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      deliveryDate: order.estimatedDeliveryDate,
    });

    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `Delivery Confirmation - Your Order #${order.orderNumber} Arrives Tomorrow`,
      html,
    });

    console.log(
      `✅ Pre-delivery confirmation email sent for ${order.orderNumber}`
    );
  } catch (error) {
    console.error(`❌ Failed to send pre-delivery confirmation email:`, error);
  }
}

export async function sendInvoiceEmail(
  order: any,
  invoiceHtml: string
): Promise<void> {
  try {
    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `Invoice - ${order.orderNumber}`,
      html: invoiceHtml,
    });

    console.log(`✅ Invoice email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to send invoice email:`, error);
  }
}

// Test email function
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("✅ Email connection test passed");
    return true;
  } catch (error) {
    console.error("❌ Email connection test failed:", error);
    return false;
  }
}
