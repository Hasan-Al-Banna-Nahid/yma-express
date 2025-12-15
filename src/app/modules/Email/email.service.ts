// src/services/email.service.ts
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import { IOrder } from "../UserOrder/order.model";
import { generateInvoiceHtml } from "../Invoice/invoice.service";

dotenv.config();

// Environment variables
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@ymabouncycastle.com";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "YMABouncyCastle";

if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
  console.warn("⚠️ Email environment variables are not fully configured");
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error)
    console.error("❌ Nodemailer transporter verification failed:", error);
  else console.log("✅ Nodemailer transporter ready");
});

// Email templates
export type EmailTemplate =
  | "passwordReset"
  | "resetSuccess"
  | "orderConfirmation"
  | "deliveryReminder"
  | "preDeliveryConfirmation"
  | "invoice";

// Resolve template path (fix for src/dist and auth/emails folders)
function resolveEmailTemplate(templateName: EmailTemplate): string {
  const candidates = [
    path.resolve(
      process.cwd(),
      "src",
      "app",
      "views",
      "emails",
      `${templateName}.ejs`
    ),
    path.resolve(
      process.cwd(),
      "src",
      "app",
      "views",
      "auth",
      `${templateName}.ejs`
    ),
    path.resolve(
      process.cwd(),
      "dist",
      "app",
      "views",
      "emails",
      `${templateName}.ejs`
    ),
    path.resolve(
      process.cwd(),
      "dist",
      "app",
      "views",
      "auth",
      `${templateName}.ejs`
    ),
    path.resolve(__dirname, "..", "views", "emails", `${templateName}.ejs`),
    path.resolve(__dirname, "..", "views", "auth", `${templateName}.ejs`),
  ];

  for (const templatePath of candidates) {
    if (fs.existsSync(templatePath)) return templatePath;
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

// Core send email
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
  text?: string;
}

export async function sendEmailHtml(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, fromEmail, fromName, text } = options;

  const mailOptions = {
    from: `"${fromName || EMAIL_FROM_NAME}" <${fromEmail || EMAIL_FROM}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[sendEmailHtml] Email sent:", {
      to,
      subject,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("[sendEmailHtml] Error:", {
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}

// Templated email
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
  const html = await renderTemplate(options.templateName, options.templateVars);
  await sendEmailHtml({ ...options, html });
}

// Plain email
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
      <div class="header"><h1>${EMAIL_FROM_NAME}</h1></div>
      <div class="content">${options.message.replace(/\n/g, "<br>")}</div>
      ${
        options.senderName || options.senderEmail
          ? `
        <div class="sender-info">
          <strong>Sender Information:</strong><br>
          ${options.senderName ? `Name: ${options.senderName}<br>` : ""}
          ${options.senderEmail ? `Email: ${options.senderEmail}` : ""}
        </div>`
          : ""
      }
      <div class="footer">&copy; ${new Date().getFullYear()} ${EMAIL_FROM_NAME}. All rights reserved.</div>
    </div>
  </body>
  </html>
  `;

  await sendEmailHtml({ ...options, html });
}

// Auth email helpers
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetURL: string
) {
  await sendTemplatedEmail({
    to,
    subject: "Reset your YMA Bouncy Castle password (valid 10 minutes)",
    templateName: "passwordReset",
    templateVars: {
      brand: EMAIL_FROM_NAME,
      name,
      resetURL,
      preheader:
        "Tap the button to reset your password. Link expires in 10 minutes.",
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
    },
  });
}

export async function sendResetSuccessEmail(to: string, name: string) {
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
        "If this wasn't you, reset your password immediately and contact support.",
    },
  });
}

// Order emails
export async function sendOrderConfirmationEmail(order: IOrder) {
  try {
    const invoiceHtml = await generateInvoiceHtml(order);
    const html = await renderTemplate("orderConfirmation", {
      order,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      invoiceHtml,
    });

    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `🎉 Order Confirmed - ${order.orderNumber}`,
      html,
    });
    console.log(`✅ Order confirmation email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send order confirmation email:", error);
    throw error;
  }
}

export async function sendDeliveryReminderEmail(order: IOrder) {
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
      subject: `🚚 Delivery Reminder - Your Order #${order.orderNumber} Arrives Soon`,
      html,
    });
    console.log(`✅ Delivery reminder email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send delivery reminder email:", error);
    throw error;
  }
}

export async function sendPreDeliveryConfirmationEmail(order: IOrder) {
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
      subject: `📦 Delivery Confirmed - Your Order #${order.orderNumber} Arrives Tomorrow`,
      html,
    });
    console.log(
      `✅ Pre-delivery confirmation email sent for ${order.orderNumber}`
    );
  } catch (error) {
    console.error("❌ Failed to send pre-delivery confirmation email:", error);
    throw error;
  }
}

