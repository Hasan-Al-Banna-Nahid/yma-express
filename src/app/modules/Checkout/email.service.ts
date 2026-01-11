// src/services/checkout/email.service.ts
import nodemailer from "nodemailer";
import { IOrderDocument } from "../../modules/Order/order.interface";
import dotenv from "dotenv";
dotenv.config();
// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Verify connection
createTransporter().verify((error) => {
  if (error) {
    console.error("❌ Email connection failed:", error);
  } else {
    console.log("✅ Email server is ready");
  }
});

// Helper functions
const formatCurrency = (amount: number): string => {
  return `£${amount.toFixed(2)}`;
};

const formatDate = (date?: Date | string): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (date?: Date | string): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format delivery time
const formatDeliveryTime = (value: string): string => {
  const timeMap: Record<string, string> = {
    "8am-12pm": "8:00 AM - 12:00 PM",
    "12pm-4pm": "12:00 PM - 4:00 PM",
    "4pm-8pm": "4:00 PM - 8:00 PM",
    after_8pm: "After 8:00 PM",
  };
  return timeMap[value] || value;
};

// Format collection time
const formatCollectionTime = (value: string): string => {
  const timeMap: Record<string, string> = {
    before_5pm: "Before 5:00 PM",
    after_5pm: "After 5:00 PM",
    next_day: "Next Day",
  };
  return timeMap[value] || value;
};

// White logo URL
const WHITE_LOGO_URL =
  "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";
const COLOR_LOGO_URL =
  "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png"; // Replace with colored logo if available

