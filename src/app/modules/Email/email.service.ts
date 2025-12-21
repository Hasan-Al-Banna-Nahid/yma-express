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
  | "invoice"
  | "bookingConfirmation";
// Import the Booking interface
import { IBookingDocument } from "../Bookings/booking.model";

// ... existing imports and code ...

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(booking: IBookingDocument) {
  try {
    // Get user details
    const user = await booking.populate("user", "name email phone");

    const html = await renderTemplate("bookingConfirmation", {
      booking,
      user,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      bookingNumber: booking.bookingNumber,
      customerName: `${booking.shippingAddress.firstName} ${booking.shippingAddress.lastName}`,
      totalAmount: booking.totalAmount.toFixed(2),
      paymentMethod: booking.payment.method,
      estimatedDeliveryDate: booking.estimatedDeliveryDate?.toLocaleDateString(
        "en-GB",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      ),
      estimatedCollectionDate:
        booking.estimatedCollectionDate?.toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      items: booking.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        totalDays: item.totalDays,
        total: (item.quantity * item.price * item.totalDays).toFixed(2),
        startDate: item.startDate.toLocaleDateString("en-GB"),
        endDate: item.endDate.toLocaleDateString("en-GB"),
      })),
      subtotal: booking.subTotal.toFixed(2),
      tax: booking.taxAmount.toFixed(2),
      deliveryFee: booking.deliveryFee.toFixed(2),
      securityDeposit: booking.securityDeposit?.toFixed(2) || "0.00",
    });

    await sendEmailHtml({
      to: booking.shippingAddress.email,
      subject: `🎉 Booking Confirmed - ${booking.bookingNumber}`,
      html,
    });

    console.log(
      `✅ Booking confirmation email sent for ${booking.bookingNumber}`
    );
  } catch (error) {
    console.error("❌ Failed to send booking confirmation email:", error);
    throw error;
  }
}

/**
 * Send booking status update email
 */