export async function sendInvoiceEmail(order: IOrder, invoiceHtml: string) {
  try {
    const html = await renderTemplate("invoice", {
      order,
      invoiceHtml,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
    });

    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `📄 Invoice - ${order.orderNumber}`,
      html,
    });
    console.log(`✅ Invoice email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send invoice email:", error);
    throw error;
  }
}

// Order with invoice attachment
export async function sendOrderWithInvoiceAttachment(order: IOrder) {
  try {
    const invoiceHtml = await generateInvoiceHtml(order);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .order-confirmation { background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
          .invoice-section { border-top: 2px solid #7C3AED; padding-top: 20px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="order-confirmation">
          <h2>🎉 Your Order Has Been Confirmed!</h2>
          <p>Thank you for your order <strong>#${
            order.orderNumber
          }</strong>.</p>
          <p>Estimated Delivery: ${order.estimatedDeliveryDate.toLocaleDateString()}</p>
        </div>
        <div class="invoice-section">
          <h3>📄 Invoice</h3>
          ${invoiceHtml}
        </div>
        <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 5px;">
          <p><strong>Need Help?</strong></p>
          <p>Contact us at ${EMAIL_FROM}</p>
        </div>
      </body>
      </html>
    `;
    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `🎉 Order Confirmed with Invoice - ${order.orderNumber}`,
      html,
    });
    console.log(`✅ Order with invoice sent for ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send order with invoice:", error);
    throw error;
  }
}

// Admin notification
export async function sendAdminOrderNotification(
  order: IOrder,
  adminEmail: string
) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .alert { background: #ffebee; padding: 20px; border-radius: 5px; }
          .order-details { background: #f5f5f5; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="alert"><h2>🚨 New Order Received</h2><p>A new order has been placed and requires attention.</p></div>
        <div class="order-details">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Customer:</strong> ${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }</p>
          <p><strong>Email:</strong> ${order.shippingAddress.email}</p>
          <p><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
          <p><strong>Total Amount:</strong> £${order.totalAmount.toFixed(2)}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Delivery Date:</strong> ${order.estimatedDeliveryDate.toLocaleDateString()}</p>
        </div>
        <p>Please log in to the admin panel to process this order.</p>
      </body>
      </html>
    `;
    await sendEmailHtml({
      to: adminEmail,
      subject: `🚨 New Order - ${order.orderNumber}`,
      html,
    });
    console.log(`✅ Admin notification sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send admin notification:", error);
    throw error;
  }
}

// Order status update
export async function sendOrderStatusUpdateEmail(
  order: IOrder,
  previousStatus: string
) {
  try {
    const statusMessages: Record<string, string> = {
      confirmed: "has been confirmed and is being processed",
      shipped: "has been shipped and is on its way",
      delivered: "has been delivered successfully",
      cancelled: "has been cancelled",
    };
    const statusEmoji: Record<string, string> = {
      confirmed: "✅",
      shipped: "🚚",
      delivered: "🎉",
      cancelled: "❌",
    };
    const message = statusMessages[order.status] || "status has been updated";
    const emoji = statusEmoji[order.status] || "📝";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .status-update { background: #e3f2fd; padding: 20px; border-radius: 10px; }
          .order-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="status-update">
          <h2>${emoji} Order Status Updated</h2>
          <p>Your order <strong>#${order.orderNumber}</strong> ${message}.</p>
        </div>
        <div class="order-info">
          <p><strong>Previous Status:</strong> ${previousStatus}</p>
          <p><strong>New Status:</strong> ${order.status}</p>
          <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString()}</p>
          <p><strong>Estimated Delivery:</strong> ${order.estimatedDeliveryDate.toLocaleDateString()}</p>
          ${
            order.deliveryDate
              ? `<p><strong>Actual Delivery:</strong> ${order.deliveryDate.toLocaleDateString()}</p>`
              : ""
          }
          ${
            order.adminNotes
              ? `<p><strong>Admin Notes:</strong> ${order.adminNotes}</p>`
              : ""
          }
        </div>
        <p>If you have questions, contact ${EMAIL_FROM}</p>
      </body>
      </html>
    `;
    await sendEmailHtml({
      to: order.shippingAddress.email,
      subject: `${emoji} Order Status Update - ${order.orderNumber}`,
      html,
    });
    console.log(`✅ Status update email sent for ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send status update email:", error);
    throw error;
  }
}

// Test connection
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

// Bulk delivery reminders
export async function sendBulkDeliveryReminders(
  orders: IOrder[]
): Promise<void> {
  try {
    for (const order of orders) {
      await sendDeliveryReminderEmail(order);
    }
    console.log(`✅ Sent delivery reminders for ${orders.length} orders`);
  } catch (error) {
    console.error("❌ Failed to send bulk delivery reminders:", error);
    throw error;
  }
}
