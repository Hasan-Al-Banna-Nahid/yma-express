import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

interface CustomerEmailData {
  name: string;
  email: string;
  phone: string;
  orderNumber?: string;
  orderDate?: Date;
  totalAmount?: number;
  orderDetails?: any[];
  customerSince?: Date;
  totalOrders?: number;
  totalSpent?: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Test email connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Email server connection verified");
      return true;
    } catch (error) {
      console.error("Email connection error:", error);
      return false;
    }
  }

  // Send generic email
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from:
          options.from ||
          `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(data: CustomerEmailData): Promise<boolean> {
    const html = this.generateOrderConfirmationHTML(data);
    const text = this.generateOrderConfirmationText(data);

    return this.sendEmail({
      to: data.email,
      subject: `Order Confirmation - ${data.orderNumber || "Your Order"}`,
      html,
      text,
    });
  }

  // Send customer welcome email
  async sendCustomerWelcome(data: CustomerEmailData): Promise<boolean> {
    const html = this.generateCustomerWelcomeHTML(data);
    const text = this.generateCustomerWelcomeText(data);

    return this.sendEmail({
      to: data.email,
      subject: `Welcome to YMA Bouncy Castle!`,
      html,
      text,
    });
  }

  // Send order status update
  async sendOrderStatusUpdate(
    data: CustomerEmailData,
    status: string
  ): Promise<boolean> {
    const html = this.generateOrderStatusHTML(data, status);
    const text = this.generateOrderStatusText(data, status);

    return this.sendEmail({
      to: data.email,
      subject: `Order ${status.charAt(0).toUpperCase() + status.slice(1)} - ${
        data.orderNumber
      }`,
      html,
      text,
    });
  }

  // Send customer reminder (for re-engagement)
  async sendCustomerReminder(data: CustomerEmailData): Promise<boolean> {
    const html = this.generateCustomerReminderHTML(data);
    const text = this.generateCustomerReminderText(data);

    return this.sendEmail({
      to: data.email,
      subject: `We Miss You at YMA Bouncy Castle!`,
      html,
      text,
    });
  }

  // HTML Generators
  private generateOrderConfirmationHTML(data: CustomerEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 150px; height: auto; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .order-details { margin: 20px 0; }
          .order-item { padding: 10px; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${this.logoUrl}" alt="YMA Bouncy Castle" class="logo">
            <h1>Order Confirmation</h1>
          </div>
          
          <div class="content">
            <p>Dear ${data.name},</p>
            <p>Thank you for your order! Here are your order details:</p>
            
            <div class="order-details">
              <p><strong>Order Number:</strong> ${data.orderNumber || "N/A"}</p>
              <p><strong>Order Date:</strong> ${
                data.orderDate
                  ? new Date(data.orderDate).toLocaleDateString()
                  : "N/A"
              }</p>
              <p><strong>Customer Email:</strong> ${data.email}</p>
              <p><strong>Customer Phone:</strong> ${data.phone}</p>
              
              <h3>Order Items:</h3>
              ${
                data.orderDetails
                  ? data.orderDetails
                      .map(
                        (item) => `
                <div class="order-item">
                  <p><strong>${item.name}</strong> x ${item.quantity}</p>
                  <p>£${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              `
                      )
                      .join("")
                  : "<p>No items details available</p>"
              }
              
              <p class="total">Total Amount: £${
                data.totalAmount?.toFixed(2) || "0.00"
              }</p>
            </div>
            
            <p>We'll contact you shortly to confirm delivery details.</p>
            <p>Best regards,<br>The YMA Bouncy Castle Team</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCustomerWelcomeHTML(data: CustomerEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to YMA Bouncy Castle</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 150px; height: auto; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .welcome-message { font-size: 18px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${this.logoUrl}" alt="YMA Bouncy Castle" class="logo">
            <h1>Welcome to YMA Bouncy Castle!</h1>
          </div>
          
          <div class="content">
            <p class="welcome-message">Dear ${data.name},</p>
            
            <p>Welcome to YMA Bouncy Castle! We're thrilled to have you as our valued customer.</p>
            
            <p>As a new member of our family, here's what you can expect:</p>
            <ul>
              <li>High-quality bouncy castle rentals</li>
              <li>Professional delivery and setup</li>
              <li>Excellent customer service</li>
              <li>Special offers for loyal customers</li>
            </ul>
            
            <p>You've been added to our customer database. We'll keep you updated on:</p>
            <ul>
              <li>Your order status</li>
              <li>Special promotions</li>
              <li>New products and services</li>
            </ul>
            
            <p>Thank you for choosing YMA Bouncy Castle. We look forward to serving you!</p>
            
            <p>Best regards,<br>The YMA Bouncy Castle Team</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderStatusHTML(
    data: CustomerEmailData,
    status: string
  ): string {
    const statusMap: Record<string, string> = {
      confirmed: "Confirmed",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 150px; height: auto; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .status { font-size: 20px; font-weight: bold; color: #007bff; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${this.logoUrl}" alt="YMA Bouncy Castle" class="logo">
            <h1>Order Status Update</h1>
          </div>
          
          <div class="content">
            <p>Dear ${data.name},</p>
            
            <p>Your order status has been updated:</p>
            
            <div class="status">
              Order: ${data.orderNumber || "N/A"} - ${
      statusMap[status] || status
    }
            </div>
            
            <p><strong>Customer:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phone}</p>
            <p><strong>Order Date:</strong> ${
              data.orderDate
                ? new Date(data.orderDate).toLocaleDateString()
                : "N/A"
            }</p>
            <p><strong>Total Amount:</strong> £${
              data.totalAmount?.toFixed(2) || "0.00"
            }</p>
            
            ${
              status === "delivered"
                ? `
              <p>Your order has been delivered successfully! We hope you enjoy your bouncy castle.</p>
              <p>Please let us know if you have any questions or need assistance.</p>
            `
                : ""
            }
            
            ${
              status === "cancelled"
                ? `
              <p>Your order has been cancelled. If you have any questions, please contact our customer service.</p>
            `
                : ""
            }
            
            <p>Thank you for choosing YMA Bouncy Castle!</p>
            
            <p>Best regards,<br>The YMA Bouncy Castle Team</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCustomerReminderHTML(data: CustomerEmailData): string {
    const lastOrderDate = data.orderDate ? new Date(data.orderDate) : null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor(
          (new Date().getTime() - lastOrderDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>We Miss You!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 150px; height: auto; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .stats { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 25px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${this.logoUrl}" alt="YMA Bouncy Castle" class="logo">
            <h1>We Miss You!</h1>
          </div>
          
          <div class="content">
            <p>Dear ${data.name},</p>
            
            <p>It's been a while since we last served you, and we wanted to check in!</p>
            
            <div class="stats">
              <h3>Your Customer Stats:</h3>
              <p><strong>Total Orders:</strong> ${data.totalOrders || 0}</p>
              <p><strong>Total Spent:</strong> £${
                data.totalSpent?.toFixed(2) || "0.00"
              }</p>
              <p><strong>Customer Since:</strong> ${
                data.customerSince
                  ? new Date(data.customerSince).toLocaleDateString()
                  : "Recently"
              }</p>
              ${
                lastOrderDate
                  ? `<p><strong>Last Order:</strong> ${lastOrderDate.toLocaleDateString()} (${daysSinceLastOrder} days ago)</p>`
                  : ""
              }
            </div>
            
            <p>We have some exciting new bouncy castles and special offers waiting for you!</p>
            
            <p>Why not check out our latest collection?</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.FRONTEND_URL || "https://your-frontend-url.com"
              }" class="button">
                Browse Our Collection
              </a>
            </p>
            
            <p>As a valued customer, we'd like to offer you a special discount on your next booking!</p>
            
            <p>Thank you for being part of the YMA Bouncy Castle family!</p>
            
            <p>Best regards,<br>The YMA Bouncy Castle Team</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Text generators (plain text fallbacks)
  private generateOrderConfirmationText(data: CustomerEmailData): string {
    return `
Order Confirmation - YMA Bouncy Castle

Dear ${data.name},

Thank you for your order!

Order Details:
- Order Number: ${data.orderNumber || "N/A"}
- Order Date: ${
      data.orderDate ? new Date(data.orderDate).toLocaleDateString() : "N/A"
    }
- Customer: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone}
- Total Amount: £${data.totalAmount?.toFixed(2) || "0.00"}