// Common email footer
const getEmailFooter = () => `
<tr>
  <td align="center" style="padding: 40px 30px 30px; background: #f8f9fa;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <img src="${COLOR_LOGO_URL}" alt="YMA Bouncy Castle" style="max-width: 180px; height: auto; margin-bottom: 20px;">
          
          <div style="margin-bottom: 25px;">
            <a href="https://www.ymabouncycastle.co.uk" style="display: inline-block; margin: 0 12px; color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 15px;">Website</a>
            <span style="color: #cbd5e0;">•</span>
            <a href="tel:07951431111" style="display: inline-block; margin: 0 12px; color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 15px;">Call Us</a>
            <span style="color: #cbd5e0;">•</span>
            <a href="https://wa.me/447951431111" style="display: inline-block; margin: 0 12px; color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 15px;">WhatsApp</a>
          </div>
          
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6; max-width: 500px; margin: 0 auto;">
            <p style="margin: 0 0 12px 0;">
              <strong>📞 Customer Support:</strong> 07951 431111<br>
              <strong>🕒 Business Hours:</strong> Mon-Sun 8:00 AM - 8:00 PM
            </p>
            <p style="margin: 0 0 8px 0; font-size: 12px;">
              © ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.<br>
              London, United Kingdom
            </p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
              This is an automated email. Please do not reply directly to this message.
            </p>
          </div>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

// Product and pricing table generator
const generateProductTable = (
  order: IOrderDocument,
  showFees: boolean = true
) => {
  const items = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 18px 20px; text-align: left;">
        <div style="font-weight: 600; color: #111827; font-size: 16px;">${
          item.name
        }</div>
        ${
          item.hireOccasion
            ? `<div style="color: #6b7280; font-size: 14px; margin-top: 4px;">🎉 ${item.hireOccasion
                .replace(/_/g, " ")
                .toUpperCase()}</div>`
            : ""
        }
        ${
          item.startDate
            ? `<div style="color: #6b7280; font-size: 14px; margin-top: 4px;">📅 Event Date: ${formatDate(
                item.startDate
              )}</div>`
            : ""
        }
        ${
          item.keepOvernight
            ? '<div style="color: #6b7280; font-size: 14px; margin-top: 4px;">🌙 Overnight Keeping: Yes (£30)</div>'
            : ""
        }
      </td>
      <td style="padding: 18px 20px; text-align: center; font-weight: 600; color: #374151; font-size: 15px;">${
        item.quantity
      }</td>
      <td style="padding: 18px 20px; text-align: right; font-weight: 600; color: #374151; font-size: 15px;">${formatCurrency(
        item.price
      )}</td>
      <td style="padding: 18px 20px; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${formatCurrency(
        item.price * item.quantity
      )}</td>
    </tr>
  `
    )
    .join("");

  const fees = showFees
    ? `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td colspan="3" style="padding: 16px 20px; text-align: right; font-weight: 600; color: #374151;">Subtotal</td>
      <td style="padding: 16px 20px; text-align: right; font-weight: 600; color: #374151;">${formatCurrency(
        order.subtotalAmount
      )}</td>
    </tr>
    ${
      order.deliveryFee > 0
        ? `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td colspan="3" style="padding: 16px 20px; text-align: right; font-weight: 600; color: #374151;">
        Delivery & Collection Fees
        ${
          order.shippingAddress.deliveryTime
            ? `<div style="font-size: 13px; color: #6b7280;">Delivery: ${formatDeliveryTime(
                order.shippingAddress.deliveryTime
              )}</div>`
            : ""
        }
        ${
          order.shippingAddress.collectionTime
            ? `<div style="font-size: 13px; color: #6b7280;">Collection: ${formatCollectionTime(
                order.shippingAddress.collectionTime
              )}</div>`
            : ""
        }
      </td>
      <td style="padding: 16px 20px; text-align: right; font-weight: 600; color: #374151;">${formatCurrency(
        order.deliveryFee
      )}</td>
    </tr>
    `
        : ""
    }
    ${
      order.overnightFee > 0
        ? `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td colspan="3" style="padding: 16px 20px; text-align: right; font-weight: 600; color: #374151;">
        Overnight Keeping
      </td>
      <td style="padding: 16px 20px; text-align: right; font-weight: 600; color: #374151;">${formatCurrency(
        order.overnightFee
      )}</td>
    </tr>
    `
        : ""
    }
    <tr style="background-color: #f9fafb;">
      <td colspan="3" style="padding: 20px; text-align: right; font-weight: 700; color: #111827; font-size: 18px;">Total Amount</td>
      <td style="padding: 20px; text-align: right; font-weight: 700; color: #4f46e5; font-size: 20px;">${formatCurrency(
        order.totalAmount
      )}</td>
    </tr>
  `
    : "";

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <thead>
      <tr style="background-color: #4f46e5;">
        <th style="text-align: left; padding: 20px; font-weight: 600; color: white; font-size: 16px;">Product</th>
        <th style="text-align: center; padding: 20px; font-weight: 600; color: white; font-size: 16px;">Qty</th>
        <th style="text-align: right; padding: 20px; font-weight: 600; color: white; font-size: 16px;">Price</th>
        <th style="text-align: right; padding: 20px; font-weight: 600; color: white; font-size: 16px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items}
      ${fees}
    </tbody>
  </table>
  `;
};

// 1. ORDER RECEIVED EMAIL
export const sendOrderReceivedEmail = async (
  order: IOrderDocument
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const customerEmail = order.shippingAddress.email;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    const orderId =
      order.orderNumber || `ORD-${(order._id as string).toString().slice(-8)}`;
    const eventDate = order.items[0]?.startDate
      ? formatDate(order.items[0].startDate)
      : formatDate(order.estimatedDeliveryDate);
    const deliveryTime = order.shippingAddress.deliveryTime
      ? formatDeliveryTime(order.shippingAddress.deliveryTime)
      : "Standard (8:00 AM - 12:00 PM)";
    const deliveryAddress = `${order.shippingAddress.street}${
      order.shippingAddress.apartment
        ? `, ${order.shippingAddress.apartment}`
        : ""
    }, ${order.shippingAddress.city}, ${order.shippingAddress.zipCode}`;
    const productName = order.items.map((item) => item.name).join(", ");

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We've Received Your Order - YMA Bouncy Castle 🎉</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .header { padding: 30px 15px !important; }
            .content { padding: 20px !important; }
            .logo { max-width: 150px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <tr>
                <td align="center" style="padding: 50px 30px 40px;">
                    <img src="${WHITE_LOGO_URL}" alt="YMA Bouncy Castle" style="max-width: 200px; height: auto; margin-bottom: 25px; filter: brightness(0) invert(1);" />
                    <h1 style="margin: 0 0 15px 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-align: center;">
                        🎉 We've Received Your Order!
                    </h1>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; line-height: 1.5; text-align: center;">
                        Hi ${customerName},
                    </p>
                </td>
            </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding: 40px 30px;">
                    <!-- Introduction -->
                    <div style="margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Thank you for booking with <strong>YMA Bouncy Castle 🎈</strong><br>
                            We're excited to be part of your upcoming party!
                        </p>
                    </div>

                    <!-- Order Details Card -->
                    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #0ea5e9;">
                        <h2 style="margin: 0 0 20px 0; color: #0369a1; font-size: 22px; font-weight: 700;">
                            🧾 Order Details
                        </h2>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                            <tr>
                                <td width="35%" style="padding: 10px 0; color: #4b5563; font-weight: 600; font-size: 15px;">Order ID</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #4b5563; font-weight: 600; font-size: 15px;">Bouncy Castle</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${productName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #4b5563; font-weight: 600; font-size: 15px;">Event Date</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${eventDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #4b5563; font-weight: 600; font-size: 15px;">Delivery Time</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${deliveryTime}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #4b5563; font-weight: 600; font-size: 15px;">Delivery Address</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${deliveryAddress}</td>
                            </tr>
                        </table>
                        <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 15px; line-height: 1.5;">
                            Our team is now reviewing your booking and will prepare everything to ensure timely delivery and a smooth setup for your event.
                        </p>
                    </div>

                    <!-- Delivery Information -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #f59e0b;">
                        <h2 style="margin: 0 0 20px 0; color: #92400e; font-size: 22px; font-weight: 700;">
                            🚚 Delivery Information
                        </h2>
                        <p style="margin: 0 0 15px 0; color: #78350f; font-size: 16px; line-height: 1.6;">
                            <strong>Please make sure someone is available at the delivery address during the selected delivery time to receive and confirm the setup.</strong>
                        </p>
                    </div>

                    <!-- Urgent Notice -->
                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 3px solid #dc2626;">
                        <h2 style="margin: 0 0 20px 0; color: #991b1b; font-size: 22px; font-weight: 700;">
                            ⚠️ Important – Events Within 72 Hours
                        </h2>
                        <p style="margin: 0 0 15px 0; color: #7f1d1d; font-size: 16px; line-height: 1.6;">
                            If your party or event is happening within the next 72 hours, please call us immediately to confirm availability and delivery arrangements:
                        </p>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="tel:07951431111" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                📞 Call Now: 07951 431111
                            </a>
                        </div>
                        <p style="margin: 15px 0 0 0; color: #7f1d1d; font-size: 15px; line-height: 1.5;">
                            This helps us avoid last-minute issues and ensures we can serve you properly.
                        </p>
                    </div>

                    <!-- Product Table -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 22px; font-weight: 700;">
                            📋 Order Summary
                        </h2>
                        ${generateProductTable(order)}
                    </div>

                    <!-- Closing -->
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 12px; margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #5b21b6; font-size: 17px; line-height: 1.6;">
                            If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.
                        </p>
                        <p style="margin: 0; color: #5b21b6; font-size: 18px; font-weight: 700; line-height: 1.6;">
                            Thanks again for choosing YMA Bouncy Castle —<br>
                            let's make it a day to remember! 🎊
                        </p>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Footer -->
        ${getEmailFooter()}
    </div>
</body>
</html>
    `;

    const text = `
WE'VE RECEIVED YOUR ORDER - YMA Bouncy Castle 🎉

Hi ${customerName},

Thank you for booking with YMA Bouncy Castle 🎈
We're excited to be part of your upcoming party!

🧾 ORDER DETAILS
Order ID: ${orderId}
Bouncy Castle: ${productName}
Event Date: ${eventDate}
Delivery Time: ${deliveryTime}
Delivery Address: ${deliveryAddress}

Our team is now reviewing your booking and will prepare everything to ensure timely delivery and a smooth setup for your event.

🚚 DELIVERY INFORMATION
Please make sure someone is available at the delivery address during the selected delivery time to receive and confirm the setup.

⚠️ IMPORTANT – EVENTS WITHIN 72 HOURS
If your party or event is happening within the next 72 hours, please call us immediately to confirm availability and delivery arrangements:
📞 07951 431111

This helps us avoid last-minute issues and ensures we can serve you properly.

📋 ORDER SUMMARY
${order.items
  .map(
    (item) =>
      `${item.name} x ${item.quantity} = ${formatCurrency(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

Subtotal: ${formatCurrency(order.subtotalAmount)}
${
  order.deliveryFee > 0
    ? `Delivery & Collection Fees: ${formatCurrency(order.deliveryFee)}`
    : ""
}
${
  order.overnightFee > 0
    ? `Overnight Keeping: ${formatCurrency(order.overnightFee)}`
    : ""
}
Total: ${formatCurrency(order.totalAmount)}

If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.

Thanks again for choosing YMA Bouncy Castle — let's make it a day to remember! 🎊

Warm regards,
YMA Bouncy Castle Team
🌐 www.ymabouncycastle.co.uk
📞 07951 431111
`;

    const mailOptions = {
      from: `"YMA Bouncy Castle" <${
        process.env.EMAIL_FROM || "noreply@ymabouncycastle.co.uk"
      }>`,
      to: customerEmail,
      subject: `We've Received Your Order – YMA Bouncy Castle 🎉`,
      html: html,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order received email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending order received email:", error);
    return false;
  }
};

