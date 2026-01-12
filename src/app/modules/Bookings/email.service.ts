import nodemailer from "nodemailer";
import { IBookingDocument } from "./booking.model";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const YMA_LOGO =
  "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";
const PRIMARY_COLOR = "#4A90E2";
const SECONDARY_COLOR = "#2C3E50";
const SUCCESS_COLOR = "#27AE60";
const WARNING_COLOR = "#F39C12";
const DANGER_COLOR = "#E74C3C";

export class EmailService {
  static async sendEmail(to: string, subject: string, html: string) {
    try {
      await transporter.sendMail({
        from: `"YMA Bouncy Castle" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("Email error:", error);
    }
  }

  static getEmailTemplate(title: string, content: string) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          /* Base Styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
            margin: 0;
            padding: 0;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }
          
          /* Header */
          .email-header {
            background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${SECONDARY_COLOR});
            padding: 30px 20px;
            text-align: center;
          }
          
          .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 15px;
          }
          
          .email-title {
            color: white;
            font-size: 24px;
            font-weight: 600;
            margin: 10px 0;
          }
          
          /* Content */
          .email-content {
            padding: 30px;
          }
          
          .section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid ${PRIMARY_COLOR};
          }
          
          .section-title {
            color: ${SECONDARY_COLOR};
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
          }
          
          /* Table Styles */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .items-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: ${SECONDARY_COLOR};
            border-bottom: 2px solid #e9ecef;
          }
          
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
          }
          
          .items-table tr:hover {
            background: #f8f9fa;
          }
          
          /* Status Badges */
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            color: white;
          }
          
          .status-pending { background: ${WARNING_COLOR}; }
          .status-confirmed { background: ${SUCCESS_COLOR}; }
          .status-cancelled { background: ${DANGER_COLOR}; }
          .status-completed { background: #2ecc71; }
          
          /* Footer */
          .email-footer {
            background: ${SECONDARY_COLOR};
            color: white;
            padding: 25px;
            text-align: center;
          }
          
          .footer-logo {
            max-width: 150px;
            margin-bottom: 15px;
          }
          
          .contact-info {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
            flex-wrap: wrap;
          }
          
          .contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.9);
          }
          
          .copyright {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          /* Responsive */
          @media (max-width: 600px) {
            .email-content {
              padding: 20px;
            }
            
            .items-table {
              display: block;
              overflow-x: auto;
            }
            
            .contact-info {
              flex-direction: column;
              gap: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <img src="${YMA_LOGO}" alt="YMA Bouncy Castle" class="logo">
            <h1 class="email-title">${title}</h1>
          </div>
          
          <div class="email-content">
            ${content}
          </div>
          
          <div class="email-footer">
            <img src="${YMA_LOGO}" alt="YMA Bouncy Castle" class="footer-logo">
            
            <div class="contact-info">
              <div class="contact-item">📞 +44 1234 567890</div>
              <div class="contact-item">✉️ info@ymabouncycastle.com</div>
              <div class="contact-item">📍 London, United Kingdom</div>
            </div>
            
            <div class="copyright">
              © ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.<br>
              Professional Bouncy Castle Rentals
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async sendBookingConfirmation(booking: IBookingDocument) {
    const subject = `🎉 Booking Confirmed - ${booking.bookingNumber}`;

    const itemsHtml = booking.items
      .map(
        (item) => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td>${item.quantity}</td>
        <td>€${item.rentalFee.toFixed(2)}/day</td>
        <td>${item.totalDays} days</td>
        <td>€${(item.quantity * item.rentalFee * item.totalDays).toFixed(
          2
        )}</td>
      </tr>
    `
      )
      .join("");

    const statusClass = `status-${booking.status}`;

    const content = `
      <div class="section">
        <h2 class="section-title">📋 Booking Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          <div>
            <div style="color: #666; font-size: 14px;">Booking Number</div>
            <div style="font-size: 18px; font-weight: 600; color: ${PRIMARY_COLOR};">${
      booking.bookingNumber
    }</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Booking Date</div>
            <div style="font-size: 16px;">${new Date(
              booking.createdAt!
            ).toLocaleDateString("en-GB", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Status</div>
            <div class="status-badge ${statusClass}">${booking.status.toUpperCase()}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Total Amount</div>
            <div style="font-size: 24px; font-weight: 700; color: ${SUCCESS_COLOR};">€${booking.totalAmount.toFixed(
      2
    )}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">👤 Customer Information</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
          <div>
            <div style="color: #666; font-size: 14px;">Customer Name</div>
            <div style="font-size: 16px; font-weight: 600;">${
              booking.shippingAddress.firstName
            } ${booking.shippingAddress.lastName}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Contact</div>
            <div style="font-size: 16px;">📧 ${
              booking.shippingAddress.email
            }</div>
            <div style="font-size: 16px;">📞 ${
              booking.shippingAddress.phone
            }</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Delivery Address</div>
            <div style="font-size: 16px;">
              ${booking.shippingAddress.address}<br>
              ${booking.shippingAddress.city}, ${
      booking.shippingAddress.postalCode
    }<br>
              ${booking.shippingAddress.country}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">🛒 Rental Items</h2>
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Daily Rate</th>
              <th>Duration</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2 class="section-title">💰 Payment Details</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
            <div style="color: #666; font-size: 14px;">Subtotal</div>
            <div style="font-size: 18px; font-weight: 600;">€${booking.subTotal.toFixed(
              2
            )}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Delivery Fee</div>
            <div style="font-size: 18px;">
              €${booking.deliveryFee.toFixed(2)}
              ${
                booking.shippingAddress.deliveryTime
                  ? `<br><small>(${booking.shippingAddress.deliveryTime})</small>`
                  : ""
              }
            </div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Collection Fee</div>
            <div style="font-size: 18px;">
              €${booking.collectionFee.toFixed(2)}
              ${
                booking.shippingAddress.collectionTime
                  ? `<br><small>(${booking.shippingAddress.collectionTime})</small>`
                  : ""
              }
            </div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Payment Method</div>
            <div style="font-size: 16px; font-weight: 600; text-transform: uppercase;">
              ${booking.payment.method.replace("_", " ")}
            </div>
          </div>
        </div>
      </div>

      ${
        booking.customerNotes
          ? `
      <div class="section" style="background: #fff3cd; border-left: 4px solid ${WARNING_COLOR};">
        <h2 class="section-title">📝 Customer Notes</h2>
        <p style="font-size: 16px; line-height: 1.6;">${booking.customerNotes}</p>
      </div>
      `
          : ""
      }

      ${
        booking.bankDetails
          ? `
      <div class="section" style="background: #e8f4fd; border-left: 4px solid ${PRIMARY_COLOR};">
        <h2 class="section-title">🏦 Bank Transfer Details</h2>
        <div style="font-family: monospace; font-size: 14px; background: white; padding: 15px; border-radius: 5px;">
          ${booking.bankDetails.replace(/, /g, "<br>")}
        </div>
      </div>
      `
          : ""
      }

      <div class="section" style="background: #e8f6ef; border-left: 4px solid ${SUCCESS_COLOR}; text-align: center;">
        <h2 class="section-title">📞 What's Next?</h2>
        <p style="margin-bottom: 15px; font-size: 16px;">Our team will contact you within 24 hours to confirm delivery details.</p>
        <p style="font-size: 14px; color: #666;">Need immediate assistance? Call us at +44 1234 567890</p>
      </div>
    `;

    const html = this.getEmailTemplate("Booking Confirmation", content);
    await this.sendEmail(booking.shippingAddress.email, subject, html);
  }

  static async sendBookingStatusUpdate(booking: IBookingDocument) {
    const statusIcons = {
      confirmed: "✅",
      processing: "🔄",
      ready_for_delivery: "📦",
      out_for_delivery: "🚚",
      delivered: "🎉",
      cancelled: "❌",
      completed: "🏆",
    };

    const icon =
      statusIcons[booking.status as keyof typeof statusIcons] || "📋";
    const subject = `${icon} Status Update - ${booking.bookingNumber}`;
    const statusClass = `status-${booking.status}`;

    const content = `
      <div class="section" style="text-align: center; background: ${
        booking.status === "cancelled" ? "#fde8e8" : "#e8f6ef"
      }; border-left: 4px solid ${
      booking.status === "cancelled" ? DANGER_COLOR : SUCCESS_COLOR
    };">
        <div class="status-badge ${statusClass}" style="font-size: 20px; padding: 15px 30px; margin-bottom: 15px;">
          ${icon} ${booking.status.replace("_", " ").toUpperCase()}
        </div>
        <h2 style="color: ${
          booking.status === "cancelled" ? DANGER_COLOR : SUCCESS_COLOR
        };">Booking Status Updated</h2>
      </div>

      <div class="section">
        <h2 class="section-title">📋 Booking Details</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
            <div style="color: #666; font-size: 14px;">Booking Number</div>
            <div style="font-size: 18px; font-weight: 600;">${
              booking.bookingNumber
            }</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Customer</div>
            <div style="font-size: 16px;">${
              booking.shippingAddress.firstName
            } ${booking.shippingAddress.lastName}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Total Amount</div>
            <div style="font-size: 18px; font-weight: 600;">€${booking.totalAmount.toFixed(
              2
            )}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Updated On</div>
            <div style="font-size: 16px;">${new Date().toLocaleDateString(
              "en-GB",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}</div>
          </div>
        </div>
      </div>

      ${
        booking.cancellationReason
          ? `
      <div class="section" style="background: #fde8e8; border-left: 4px solid ${DANGER_COLOR};">
        <h2 class="section-title">📝 Cancellation Details</h2>
        <p><strong>Reason:</strong></p>
        <p style="margin-top: 10px;">${booking.cancellationReason}</p>
      </div>
      `
          : ""
      }

      ${
        booking.adminNotes
          ? `
      <div class="section" style="background: #e8f4fd; border-left: 4px solid ${PRIMARY_COLOR};">
        <h2 class="section-title">💼 Admin Notes</h2>
        <p>${booking.adminNotes}</p>
      </div>
      `
          : ""
      }

      <div class="section" style="text-align: center;">
        <p style="margin-bottom: 20px; font-size: 16px;">Need assistance with your booking?</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <a href="mailto:support@ymabouncycastle.com" style="background: ${PRIMARY_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 600;">✉️ Contact Support</a>
        </div>
      </div>
    `;

    const html = this.getEmailTemplate("Status Update", content);
    await this.sendEmail(booking.shippingAddress.email, subject, html);
  }

  static async sendAdminNotification(
    booking: IBookingDocument,
    action: string
  ) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
    if (!adminEmail) return;

    const actionIcons = {
      "New Booking Created": "🆕",
      "Booking Cancelled": "❌",
      "Payment Received": "💰",
      "Status Updated": "🔄",
    };

    const icon = actionIcons[action as keyof typeof actionIcons] || "📢";
    const subject = `${icon} ADMIN: ${action} - ${booking.bookingNumber}`;

    const itemsList = booking.items
      .map(
        (item) =>
          `<li>${item.name} x ${item.quantity} (${item.totalDays} days)</li>`
      )
      .join("");

    const content = `
      <div class="section" style="background: #fff3cd; border: 2px solid ${WARNING_COLOR}; text-align: center;">
        <h1 style="color: ${WARNING_COLOR}; margin-bottom: 10px; font-size: 24px;">
          ${icon} ${action.toUpperCase()}
        </h1>
        <p style="font-size: 16px; font-weight: 600;">Immediate attention required</p>
      </div>

      <div class="section">
        <h2 class="section-title">📊 Quick Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
            <div style="color: #666; font-size: 14px;">Booking Number</div>
            <div style="font-size: 20px; font-weight: 700; color: ${PRIMARY_COLOR};">${
      booking.bookingNumber
    }</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Customer</div>
            <div style="font-size: 18px; font-weight: 600;">${
              booking.shippingAddress.firstName
            } ${booking.shippingAddress.lastName}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Total Amount</div>
            <div style="font-size: 24px; font-weight: 700; color: ${SUCCESS_COLOR};">€${booking.totalAmount.toFixed(
      2
    )}</div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Status</div>
            <div class="status-badge status-${
              booking.status
            }">${booking.status.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">👤 Customer Details</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
          <div>
            <div style="color: #666; font-size: 14px;">Contact Information</div>
            <div style="font-size: 16px;">
              📧 ${booking.shippingAddress.email}<br>
              📞 ${booking.shippingAddress.phone}
            </div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Delivery Address</div>
            <div style="font-size: 16px;">
              ${booking.shippingAddress.address}<br>
              ${booking.shippingAddress.city}, ${
      booking.shippingAddress.postalCode
    }
            </div>
          </div>
          <div>
            <div style="color: #666; font-size: 14px;">Rental Period</div>
            <div style="font-size: 16px;">
              📅 ${new Date(
                booking.items[0].startDate
              ).toLocaleDateString()}<br>
              📅 ${new Date(booking.items[0].endDate).toLocaleDateString()}<br>
              ⏱️ ${booking.items[0].totalDays} days
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">🛒 Items (${booking.items.length})</h2>
        <ul style="list-style: none; padding-left: 0;">
          ${itemsList}
        </ul>
      </div>

      ${
        booking.bankDetails
          ? `
      <div class="section">
        <h2 class="section-title">🏦 Bank Details</h2>
        <div style="font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 5px;">
          ${booking.bankDetails}
        </div>
      </div>
      `
          : ""
      }

      ${
        booking.customerNotes
          ? `
      <div class="section">
        <h2 class="section-title">📝 Customer Notes</h2>
        <p style="background: #f0f8ff; padding: 15px; border-radius: 5px;">${booking.customerNotes}</p>
      </div>
      `
          : ""
      }

      <div class="section" style="text-align: center;">
        <p style="margin-bottom: 20px; font-size: 16px;">Action Required</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <a href="${process.env.FRONTEND_URL}/admin/bookings/${
      booking._id
    }" style="background: ${PRIMARY_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 600;">⚡ Manage Booking</a>
        </div>
      </div>
    `;

    const html = this.getEmailTemplate("Admin Alert", content);
    await this.sendEmail(adminEmail, subject, html);
  }
}

export default EmailService;