We'll contact you shortly to confirm delivery details.

Best regards,
The YMA Bouncy Castle Team

© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.
    `.trim();
  }

  private generateCustomerWelcomeText(data: CustomerEmailData): string {
    return `
Welcome to YMA Bouncy Castle!

Dear ${data.name},

Welcome to YMA Bouncy Castle! We're thrilled to have you as our valued customer.

As a new member of our family, you can expect:
- High-quality bouncy castle rentals
- Professional delivery and setup
- Excellent customer service
- Special offers for loyal customers

Thank you for choosing YMA Bouncy Castle. We look forward to serving you!

Best regards,
The YMA Bouncy Castle Team

© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.
    `.trim();
  }

  private generateOrderStatusText(
    data: CustomerEmailData,
    status: string
  ): string {
    return `
Order Status Update - YMA Bouncy Castle

Dear ${data.name},

Your order status has been updated.

Order: ${data.orderNumber || "N/A"} - ${status.toUpperCase()}

Customer: ${data.name}
Email: ${data.email}
Phone: ${data.phone}
Order Date: ${
      data.orderDate ? new Date(data.orderDate).toLocaleDateString() : "N/A"
    }
Total Amount: £${data.totalAmount?.toFixed(2) || "0.00"}

Thank you for choosing YMA Bouncy Castle!

Best regards,
The YMA Bouncy Castle Team

© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.
    `.trim();
  }

  private generateCustomerReminderText(data: CustomerEmailData): string {
    return `
We Miss You at YMA Bouncy Castle!

Dear ${data.name},

It's been a while since we last served you, and we wanted to check in!

Your Customer Stats:
- Total Orders: ${data.totalOrders || 0}
- Total Spent: £${data.totalSpent?.toFixed(2) || "0.00"}
- Customer Since: ${
      data.customerSince
        ? new Date(data.customerSince).toLocaleDateString()
        : "Recently"
    }

We have some exciting new bouncy castles and special offers waiting for you!

Visit our website to see our latest collection: ${
      process.env.FRONTEND_URL || "https://your-frontend-url.com"
    }

As a valued customer, we'd like to offer you a special discount on your next booking!

Thank you for being part of the YMA Bouncy Castle family!

Best regards,
The YMA Bouncy Castle Team

© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.
    `.trim();
  }
}

// Create singleton instance
export const emailService = new EmailService();
