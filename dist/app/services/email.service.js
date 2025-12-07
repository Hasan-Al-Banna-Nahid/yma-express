"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailHtml = sendEmailHtml;
exports.sendTemplatedEmail = sendTemplatedEmail;
exports.sendPlainMail = sendPlainMail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendResetSuccessEmail = sendResetSuccessEmail;
exports.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
exports.sendDeliveryReminderEmail = sendDeliveryReminderEmail;
exports.sendPreDeliveryConfirmationEmail = sendPreDeliveryConfirmationEmail;
exports.sendInvoiceEmail = sendInvoiceEmail;
exports.sendOrderWithInvoiceAttachment = sendOrderWithInvoiceAttachment;
exports.sendAdminOrderNotification = sendAdminOrderNotification;
exports.sendOrderStatusUpdateEmail = sendOrderStatusUpdateEmail;
exports.testEmailConnection = testEmailConnection;
exports.sendBulkDeliveryReminders = sendBulkDeliveryReminders;
// src/services/email.service.ts
const dotenv_1 = __importDefault(require("dotenv"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const invoice_service_1 = require("./invoice.service");
dotenv_1.default.config();
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
    console.warn("EMAIL_HOST, EMAIL_USER, and EMAIL_PASS are required for Nodemailer");
}
// Create Nodemailer transporter
const transporter = nodemailer_1.default.createTransport({
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
    }
    else {
        console.log("✅ Nodemailer transporter is ready to send emails");
    }
});
// Template resolver
function resolveEmailTemplate(templateName) {
    const candidates = [
        path_1.default.resolve(process.cwd(), "src", "views", "emails", `${templateName}.ejs`),
        path_1.default.resolve(process.cwd(), "dist", "views", "emails", `${templateName}.ejs`),
        path_1.default.resolve(__dirname, "..", "views", "emails", `${templateName}.ejs`),
    ];
    for (const templatePath of candidates) {
        if (fs_1.default.existsSync(templatePath)) {
            return templatePath;
        }
    }
    throw new Error(`Email template not found: ${templateName}.ejs`);
}
// Render EJS template
async function renderTemplate(templateName, templateVars) {
    const filePath = resolveEmailTemplate(templateName);
    return await ejs_1.default.renderFile(filePath, templateVars, { async: true });
}
async function sendEmailHtml(options) {
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
    }
    catch (error) {
        console.error("[sendEmailHtml] Nodemailer error:", {
            message: error?.message,
            code: error?.code,
        });
        throw error;
    }
}
async function sendTemplatedEmail(options) {
    const { to, subject, templateName, templateVars, fromEmail, fromName } = options;
    const html = await renderTemplate(templateName, templateVars);
    await sendEmailHtml({
        to,
        subject,
        html,
        fromEmail,
        fromName,
    });
}
async function sendPlainMail(options) {
    const { to, subject, message, senderName, senderEmail, fromEmail, fromName } = options;
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
        ${senderName || senderEmail
        ? `
        <div class="sender-info">
          <strong>Sender Information:</strong><br>
          ${senderName ? `Name: ${senderName}<br>` : ""}
          ${senderEmail ? `Email: ${senderEmail}` : ""}
        </div>
        `
        : ""}
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
async function sendPasswordResetEmail(to, name, resetURL) {
    await sendTemplatedEmail({
        to,
        subject: "Reset your YMA Bouncy Castle password (valid 10 minutes)",
        templateName: "passwordReset",
        templateVars: {
            brand: EMAIL_FROM_NAME,
            name,
            resetURL,
            preheader: "Tap the button to reset your YMA Bouncy Castle password. Link expires in 10 minutes.",
            year: new Date().getFullYear(),
            brandColor: "#7C3AED",
        },
    });
}
async function sendResetSuccessEmail(to, name) {
    await sendTemplatedEmail({
        to,
        subject: "Your YMA Bouncy Castle password was changed",
        templateName: "resetSuccess",
        templateVars: {
            brand: EMAIL_FROM_NAME,
            name,
            preheader: "This is a confirmation that your password was successfully changed.",
            year: new Date().getFullYear(),
            brandColor: "#7C3AED",
            securityNote: "If this wasn't you, please reset your password immediately and contact support.",
        },
    });
}
// Order email functions with IOrder type
async function sendOrderConfirmationEmail(order) {
    try {
        // Generate invoice HTML
        const invoiceHtml = await (0, invoice_service_1.generateInvoiceHtml)(order);
        // Render order confirmation template with invoice embedded
        const html = await renderTemplate("orderConfirmation", {
            order,
            brand: EMAIL_FROM_NAME,
            year: new Date().getFullYear(),
            brandColor: "#7C3AED",
            invoiceHtml: invoiceHtml, // Pass invoice HTML to template
        });
        await sendEmailHtml({
            to: order.shippingAddress.email,
            subject: `🎉 Order Confirmed - ${order.orderNumber}`,
            html,
        });
        console.log(`✅ Order confirmation email sent for ${order.orderNumber}`);
    }
    catch (error) {
        console.error(`❌ Failed to send order confirmation email:`, error);
        throw error;
    }
}
async function sendDeliveryReminderEmail(order) {
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
    }
    catch (error) {
        console.error(`❌ Failed to send delivery reminder email:`, error);
        throw error;
    }
}
async function sendPreDeliveryConfirmationEmail(order) {
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
        console.log(`✅ Pre-delivery confirmation email sent for ${order.orderNumber}`);
    }
    catch (error) {
        console.error(`❌ Failed to send pre-delivery confirmation email:`, error);
        throw error;
    }
}
async function sendInvoiceEmail(order, invoiceHtml) {
    try {
        // Render the invoice email template
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
    }
    catch (error) {
        console.error(`❌ Failed to send invoice email:`, error);
        throw error;
    }
}
// Send email with invoice attachment (alternative method)
async function sendOrderWithInvoiceAttachment(order) {
    try {
        // Generate invoice HTML
        const invoiceHtml = await (0, invoice_service_1.generateInvoiceHtml)(order);
        // Create a combined email with invoice embedded
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
          <p>Thank you for your order <strong>#${order.orderNumber}</strong>.</p>
          <p>Estimated Delivery: ${order.estimatedDeliveryDate.toLocaleDateString()}</p>
        </div>
        
        <div class="invoice-section">
          <h3>📄 Invoice</h3>
          ${invoiceHtml}
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 5px;">
          <p><strong>Need Help?</strong></p>
          <p>Contact us at ${EMAIL_FROM} or call +44 (0) 1234 567890</p>
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
    }
    catch (error) {
        console.error(`❌ Failed to send order with invoice:`, error);
        throw error;
    }
}
// Admin notification email
async function sendAdminOrderNotification(order, adminEmail) {
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
        <div class="alert">
          <h2>🚨 New Order Received</h2>
          <p>A new order has been placed and requires attention.</p>
        </div>
        
        <div class="order-details">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Customer:</strong> ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
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
    }
    catch (error) {
        console.error(`❌ Failed to send admin notification:`, error);
        throw error;
    }
}
// Order status update email
async function sendOrderStatusUpdateEmail(order, previousStatus) {
    try {
        const statusMessages = {
            confirmed: "has been confirmed and is being processed",
            shipped: "has been shipped and is on its way",
            delivered: "has been delivered successfully",
            cancelled: "has been cancelled",
        };
        const statusEmoji = {
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
          ${order.deliveryDate
            ? `<p><strong>Actual Delivery:</strong> ${order.deliveryDate.toLocaleDateString()}</p>`
            : ""}
          ${order.adminNotes
            ? `<p><strong>Admin Notes:</strong> ${order.adminNotes}</p>`
            : ""}
        </div>
        
        <p>If you have any questions, please contact us at ${EMAIL_FROM}</p>
      </body>
      </html>
    `;
        await sendEmailHtml({
            to: order.shippingAddress.email,
            subject: `${emoji} Order Status Update - ${order.orderNumber}`,
            html,
        });
        console.log(`✅ Status update email sent for ${order.orderNumber}`);
    }
    catch (error) {
        console.error(`❌ Failed to send status update email:`, error);
        throw error;
    }
}
// Test email function
async function testEmailConnection() {
    try {
        await transporter.verify();
        console.log("✅ Email connection test passed");
        return true;
    }
    catch (error) {
        console.error("❌ Email connection test failed:", error);
        return false;
    }
}
// Send bulk delivery reminders
async function sendBulkDeliveryReminders(orders) {
    try {
        for (const order of orders) {
            await sendDeliveryReminderEmail(order);
        }
        console.log(`✅ Sent delivery reminders for ${orders.length} orders`);
    }
    catch (error) {
        console.error(`❌ Failed to send bulk delivery reminders:`, error);
        throw error;
    }
}