export async function sendBookingStatusUpdateEmail(booking: IBookingDocument) {
  try {
    const statusMessages: Record<
      string,
      { subject: string; message: string; emoji: string }
    > = {
      pending: {
        subject: "⏳ Booking Received",
        message: "Your booking has been received and is pending confirmation.",
        emoji: "⏳",
      },
      confirmed: {
        subject: "✅ Booking Confirmed",
        message: "Your booking has been confirmed and is now being processed.",
        emoji: "✅",
      },
      payment_pending: {
        subject: "💰 Payment Required",
        message: "Payment is required to proceed with your booking.",
        emoji: "💰",
      },
      payment_completed: {
        subject: "✅ Payment Received",
        message: "Payment has been received successfully.",
        emoji: "✅",
      },
      processing: {
        subject: "⚙️ Processing Booking",
        message: "Your booking is being processed and prepared.",
        emoji: "⚙️",
      },
      ready_for_delivery: {
        subject: "📦 Ready for Delivery",
        message: "Your items are ready and scheduled for delivery.",
        emoji: "📦",
      },
      out_for_delivery: {
        subject: "🚚 Out for Delivery",
        message: "Your items are currently out for delivery.",
        emoji: "🚚",
      },
      delivered: {
        subject: "🎉 Delivery Complete",
        message: "Your items have been delivered successfully.",
        emoji: "🎉",
      },
      ready_for_collection: {
        subject: "🔄 Ready for Collection",
        message: "Your items are ready for collection.",
        emoji: "🔄",
      },
      collected: {
        subject: "✅ Collection Complete",
        message: "Your items have been collected successfully.",
        emoji: "✅",
      },
      completed: {
        subject: "🎊 Booking Completed",
        message: "Your booking has been completed successfully.",
        emoji: "🎊",
      },
      cancelled: {
        subject: "❌ Booking Cancelled",
        message: "Your booking has been cancelled.",
        emoji: "❌",
      },
      refunded: {
        subject: "💸 Refund Processed",
        message: "Your refund has been processed successfully.",
        emoji: "💸",
      },
    };

    const statusInfo = statusMessages[booking.status] || {
      subject: "📝 Booking Status Updated",
      message: `Your booking status has been updated to ${booking.status}.`,
      emoji: "📝",
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #7C3AED;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .status-badge {
            display: inline-block;
            background: #e3f2fd;
            color: #1565c0;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            margin: 20px 0;
          }
          .booking-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #7C3AED;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
            text-align: center;
          }
          .button {
            display: inline-block;
            background: #7C3AED;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th, .items-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .items-table th {
            background: #f5f5f5;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${statusInfo.emoji} ${statusInfo.subject}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${booking.shippingAddress.firstName},</p>
          
          <p>${statusInfo.message}</p>
          
          <div class="status-badge">
            Status: ${booking.status.toUpperCase()}
          </div>
          
          <div class="booking-details">
            <h3>📋 Booking Details</h3>
            <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
            <p><strong>Booking Date:</strong> ${booking.createdAt?.toLocaleDateString(
              "en-GB",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}</p>
            
            ${
              booking.estimatedDeliveryDate
                ? `
              <p><strong>Estimated Delivery:</strong> ${booking.estimatedDeliveryDate.toLocaleDateString(
                "en-GB",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</p>
            `
                : ""
            }
            
            ${
              booking.estimatedCollectionDate
                ? `
              <p><strong>Estimated Collection:</strong> ${booking.estimatedCollectionDate.toLocaleDateString(
                "en-GB",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</p>
            `
                : ""
            }
            
            <p><strong>Total Amount:</strong> £${booking.totalAmount.toFixed(
              2
            )}</p>
            <p><strong>Payment Method:</strong> ${booking.payment.method
              .replace(/_/g, " ")
              .toUpperCase()}</p>
            <p><strong>Payment Status:</strong> ${booking.payment.status.toUpperCase()}</p>
          </div>
          
          ${
            booking.items.length > 0
              ? `
            <h3>📦 Booked Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${booking.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.totalDays} day${
                      item.totalDays > 1 ? "s" : ""
                    }<br>
                        <small>${item.startDate.toLocaleDateString(
                          "en-GB"
                        )} - ${item.endDate.toLocaleDateString("en-GB")}</small>
                    </td>
                    <td>£${item.price.toFixed(2)}/day</td>
                    <td>£${(
                      item.quantity *
                      item.price *
                      item.totalDays
                    ).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          `
              : ""
          }
          
          ${
            booking.adminNotes
              ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h4>📝 Admin Notes</h4>
              <p>${booking.adminNotes}</p>
            </div>
          `
              : ""
          }
          
          ${
            booking.cancellationReason
              ? `
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h4>❌ Cancellation Reason</h4>
              <p>${booking.cancellationReason}</p>
            </div>
          `
              : ""
          }
          
          ${
            booking.status === "cancelled" && booking.refundAmount
              ? `
            <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c5460;">
              <h4>💸 Refund Information</h4>
              <p><strong>Refund Amount:</strong> £${booking.refundAmount.toFixed(
                2
              )}</p>
              <p><strong>Refund Date:</strong> ${
                booking.refundedAt?.toLocaleDateString("en-GB") || "Processing"
              }</p>
            </div>
          `
              : ""
          }
          
          <a href="${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/bookings/${booking._id}" class="button">
            View Booking Details
          </a>
          
          <p>If you have any questions, please contact our support team at ${EMAIL_FROM}</p>
          
          <p>Best regards,<br>The ${EMAIL_FROM_NAME} Team</p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${EMAIL_FROM_NAME}. All rights reserved.</p>
          <p>This email was sent to ${booking.shippingAddress.email}</p>
        </div>
      </body>
      </html>
    `;

    await sendEmailHtml({
      to: booking.shippingAddress.email,
      subject: `${statusInfo.emoji} ${statusInfo.subject} - ${booking.bookingNumber}`,
      html,
    });

    console.log(
      `✅ Booking status update email sent for ${booking.bookingNumber}`
    );
  } catch (error) {
    console.error("❌ Failed to send booking status update email:", error);
    throw error;
  }
}

/**
 * Send booking reminder email (24 hours before delivery)
 */
export async function sendBookingDeliveryReminder(booking: IBookingDocument) {
  try {
    if (!booking.estimatedDeliveryDate) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .reminder-box {
            background: #e8f5e9;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .details-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
          }
          .button {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚚 Delivery Reminder</h1>
        </div>
        
        <div class="content">
          <p>Dear ${booking.shippingAddress.firstName},</p>
          
          <div class="reminder-box">
            <h2>⏰ Your Delivery is Scheduled for Tomorrow!</h2>
            <p>Please ensure someone will be available at the delivery address during the specified time window.</p>
          </div>
          
          <div class="details-box">
            <h3>📋 Delivery Information</h3>
            <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
            <p><strong>Delivery Date:</strong> ${booking.estimatedDeliveryDate.toLocaleDateString(
              "en-GB",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}</p>
            ${
              booking.shippingAddress.deliveryTime
                ? `
              <p><strong>Delivery Time Window:</strong> ${booking.shippingAddress.deliveryTime}</p>
            `
                : ""
            }
            <p><strong>Delivery Address:</strong><br>
              ${booking.shippingAddress.street}<br>
              ${
                booking.shippingAddress.apartment
                  ? `${booking.shippingAddress.apartment},<br>`
                  : ""
              }
              ${booking.shippingAddress.city}<br>
              ${booking.shippingAddress.zipCode}<br>
              ${booking.shippingAddress.country}
            </p>
            
            ${
              booking.shippingAddress.locationAccessibility
                ? `
              <p><strong>Location Accessibility:</strong> ${booking.shippingAddress.locationAccessibility}</p>
            `
                : ""
            }
            
            ${
              booking.shippingAddress.floorType
                ? `
              <p><strong>Floor Type:</strong> ${booking.shippingAddress.floorType}</p>
            `
                : ""
            }
            
            ${
              booking.shippingAddress.notes
                ? `
              <p><strong>Special Instructions:</strong> ${booking.shippingAddress.notes}</p>
            `
                : ""
            }
          </div>
          
          <div class="details-box">
            <h3>📦 Items to be Delivered</h3>
            <ul>
              ${booking.items
                .map(
                  (item) => `
                <li><strong>${item.name}</strong> (x${item.quantity})</li>
              `
                )
                .join("")}
            </ul>
          </div>
          
          <h3>📞 Important Notes</h3>
          <ul>
            <li>Please ensure clear access to the delivery location</li>
            <li>Have your ID ready for verification</li>
            <li>Inspect items upon delivery</li>
            <li>Contact us immediately if there are any issues</li>
          </ul>
          
          <a href="${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/bookings/${booking._id}" class="button">
            View Full Booking Details
          </a>
          
          <p>If you need to make changes to your delivery, please contact us immediately at ${EMAIL_FROM}</p>
          
          <p>Best regards,<br>The ${EMAIL_FROM_NAME} Team</p>
        </div>
      </body>
      </html>
    `;

    await sendEmailHtml({
      to: booking.shippingAddress.email,
      subject: `🚚 Delivery Reminder - Booking ${booking.bookingNumber}`,
      html,
    });

    console.log(`✅ Delivery reminder email sent for ${booking.bookingNumber}`);
  } catch (error) {
    console.error("❌ Failed to send delivery reminder email:", error);
    throw error;
  }
}

/**
 * Send booking collection reminder (24 hours before collection)
 */
export async function sendBookingCollectionReminder(booking: IBookingDocument) {
  try {
    if (!booking.estimatedCollectionDate) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #FF9800;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .reminder-box {
            background: #fff3e0;
            border: 2px solid #FF9800;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .details-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #FF9800;
          }
          .button {
            display: inline-block;
            background: #FF9800;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .checklist {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔄 Collection Reminder</h1>
        </div>
        
        <div class="content">
          <p>Dear ${booking.shippingAddress.firstName},</p>
          
          <div class="reminder-box">
            <h2>⏰ Collection Scheduled for Tomorrow!</h2>
            <p>Our team will arrive to collect the rented items. Please ensure everything is ready.</p>
          </div>
          
          <div class="details-box">
            <h3>📋 Collection Information</h3>
            <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
            <p><strong>Collection Date:</strong> ${booking.estimatedCollectionDate.toLocaleDateString(
              "en-GB",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}</p>
            ${
              booking.shippingAddress.collectionTime
                ? `
              <p><strong>Collection Time Window:</strong> ${booking.shippingAddress.collectionTime}</p>
            `
                : ""
            }
            <p><strong>Collection Address:</strong><br>
              ${booking.shippingAddress.street}<br>
              ${
                booking.shippingAddress.apartment
                  ? `${booking.shippingAddress.apartment},<br>`
                  : ""
              }
              ${booking.shippingAddress.city}<br>
              ${booking.shippingAddress.zipCode}<br>
              ${booking.shippingAddress.country}
            </p>
          </div>
          
          <div class="checklist">
            <h3>✅ Pre-Collection Checklist</h3>
            <ul>
              <li>Ensure all items are clean and dry</li>
              <li>Have all accessories and parts ready</li>
              <li>Items should be deflated (if applicable)</li>
              <li>Ensure clear access for our collection team</li>
              <li>Have your ID ready for verification</li>
              <li>Be present during the collection</li>
            </ul>
          </div>
          
          <div class="details-box">
            <h3>📦 Items to be Collected</h3>
            <ul>
              ${booking.items
                .map(
                  (item) => `
                <li><strong>${item.name}</strong> (x${item.quantity})</li>
              `
                )
                .join("")}
            </ul>
          </div>
          
          <h3>💼 Return Conditions</h3>
          <ul>
            <li>Items should be in the same condition as when delivered</li>
            <li>All parts and accessories must be returned</li>
            <li>Any damage or missing items will incur additional charges</li>
            <li>Security deposit will be refunded after inspection</li>
          </ul>
          
          <a href="${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/bookings/${booking._id}" class="button">
            View Booking Details
          </a>
          
          <p>If you need to reschedule or have questions, contact us immediately at ${EMAIL_FROM}</p>
          
          <p>Best regards,<br>The ${EMAIL_FROM_NAME} Team</p>
        </div>
      </body>
      </html>
    `;

    await sendEmailHtml({
      to: booking.shippingAddress.email,
      subject: `🔄 Collection Reminder - Booking ${booking.bookingNumber}`,
      html,
    });

    console.log(
      `✅ Collection reminder email sent for ${booking.bookingNumber}`
    );
  } catch (error) {
    console.error("❌ Failed to send collection reminder email:", error);
    throw error;
  }
}

/**
 * Send booking invoice email
 */
export async function sendBookingInvoiceEmail(booking: IBookingDocument) {
  try {
    const html = await renderTemplate("bookingConfirmation", {
      booking,
      brand: EMAIL_FROM_NAME,
      year: new Date().getFullYear(),
      brandColor: "#7C3AED",
      invoiceDate: new Date().toLocaleDateString("en-GB"),
      dueDate: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-GB"), // 30 days from now
      items: booking.items.map((item) => ({
        description: `${item.name} (${item.totalDays} day${
          item.totalDays > 1 ? "s" : ""
        })`,
        quantity: item.quantity,
        unitPrice: item.price.toFixed(2),
        total: (item.quantity * item.price * item.totalDays).toFixed(2),
      })),
      subtotal: booking.subTotal.toFixed(2),
      tax: booking.taxAmount.toFixed(2),
      deliveryFee: booking.deliveryFee.toFixed(2),
      securityDeposit: booking.securityDeposit?.toFixed(2) || "0.00",
      totalAmount: booking.totalAmount.toFixed(2),
    });

    await sendEmailHtml({
      to: booking.shippingAddress.email,
      subject: `📄 Invoice - ${booking.bookingNumber}`,
      html,
    });

    console.log(`✅ Invoice email sent for ${booking.bookingNumber}`);
  } catch (error) {
    console.error("❌ Failed to send booking invoice email:", error);
    throw error;
  }
}

/**
 * Send booking cancellation email with refund details
 */
export async function sendBookingCancellationEmail(
  booking: IBookingDocument,
  refundDetails?: {
    amount: number;
    method: string;
    estimatedDate: Date;
  }
) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #dc3545;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .refund-box {
            background: #d4edda;
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .details-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #dc3545;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>❌ Booking Cancelled</h1>
        </div>
        
        <div class="content">
          <p>Dear ${booking.shippingAddress.firstName},</p>
          
          <p>Your booking <strong>${
            booking.bookingNumber
          }</strong> has been cancelled as requested.</p>
          
          ${
            booking.cancellationReason
              ? `
            <div class="details-box">
              <h3>Cancellation Reason</h3>
              <p>${booking.cancellationReason}</p>
            </div>
          `
              : ""
          }
          
          ${
            refundDetails
              ? `
            <div class="refund-box">
              <h2>💸 Refund Initiated</h2>
              <p><strong>Refund Amount:</strong> £${refundDetails.amount.toFixed(
                2
              )}</p>
              <p><strong>Refund Method:</strong> ${refundDetails.method}</p>
              <p><strong>Estimated Refund Date:</strong> ${refundDetails.estimatedDate.toLocaleDateString(
                "en-GB"
              )}</p>
              <p><em>Refunds typically take 3-5 business days to process.</em></p>
            </div>
          `
              : booking.refundAmount
              ? `
            <div class="refund-box">
              <h2>💸 Refund Processed</h2>
              <p><strong>Refund Amount:</strong> £${booking.refundAmount.toFixed(
                2
              )}</p>
              <p><strong>Refund Date:</strong> ${
                booking.refundedAt?.toLocaleDateString("en-GB") || "Recently"
              }</p>
            </div>
          `
              : ""
          }
          
          <div class="details-box">
            <h3>Booking Details</h3>
            <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
            <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString(
              "en-GB"
            )}</p>
            <p><strong>Original Total:</strong> £${booking.totalAmount.toFixed(
              2
            )}</p>
          </div>
          
          <p>If you have any questions about your cancellation or refund, please contact us at ${EMAIL_FROM}</p>
          
          <p>We hope to serve you again in the future.</p>
          
          <p>Best regards,<br>The ${EMAIL_FROM_NAME} Team</p>
        </div>
      </body>
      </html>
    `;

    await sendEmailHtml({
      to: booking.shippingAddress.email,
      subject: `❌ Booking Cancelled - ${booking.bookingNumber}`,
      html,
    });

    console.log(`✅ Cancellation email sent for ${booking.bookingNumber}`);
  } catch (error) {
    console.error("❌ Failed to send booking cancellation email:", error);
    throw error;
  }
}
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