// 2. ORDER CONFIRMED EMAIL (Admin confirms order)
export const sendOrderConfirmedEmail = async (
  order: IOrderDocument
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const customerEmail = order.shippingAddress.email;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    const orderId =
      order.orderNumber || `ORD-${(order._id as string).toString().slice(-8)}`;
    const eventDate = order.items[0]?.startDate
      ? formatDate(order.items[0].startDate)
      : formatDate(order.estimatedDeliveryDate);
    const deliveryTime = order.shippingAddress.deliveryTime
      ? formatDeliveryTime(order.shippingAddress.deliveryTime)
      : "Standard (8:00 AM - 12:00 PM)";
    const deliveryAddress = `${order.shippingAddress.street}${
      order.shippingAddress.apartment
        ? `, ${order.shippingAddress.apartment}`
        : ""
    }, ${order.shippingAddress.city}, ${order.shippingAddress.zipCode}`;
    const productName = order.items.map((item) => item.name).join(", ");

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your YMA Bouncy Castle Booking Is Fully Confirmed ✅</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .header { padding: 30px 15px !important; }
            .content { padding: 20px !important; }
            .logo { max-width: 150px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <tr>
                <td align="center" style="padding: 50px 30px 40px;">
                    <img src="${WHITE_LOGO_URL}" alt="YMA Bouncy Castle" style="max-width: 200px; height: auto; margin-bottom: 25px; filter: brightness(0) invert(1);" />
                    <h1 style="margin: 0 0 15px 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-align: center;">
                        ✅ Booking Fully Confirmed!
                    </h1>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; line-height: 1.5; text-align: center;">
                        Hi ${customerName},
                    </p>
                </td>
            </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding: 40px 30px;">
                    <!-- Introduction -->
                    <div style="margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Great news! 🎉<br>
                            Your booking with <strong>YMA Bouncy Castle</strong> has been reviewed and confirmed by our team.
                        </p>
                        <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Everything is now locked in, and we're all set to deliver and set up for your event.
                        </p>
                    </div>

                    <!-- Confirmation Details -->
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #10b981;">
                        <h2 style="margin: 0 0 20px 0; color: #065f46; font-size: 22px; font-weight: 700;">
                            ✅ Confirmed Booking Details
                        </h2>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                            <tr>
                                <td width="35%" style="padding: 10px 0; color: #065f46; font-weight: 600; font-size: 15px;">Order ID</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #065f46; font-weight: 600; font-size: 15px;">Bouncy Castle</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${productName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #065f46; font-weight: 600; font-size: 15px;">Event Date</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${eventDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #065f46; font-weight: 600; font-size: 15px;">Delivery Time</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${deliveryTime}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #065f46; font-weight: 600; font-size: 15px;">Delivery Address</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${deliveryAddress}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- What Happens Next -->
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #3b82f6;">
                        <h2 style="margin: 0 0 20px 0; color: #1e40af; font-size: 22px; font-weight: 700;">
                            🚚 What Happens Next
                        </h2>
                        <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                            <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.6;">
                                Our delivery team will arrive around the confirmed delivery time
                            </li>
                            <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.6;">
                                Please ensure someone is available at the address to receive and approve the setup
                            </li>
                            <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.6;">
                                We'll take care of installation and safety checks
                            </li>
                        </ul>
                    </div>

                    <!-- Setup Requirements -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #f59e0b;">
                        <h2 style="margin: 0 0 20px 0; color: #92400e; font-size: 22px; font-weight: 700;">
                            🧹 Important Setup Requirement
                        </h2>
                        <p style="margin: 0 0 15px 0; color: #78350f; font-size: 16px; line-height: 1.6;">
                            For safety and hygiene reasons, please ensure the area where the bouncy castle will be placed is clean and clear before our team arrives.
                        </p>
                        <p style="margin: 0 0 15px 0; color: #78350f; font-size: 16px; line-height: 1.6;">
                            This includes removing:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                            <li style="margin-bottom: 8px; font-size: 15px;">Dog or animal waste</li>
                            <li style="margin-bottom: 8px; font-size: 15px;">Wood, stones, sharp objects</li>
                            <li style="margin-bottom: 8px; font-size: 15px;">Garden or backyard waste</li>
                        </ul>
                        <p style="margin: 15px 0 0 0; color: #78350f; font-size: 15px; line-height: 1.6;">
                            A clean surface helps us set up quickly and keeps everyone safe.
                        </p>
                    </div>

                    <!-- Product Table -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 22px; font-weight: 700;">
                            📋 Order Summary
                        </h2>
                        ${generateProductTable(order)}
                    </div>

                    <!-- Closing -->
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 12px; margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #5b21b6; font-size: 17px; line-height: 1.6;">
                            If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.
                        </p>
                        <p style="margin: 0; color: #5b21b6; font-size: 18px; font-weight: 700; line-height: 1.6;">
                            Thank you for choosing YMA Bouncy Castle —<br>
                            we're excited to be part of your celebration! 🎈
                        </p>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Footer -->
        ${getEmailFooter()}
    </div>
</body>
</html>
    `;

    const text = `YOUR YMA BOUNCY CASTLE BOOKING IS FULLY CONFIRMED ✅

Hi ${customerName},

Great news! 🎉
Your booking with YMA Bouncy Castle has been reviewed and confirmed by our team.
Everything is now locked in, and we're all set to deliver and set up for your event.

✅ CONFIRMED BOOKING DETAILS
Order ID: ${orderId}
Bouncy Castle: ${productName}
Event Date: ${eventDate}
Delivery Time: ${deliveryTime}
Delivery Address: ${deliveryAddress}

🚚 WHAT HAPPENS NEXT
• Our delivery team will arrive around the confirmed delivery time
• Please ensure someone is available at the address to receive and approve the setup
• We'll take care of installation and safety checks

🧹 IMPORTANT SETUP REQUIREMENT
For safety and hygiene reasons, please ensure the area where the bouncy castle will be placed is clean and clear before our team arrives.
This includes removing:
• Dog or animal waste
• Wood, stones, sharp objects
• Garden or backyard waste
A clean surface helps us set up quickly and keeps everyone safe.

📋 ORDER SUMMARY
${order.items
  .map(
    (item) =>
      `${item.name} x ${item.quantity} = ${formatCurrency(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

Subtotal: ${formatCurrency(order.subtotalAmount)}
${
  order.deliveryFee > 0
    ? `Delivery & Collection Fees: ${formatCurrency(order.deliveryFee)}`
    : ""
}
${
  order.overnightFee > 0
    ? `Overnight Keeping: ${formatCurrency(order.overnightFee)}`
    : ""
}
Total: ${formatCurrency(order.totalAmount)}

If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.

Thank you for choosing YMA Bouncy Castle — we're excited to be part of your celebration! 🎈

Warm regards,
YMA Bouncy Castle Team
🌐 www.ymabouncycastle.co.uk
📞 07951 431111
`;

    const mailOptions = {
      from: `"YMA Bouncy Castle" <${
        process.env.EMAIL_FROM || "noreply@ymabouncycastle.co.uk"
      }>`,
      to: customerEmail,
      subject: `Your YMA Bouncy Castle Booking Is Fully Confirmed ✅`,
      html: html,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmed email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending order confirmed email:", error);
    return false;
  }
};

// 3. DELIVERY REMINDER EMAIL (Sent 1 day before delivery)
export const sendDeliveryReminderEmail = async (
  order: IOrderDocument
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const customerEmail = order.shippingAddress.email;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    const productName = order.items.map((item) => item.name).join(", ");
    const eventDate = order.items[0]?.startDate
      ? formatDate(order.items[0].startDate)
      : formatDate(order.estimatedDeliveryDate);
    const deliveryTime = order.shippingAddress.deliveryTime
      ? formatDeliveryTime(order.shippingAddress.deliveryTime)
      : "8:00 AM - 12:00 PM (Standard Delivery)";
    const selectedTime = order.shippingAddress.deliveryTime
      ? formatDeliveryTime(order.shippingAddress.deliveryTime)
      : "Standard Delivery (8:00 AM - 12:00 PM)";

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We're Preparing Your Bouncy Castle – Delivery Reminder 🎈</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .header { padding: 30px 15px !important; }
            .content { padding: 20px !important; }
            .logo { max-width: 150px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <tr>
                <td align="center" style="padding: 50px 30px 40px;">
                    <img src="${WHITE_LOGO_URL}" alt="YMA Bouncy Castle" style="max-width: 200px; height: auto; margin-bottom: 25px; filter: brightness(0) invert(1);" />
                    <h1 style="margin: 0 0 15px 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-align: center;">
                        🎈 Delivery Reminder
                    </h1>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; line-height: 1.5; text-align: center;">
                        Hi ${customerName},
                    </p>
                </td>
            </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding: 40px 30px;">
                    <!-- Introduction -->
                    <div style="margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            We're getting everything ready for your <strong>YMA Bouncy Castle</strong> 🎉
                        </p>
                        <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Our team is currently preparing your bouncy castle to ensure it arrives clean, safe, and ready for fun.
                        </p>
                        <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Please take a moment to review the important delivery details below 👇
                        </p>
                    </div>

                    <!-- Delivery Time Reminder -->
                    <div style="background: linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #4f46e5;">
                        <h2 style="margin: 0 0 20px 0; color: #3730a3; font-size: 22px; font-weight: 700;">
                            🚚 Delivery Time Reminder
                        </h2>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #4f46e5;">
                            <p style="margin: 0 0 15px 0; color: #4f46e5; font-weight: 700; font-size: 18px;">
                                🕒 ${selectedTime}
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                                <li style="margin-bottom: 10px; font-size: 15px;">
                                    If you selected our standard delivery time, delivery will take place between 8:00 AM and 12:00 PM
                                </li>
                                <li style="margin-bottom: 10px; font-size: 15px;">
                                    If you selected a specific delivery time, please allow a 15-minute window in case of traffic or unexpected circumstances
                                </li>
                                <li style="font-size: 15px;">
                                    Kindly make sure someone is available at the address during this time
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Setup Requirements -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #f59e0b;">
                        <h2 style="margin: 0 0 20px 0; color: #92400e; font-size: 22px; font-weight: 700;">
                            🧹 Setup Area Must Be Clean & Clear
                        </h2>
                        <p style="margin: 0 0 15px 0; color: #78350f; font-size: 16px; line-height: 1.6;">
                            For safety and hygiene reasons, please ensure the area where the bouncy castle will be placed is clean and ready before our arrival.
                        </p>
                        <p style="margin: 0 0 15px 0; color: #78350f; font-size: 16px; font-weight: 600;">
                            Please remove:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                            <li style="margin-bottom: 8px; font-size: 15px;">Dog or animal waste</li>
                            <li style="margin-bottom: 8px; font-size: 15px;">Wood, stones, or sharp objects</li>
                            <li style="margin-bottom: 8px; font-size: 15px;">Garden or backyard waste</li>
                        </ul>
                        <p style="margin: 15px 0 0 0; color: #78350f; font-size: 15px; line-height: 1.6;">
                            A clear surface helps us set up quickly and keeps everyone safe.
                        </p>
                    </div>

                    <!-- Cash on Delivery -->
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #10b981;">
                        <h2 style="margin: 0 0 20px 0; color: #065f46; font-size: 22px; font-weight: 700;">
                            💷 Cash on Delivery Reminder
                        </h2>
                        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #10b981;">
                            <p style="margin: 0; color: #065f46; font-size: 17px; font-weight: 600;">
                                All orders are cash on delivery.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #065f46; font-size: 16px; line-height: 1.6;">
                                Please ensure the payment is ready when our driver arrives.
                            </p>
                        </div>
                    </div>

                    <!-- Product Table -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 22px; font-weight: 700;">
                            📋 Your Booking Details
                        </h2>
                        ${generateProductTable(order)}
                    </div>

                    <!-- Contact Info -->
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 12px; margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #5b21b6; font-size: 17px; line-height: 1.6;">
                            If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.
                        </p>
                        <div style="margin-bottom: 20px;">
                            <a href="tel:07951431111" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                                📞 07951 431111
                            </a>
                        </div>
                        <p style="margin: 0; color: #5b21b6; font-size: 18px; font-weight: 700; line-height: 1.6;">
                            Thank you for choosing YMA Bouncy Castle —<br>
                            we look forward to delivering the fun! 🎈
                        </p>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Footer -->
        ${getEmailFooter()}
    </div>
</body>
</html>
    `;

    const text = `WE'RE PREPARING YOUR BOUNCY CASTLE – DELIVERY REMINDER 🎈

Hi ${customerName},

We're getting everything ready for your YMA Bouncy Castle 🎉
Our team is currently preparing your bouncy castle to ensure it arrives clean, safe, and ready for fun.
Please take a moment to review the important delivery details below 👇

🚚 DELIVERY TIME REMINDER
We will arrive at your selected delivery time:
🕒 ${selectedTime}

• If you selected our standard delivery time, delivery will take place between 8:00 AM and 12:00 PM
• If you selected a specific delivery time, please allow a 15-minute window in case of traffic or unexpected circumstances
• Kindly make sure someone is available at the address during this time

🧹 SETUP AREA MUST BE CLEAN & CLEAR
For safety and hygiene reasons, please ensure the area where the bouncy castle will be placed is clean and ready before our arrival.
Please remove:
• Dog or animal waste
• Wood, stones, or sharp objects
• Garden or backyard waste
A clear surface helps us set up quickly and keeps everyone safe.

💷 CASH ON DELIVERY REMINDER
All orders are cash on delivery.
Please ensure the payment is ready when our driver arrives.

📋 YOUR BOOKING DETAILS
${order.items
  .map(
    (item) =>
      `${item.name} x ${item.quantity} = ${formatCurrency(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

Subtotal: ${formatCurrency(order.subtotalAmount)}
${
  order.deliveryFee > 0
    ? `Delivery & Collection Fees: ${formatCurrency(order.deliveryFee)}`
    : ""
}
${
  order.overnightFee > 0
    ? `Overnight Keeping: ${formatCurrency(order.overnightFee)}`
    : ""
}
Total: ${formatCurrency(order.totalAmount)}

If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.
📞 07951 431111

Thank you for choosing YMA Bouncy Castle — we look forward to delivering the fun! 🎈

Warm regards,
YMA Bouncy Castle Team
🌐 www.ymabouncycastle.co.uk
📞 07951 431111
`;

    const mailOptions = {
      from: `"YMA Bouncy Castle" <${
        process.env.EMAIL_FROM || "noreply@ymabouncycastle.co.uk"
      }>`,
      to: customerEmail,
      subject: `We're Preparing Your Bouncy Castle – Delivery Reminder 🎈`,
      html: html,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Delivery reminder email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending delivery reminder email:", error);
    return false;
  }
};

// 4. ORDER CANCELLATION EMAIL
export const sendOrderCancellationEmail = async (
  order: IOrderDocument,
  reason?: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const customerEmail = order.shippingAddress.email;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    const orderId =
      order.orderNumber || `ORD-${(order._id as string).toString().slice(-8)}`;
    const eventDate = order.items[0]?.startDate
      ? formatDate(order.items[0].startDate)
      : formatDate(order.estimatedDeliveryDate);
    const deliveryAddress = `${order.shippingAddress.street}${
      order.shippingAddress.apartment
        ? `, ${order.shippingAddress.apartment}`
        : ""
    }, ${order.shippingAddress.city}, ${order.shippingAddress.zipCode}`;
    const productName = order.items.map((item) => item.name).join(", ");

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your YMA Bouncy Castle Order Has Been Cancelled</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .header { padding: 30px 15px !important; }
            .content { padding: 20px !important; }
            .logo { max-width: 150px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <tr>
                <td align="center" style="padding: 50px 30px 40px;">
                    <img src="${WHITE_LOGO_URL}" alt="YMA Bouncy Castle" style="max-width: 200px; height: auto; margin-bottom: 25px; filter: brightness(0) invert(1);" />
                    <h1 style="margin: 0 0 15px 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-align: center;">
                        ❌ Order Cancelled
                    </h1>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; line-height: 1.5; text-align: center;">
                        Hi ${customerName},
                    </p>
                </td>
            </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding: 40px 30px;">
                    <!-- Introduction -->
                    <div style="margin-bottom: 30px;">
                        <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                            We're writing to confirm that your <strong>YMA Bouncy Castle</strong> order has been cancelled.
                        </p>
                    </div>

                    <!-- Cancellation Details -->
                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #ef4444;">
                        <h2 style="margin: 0 0 20px 0; color: #991b1b; font-size: 22px; font-weight: 700;">
                            ❌ Cancelled Order Details
                        </h2>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                            <tr>
                                <td width="35%" style="padding: 10px 0; color: #991b1b; font-weight: 600; font-size: 15px;">Order ID</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #991b1b; font-weight: 600; font-size: 15px;">Bouncy Castle</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${productName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #991b1b; font-weight: 600; font-size: 15px;">Event Date</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${eventDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #991b1b; font-weight: 600; font-size: 15px;">Delivery Address</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">${deliveryAddress}</td>
                            </tr>
                        </table>
                        ${
                          reason
                            ? `
                        <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 8px; border: 1px solid #fca5a5;">
                            <p style="margin: 0; color: #991b1b; font-size: 15px; line-height: 1.6;">
                                <strong>Reason for cancellation:</strong> ${reason}
                            </p>
                        </div>
                        `
                            : ""
                        }
                    </div>

                    <!-- Next Steps -->
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 5px solid #3b82f6;">
                        <h2 style="margin: 0 0 20px 0; color: #1e40af; font-size: 22px; font-weight: 700;">
                            🔄 What To Do Next
                        </h2>
                        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
                            <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; line-height: 1.6;">
                                <strong>If this cancellation was requested by you,</strong> no further action is needed.
                            </p>
                            <p style="margin: 0; color: #1e40af; font-size: 16px; line-height: 1.6;">
                                <strong>If you believe this cancellation was made by mistake</strong> or you'd like to rebook for a different date or product, please get in touch with us as soon as possible and we'll be happy to help.
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 25px;">
                            <a href="tel:07951431111" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                                📞 07951 431111
                            </a>
                        </div>
                    </div>

                    <!-- Cancelled Order Summary -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 22px; font-weight: 700;">
                            📋 Cancelled Order Summary
                        </h2>
                        ${generateProductTable(order, false)}
                    </div>

                    <!-- Closing -->
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; margin-bottom: 30px;">
                        <p style="margin: 0; color: #4b5563; font-size: 18px; font-weight: 700; line-height: 1.6;">
                            Thank you for considering YMA Bouncy Castle.<br>
                            We hope to be part of your celebration in the future 🎈
                        </p>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Footer -->
        ${getEmailFooter()}
    </div>
</body>
</html>
    `;

    const text = `YOUR YMA BOUNCY CASTLE ORDER HAS BEEN CANCELLED

Hi ${customerName},

We're writing to confirm that your YMA Bouncy Castle order has been cancelled.

❌ CANCELLED ORDER DETAILS
Order ID: ${orderId}
Bouncy Castle: ${productName}
Event Date: ${eventDate}
Delivery Address: ${deliveryAddress}
${reason ? `Reason for cancellation: ${reason}` : ""}

If this cancellation was requested by you, no further action is needed.
If you believe this cancellation was made by mistake or you'd like to rebook for a different date or product, please get in touch with us as soon as possible and we'll be happy to help.
📞 07951 431111

📋 CANCELLED ORDER SUMMARY
${order.items
  .map(
    (item) =>
      `${item.name} x ${item.quantity} = ${formatCurrency(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

Thank you for considering YMA Bouncy Castle.
We hope to be part of your celebration in the future 🎈

Warm regards,
YMA Bouncy Castle Team
🌐 www.ymabouncycastle.co.uk
📞 07951 431111
`;

    const mailOptions = {
      from: `"YMA Bouncy Castle" <${
        process.env.EMAIL_FROM || "noreply@ymabouncycastle.co.uk"
      }>`,
      to: customerEmail,
      subject: `Your YMA Bouncy Castle Order Has Been Cancelled`,
      html: html,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order cancellation email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending order cancellation email:", error);
    return false;
  }
};

// 5. Original order confirmation email (for backward compatibility)
export const sendOrderConfirmationEmail = async (
  order: IOrderDocument
): Promise<boolean> => {
  // Use the new order received email
  return sendOrderReceivedEmail(order);
};

// 6. Original admin notification (for backward compatibility)
export const sendOrderNotificationToAdmin = async (
  order: IOrderDocument
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || "admin@ymabouncycastle.co.uk";
    const orderId =
      order.orderNumber || `ORD-${(order._id as string).toString().slice(-8)}`;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    const totalAmount = formatCurrency(order.totalAmount);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEW ORDER #${orderId} - ${customerName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <tr>
                <td align="center" style="padding: 40px 20px 30px;">
                    <h1 style="margin: 0 0 15px 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-align: center;">
                        🚨 NEW ORDER NOTIFICATION
                    </h1>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 500; text-align: center;">
                        Action Required: Immediate processing needed
                    </p>
                </td>
            </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding: 35px 30px;">
                    <div style="background: #fed7d7; border-radius: 10px; padding: 25px; margin-bottom: 30px; border: 3px solid #fc8181;">
                        <h2 style="margin: 0; color: #c53030; font-size: 20px; font-weight: 700;">
                            ⚠️ URGENT: NEW ORDER RECEIVED
                        </h2>
                        <p style="margin: 15px 0 0 0; color: #742a2a; font-size: 16px; line-height: 1.5;">
                            Order #${orderId} requires immediate attention and processing.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                        <div>
                            <div style="color: #718096; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Order Number</div>
                            <div style="color: #2d3748; font-size: 24px; font-weight: 700;">${orderId}</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Customer</div>
                            <div style="color: #2d3748; font-size: 18px; font-weight: 600;">${customerName}</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Total Amount</div>
                            <div style="color: #e53e3e; font-size: 26px; font-weight: 700;">${totalAmount}</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Order Date</div>
                            <div style="color: #2d3748; font-size: 16px;">${formatDate(
                              order.createdAt
                            )}</div>
                        </div>
                    </div>

                    <div style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                        <p style="margin: 0;">
                            Order ID: ${
                              order._id
                            } | Generated: ${new Date().toLocaleString()}
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"YMA Bouncy Castle System" <${
        process.env.EMAIL_FROM || "noreply@ymabouncycastle.co.uk"
      }>`,
      to: adminEmail,
      subject: `🚨 NEW ORDER #${orderId} - ${customerName} - ${totalAmount}`,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification sent for order #${orderId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
    return false;
  }
};
