// email.service.ts
import nodemailer from "nodemailer";
import { IBookingDocument } from "./booking.model";

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
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  static getEmailTemplate(
    title: string,
    content: string,
    showFooter: boolean = true
  ) {
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
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            
            /* Header */
            .email-header {
              background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${SECONDARY_COLOR});
              padding: 30px 20px;
              text-align: center;
            }
            
            .logo-container {
              margin-bottom: 20px;
            }
            
            .logo {
              max-width: 180px;
              height: auto;
            }
            
            .email-title {
              color: white;
              font-size: 28px;
              font-weight: 600;
              margin: 10px 0;
            }
            
            .email-subtitle {
              color: rgba(255, 255, 255, 0.9);
              font-size: 16px;
              font-weight: 400;
            }
            
            /* Content */
            .email-content {
              padding: 40px 30px;
            }
            
            .content-section {
              margin-bottom: 30px;
            }
            
            .section-title {
              color: ${SECONDARY_COLOR};
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #f0f0f0;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .info-item {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid ${PRIMARY_COLOR};
            }
            
            .info-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
              font-weight: 500;
            }
            
            .info-value {
              font-size: 16px;
              color: ${SECONDARY_COLOR};
              font-weight: 600;
            }
            
            /* Status Badges */
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .status-pending { background: ${WARNING_COLOR}; color: white; }
            .status-confirmed { background: ${SUCCESS_COLOR}; color: white; }
            .status-cancelled { background: ${DANGER_COLOR}; color: white; }
            .status-processing { background: #3498db; color: white; }
            .status-delivered { background: #27ae60; color: white; }
            .status-completed { background: #2ecc71; color: white; }
            
            /* Items Table */
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            
            .items-table th {
              background: #f8f9fa;
              padding: 15px;
              text-align: left;
              font-weight: 600;
              color: ${SECONDARY_COLOR};
              border-bottom: 2px solid #e9ecef;
            }
            
            .items-table td {
              padding: 15px;
              border-bottom: 1px solid #e9ecef;
            }
            
            .items-table tr:hover {
              background: #f8f9fa;
            }
            
            /* Footer */
            .email-footer {
              background: ${SECONDARY_COLOR};
              color: white;
              padding: 30px;
              text-align: center;
            }
            
            .footer-logo {
              max-width: 120px;
              margin-bottom: 20px;
            }
            
            .footer-text {
              color: rgba(255, 255, 255, 0.8);
              font-size: 14px;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            
            .contact-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin: 20px 0;
              flex-wrap: wrap;
            }
            
            .contact-item {
              display: flex;
              align-items: center;
              gap: 10px;
              color: rgba(255, 255, 255, 0.8);
              font-size: 14px;
            }
            
            .social-links {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-top: 20px;
            }
            
            .social-icon {
              width: 32px;
              height: 32px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              text-decoration: none;
              transition: background 0.3s;
            }
            
            .social-icon:hover {
              background: ${PRIMARY_COLOR};
            }
            
            .copyright {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.6);
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            /* Buttons */
            .action-button {
              display: inline-block;
              padding: 14px 28px;
              background: ${PRIMARY_COLOR};
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
              margin: 10px 5px;
              transition: background 0.3s, transform 0.2s;
            }
            
            .action-button:hover {
              background: #357abd;
              transform: translateY(-2px);
            }
            
            /* Responsive */
            @media (max-width: 600px) {
              .email-content {
                padding: 25px 20px;
              }
              
              .info-grid {
                grid-template-columns: 1fr;
              }
              
              .items-table {
                display: block;
                overflow-x: auto;
              }
              
              .contact-info {
                flex-direction: column;
                gap: 15px;
              }
              
              .email-title {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <div class="logo-container">
                <img src="${YMA_LOGO}" alt="YMA Bouncy Castle" class="logo">
              </div>
              <h1 class="email-title">${title}</h1>
              <p class="email-subtitle">YMA Bouncy Castle Rentals</p>
            </div>
            
            <div class="email-content">
              ${content}
            </div>
            
            ${
              showFooter
                ? `
            <div class="email-footer">
              <img src="${YMA_LOGO}" alt="YMA Bouncy Castle" class="footer-logo">
              
              <div class="contact-info">
                <div class="contact-item">
                  📞 <span>+44 1234 567890</span>
                </div>
                <div class="contact-item">
                  ✉️ <span>info@ymabouncycastle.com</span>
                </div>
                <div class="contact-item">
                  📍 <span>London, United Kingdom</span>
                </div>
              </div>
              
              <div class="footer-text">
                Professional Bouncy Castle Rentals for Events, Parties, and Celebrations
              </div>
              
              <div class="social-links">
                <a href="#" class="social-icon">f</a>
                <a href="#" class="social-icon">t</a>
                <a href="#" class="social-icon">ig</a>
                <a href="#" class="social-icon">in</a>
              </div>
              
              <div class="copyright">
                © ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.<br>
                VAT No: GB123 4567 89 | Company Reg: 12345678
              </div>
            </div>
            `
                : ""
            }
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
        <td>£${item.rentalFee.toFixed(2)}/day</td>
        <td>${item.totalDays} days</td>
        <td>£${(item.quantity * item.rentalFee * item.totalDays).toFixed(
          2
        )}</td>
      </tr>
    `
      )
      .join("");

    const statusClass = `status-${booking.status
      .toLowerCase()
      .replace("_", "-")}`;

    const content = `
      <div class="content-section">
        <p style="font-size: 18px; margin-bottom: 25px; color: ${SECONDARY_COLOR};">
          Dear <strong>${booking.shippingAddress.firstName}</strong>,<br>
          Thank you for booking with YMA Bouncy Castle! Your booking has been confirmed.
        </p>
      </div>

      <div class="content-section">
        <h2 class="section-title">📋 Booking Summary</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Booking Number</div>
            <div class="info-value">${booking.bookingNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Booking Date</div>
            <div class="info-value">${new Date(
              booking.createdAt!
            ).toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="status-badge ${statusClass}">${booking.status
      .replace("_", " ")
      .toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Amount</div>
            <div class="info-value" style="color: ${SUCCESS_COLOR}; font-size: 24px;">£${booking.totalAmount.toFixed(
      2
    )}</div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">🛒 Rental Items</h2>
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="content-section">
        <h2 class="section-title">📍 Delivery Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Delivery Address</div>
            <div class="info-value">
              ${booking.shippingAddress.address}<br>
              ${booking.shippingAddress.city}, ${
      booking.shippingAddress.postalCode
    }<br>
              ${booking.shippingAddress.country}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact Details</div>
            <div class="info-value">
              ${booking.shippingAddress.firstName} ${
      booking.shippingAddress.lastName
    }<br>
              📞 ${booking.shippingAddress.phone}<br>
              ✉️ ${booking.shippingAddress.email}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Rental Period</div>
            <div class="info-value">
              📅 ${new Date(booking.items[0].startDate).toLocaleDateString(
                "en-GB",
                {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              )}<br>
              📅 ${new Date(booking.items[0].endDate).toLocaleDateString(
                "en-GB",
                {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              )}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Method</div>
            <div class="info-value">
              ${booking.payment.method.replace("_", " ").toUpperCase()}<br>
              <small>Status: ${booking.payment.status}</small>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section" style="background: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 4px solid ${PRIMARY_COLOR};">
        <h3 style="color: ${SECONDARY_COLOR}; margin-bottom: 15px;">📞 What's Next?</h3>
        <p style="margin-bottom: 15px;">Our team will contact you within 24 hours to:</p>
        <ul style="margin-left: 20px; margin-bottom: 20px;">
          <li>Confirm delivery time</li>
          <li>Discuss setup requirements</li>
          <li>Review safety guidelines</li>
          <li>Answer any questions</li>
        </ul>
        <a href="tel:+441234567890" class="action-button">📞 Call Us Now</a>
        <a href="mailto:info@ymabouncycastle.com" class="action-button" style="background: ${SECONDARY_COLOR};">✉️ Email Support</a>
      </div>

      ${
        booking.customerNotes
          ? `
        <div class="content-section">
          <h3 class="section-title">📝 Your Notes</h3>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid ${WARNING_COLOR};">
            ${booking.customerNotes}
          </div>
        </div>
      `
          : ""
      }
    `;

    const html = this.getEmailTemplate("Booking Confirmed", content);
    await this.sendEmail(booking.shippingAddress.email, subject, html);
  }

  static async sendBookingStatusUpdate(booking: IBookingDocument) {
    const statusMessages: Record<string, string> = {
      confirmed: "Your booking has been confirmed and is being processed.",
      payment_completed: "Payment received! We're preparing your items.",
      processing: "Your items are being prepared for delivery.",
      ready_for_delivery: "Your items are ready for delivery!",
      out_for_delivery: "Your items are on the way!",
      delivered: "Your items have been delivered successfully.",
      cancelled: "Your booking has been cancelled.",
      completed: "Thank you for choosing YMA Bouncy Castle!",
    };

    const statusIcons: Record<string, string> = {
      confirmed: "✅",
      payment_completed: "💰",
      processing: "🔄",
      ready_for_delivery: "📦",
      out_for_delivery: "🚚",
      delivered: "🎉",
      cancelled: "❌",
      completed: "🏆",
    };

    const subject = `${
      statusIcons[booking.status] || "📋"
    } Booking Status Update - ${booking.bookingNumber}`;
    const statusClass = `status-${booking.status
      .toLowerCase()
      .replace("_", "-")}`;

    const content = `
      <div class="content-section">
        <p style="font-size: 18px; margin-bottom: 25px; color: ${SECONDARY_COLOR};">
          Dear <strong>${booking.shippingAddress.firstName}</strong>,
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div class="status-badge ${statusClass}" style="font-size: 20px; padding: 15px 30px;">
            ${statusIcons[booking.status] || "📋"} ${booking.status
      .replace("_", " ")
      .toUpperCase()}
          </div>
        </div>

        <div style="background: ${
          booking.status === "cancelled" ? "#FDEDED" : "#E8F5E9"
        }; 
                    padding: 25px; 
                    border-radius: 10px; 
                    border-left: 4px solid ${
                      booking.status === "cancelled"
                        ? DANGER_COLOR
                        : SUCCESS_COLOR
                    };
                    margin: 20px 0;">
          <h3 style="color: ${
            booking.status === "cancelled" ? DANGER_COLOR : SUCCESS_COLOR
          }; margin-bottom: 15px;">
            ${booking.status === "cancelled" ? "⚠️ " : "📢 "} 
            Status Update
          </h3>
          <p style="font-size: 16px; line-height: 1.6;">
            ${
              statusMessages[booking.status] ||
              "Your booking status has been updated."
            }
          </p>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">📋 Booking Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Booking Number</div>
            <div class="info-value">${booking.bookingNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Amount</div>
            <div class="info-value">£${booking.totalAmount.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Updated On</div>
            <div class="info-value">${new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</div>
          </div>
        </div>
      </div>

      ${
        booking.cancellationReason
          ? `
        <div class="content-section">
          <h2 class="section-title">📝 Cancellation Details</h2>
          <div style="background: #FDEDED; padding: 20px; border-radius: 8px; border-left: 4px solid ${DANGER_COLOR};">
            <p><strong>Cancellation Reason:</strong></p>
            <p>${booking.cancellationReason}</p>
          </div>
        </div>
      `
          : ""
      }

      ${
        booking.adminNotes
          ? `
        <div class="content-section">
          <h2 class="section-title">💼 Admin Notes</h2>
          <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; border-left: 4px solid ${PRIMARY_COLOR};">
            ${booking.adminNotes}
          </div>
        </div>
      `
          : ""
      }

      <div class="content-section" style="text-align: center;">
        <p style="margin-bottom: 20px; font-size: 16px;">
          Need assistance or have questions about your booking?
        </p>
        <a href="mailto:support@ymabouncycastle.com" class="action-button">✉️ Contact Support</a>
        <a href="${process.env.FRONTEND_URL || process.env.BASE_URL}/bookings/${
      booking._id
    }" 
           class="action-button" style="background: ${SECONDARY_COLOR};">
          👁️ View Booking
        </a>
      </div>
    `;

    const html = this.getEmailTemplate("Status Updated", content);
    await this.sendEmail(booking.shippingAddress.email, subject, html);
  }

  static async sendAdminNotification(
    booking: IBookingDocument,
    action: string
  ) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "";
    if (!adminEmail) {
      console.error("Admin email is not configured");
      return;
    }

    const actionIcons: Record<string, string> = {
      "New Booking Created": "🆕",
      "Booking Cancelled": "❌",
      "Payment Received": "💰",
      "Status Updated": "🔄",
    };

    const subject = `${actionIcons[action] || "📢"} ADMIN: ${action} - ${
      booking.bookingNumber
    }`;
    const statusClass = `status-${booking.status
      .toLowerCase()
      .replace("_", "-")}`;

    const content = `
      <div class="content-section">
        <div style="background: #FFF3E0; padding: 25px; border-radius: 10px; border: 2px solid ${WARNING_COLOR}; text-align: center;">
          <h2 style="color: ${WARNING_COLOR}; margin-bottom: 15px; font-size: 24px;">
            ${actionIcons[action] || "📢"} ${action.toUpperCase()}
          </h2>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Immediate attention required for this booking.
          </p>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">📋 Quick Overview</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Booking Number</div>
            <div class="info-value" style="font-size: 20px; color: ${PRIMARY_COLOR};">${
      booking.bookingNumber
    }</div>
          </div>
          <div class="info-item">
            <div class="info-label">Customer</div>
            <div class="info-value">
              ${booking.shippingAddress.firstName} ${
      booking.shippingAddress.lastName
    }
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="status-badge ${statusClass}">${booking.status
      .replace("_", " ")
      .toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Amount</div>
            <div class="info-value" style="color: ${SUCCESS_COLOR}; font-size: 24px;">£${booking.totalAmount.toFixed(
      2
    )}</div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">👤 Customer Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Contact Information</div>
            <div class="info-value">
              📧 ${booking.shippingAddress.email}<br>
              📞 ${booking.shippingAddress.phone}<br>
              📍 ${booking.shippingAddress.city}, ${
      booking.shippingAddress.country
    }
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Delivery Address</div>
            <div class="info-value">
              ${booking.shippingAddress.address}<br>
              ${booking.shippingAddress.postalCode}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Rental Period</div>
            <div class="info-value">
              From: ${new Date(
                booking.items[0].startDate
              ).toLocaleDateString()}<br>
              To: ${new Date(booking.items[0].endDate).toLocaleDateString()}<br>
              Duration: ${booking.items[0].totalDays} days
            </div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">🛒 Rental Items</h2>
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Warehouse</th>
              <th>Vendor</th>
              <th>Rental Fee</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${booking.items
              .map(
                (item) => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.quantity}</td>
                <td>${item.warehouse}</td>
                <td>${item.vendor}</td>
                <td>£${item.rentalFee.toFixed(2)}</td>
                <td>£${(
                  item.quantity *
                  item.rentalFee *
                  item.totalDays
                ).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="content-section">
        <h2 class="section-title">💼 Payment Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Method</div>
            <div class="info-value">${booking.payment.method
              .replace("_", " ")
              .toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">${booking.payment.status.toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Amount</div>
            <div class="info-value">£${booking.payment.amount.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div class="content-section" style="text-align: center;">
        <a href="${process.env.BASE_URL}/admin/bookings/${booking._id}" 
           class="action-button" style="background: ${PRIMARY_COLOR}; padding: 16px 32px; font-size: 18px;">
          ⚡ Manage This Booking
        </a>
      </div>

      ${
        booking.customerNotes
          ? `
        <div class="content-section">
          <h2 class="section-title">📝 Customer Notes</h2>
          <div style="background: #F0F8FF; padding: 20px; border-radius: 8px; border-left: 4px solid ${PRIMARY_COLOR};">
            ${booking.customerNotes}
          </div>
        </div>
      `
          : ""
      }
    `;

    const html = this.getEmailTemplate("Admin Alert", content, false);
    await this.sendEmail(adminEmail, subject, html);
  }
}

export default EmailService;
