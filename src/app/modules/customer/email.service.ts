import nodemailer from "nodemailer";
import ApiError from "../../utils/apiError";

// ───────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface BaseOrderEmailData {
  customerName: string;
  orderId: string;
  eventDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  totalAmount: number;
  to: string; // required for sendEmail
}

interface SingleProductOrderEmailData extends BaseOrderEmailData {
  productName: string;
  orderItems?: never;
}

interface MultiProductOrderEmailData extends BaseOrderEmailData {
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  productName?: never; // optional if using items table
}

export type OrderEmailData =
  | SingleProductOrderEmailData
  | MultiProductOrderEmailData;

// ───────────────────────────────────────────────
// TRANSPORT SETUP
// ───────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter (optional – good for debugging)
transporter.verify((error) => {
  if (error) {
    console.error("Email transporter verification failed:", error);
  }
});

// ───────────────────────────────────────────────
// TEMPLATE HELPER
// ───────────────────────────────────────────────

const getEmailTemplate = (
  template: string,
  data: OrderEmailData & { customerEmail?: string },
): string => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";

  const baseTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${"YMA Bouncy Castle"}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #4CAF50; padding: 20px; text-align: center; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .title { color: #2c3e50; margin-bottom: 15px; font-size: 22px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .table tr:last-child td { border-bottom: none; }
        .highlight { color: #4CAF50; font-weight: 600; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .footer a { color: #4CAF50; text-decoration: none; }
        @media (max-width: 600px) {
          .content { padding: 20px; }
          .table th, .table td { padding: 8px 10px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="${logoUrl}" alt="YMA Bouncy Castle" class="logo">
        </div>
        <div class="content">
  `;

  const footer = `
        </div>
        <div class="footer">
          <p><strong>YMA Bouncy Castle Team</strong></p>
          <p>🌐 <a href="https://www.ymabouncycastle.co.uk">www.ymabouncycastle.co.uk</a></p>
          <p>📞 07951 431111</p>
          <p style="margin-top: 20px; font-size: 12px; color: #aaa;">
            This email was sent to ${data.to}. If you believe this was sent by mistake, please ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Helper to render order items table
  const renderItemsTable = () => {
    if (!data.orderItems || data.orderItems.length === 0) return "";

    let table = `
      <div class="section">
        <h2>Order Items</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.orderItems.forEach((item) => {
      table += `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>£${item.price.toFixed(2)}</td>
          <td>£${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    });

    table += `
          </tbody>
        </table>
      </div>
    `;

    return table;
  };

  switch (template) {
    case "order-received":
      return (
        baseTemplate +
        `
          <h1 class="title">We've Received Your Order – YMA Bouncy Castle 🎉</h1>
          <p>Hi <span class="highlight">${data.customerName}</span>,</p>
          <p>Thank you for booking with YMA Bouncy Castle 🎈</p>
          <p>We're excited to be part of your upcoming party!</p>

          <div class="section">
            <h2>🧾 Order Details</h2>
            <div class="info-box">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              ${
                data.orderItems
                  ? "<p><strong>Items:</strong> Multiple items selected</p>"
                  : `<p><strong>Bouncy Castle:</strong> ${data.productName || "Selected Items"}</p>`
              }
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
              <p><strong>Delivery Time:</strong> ${data.deliveryTime}</p>
              <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
              <p><strong>Total Amount:</strong> £${data.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          ${renderItemsTable()}

          <div class="section">
            <h2>🚚 Delivery Information</h2>
            <p>Please make sure someone is available at the delivery address during the selected delivery time to receive and confirm the setup.</p>
          </div>

          <div class="section">
            <h2>⚠️ Important – Events Within 72 Hours</h2>
            <p>If your party or event is happening within the next 72 hours, please call us immediately to confirm availability and delivery arrangements:</p>
            <p style="font-size: 18px; font-weight: bold;">📞 07951 431111</p>
          </div>

          <p>If you have any questions, feel free to give us a call or send a message on WhatsApp.</p>
          <p>Thanks again for choosing YMA Bouncy Castle — let's make it a day to remember! 🎊</p>
        ` +
        footer
      );

    case "order-confirmed":
      return (
        baseTemplate +
        `
          <h1 class="title">Your YMA Bouncy Castle Booking Is Fully Confirmed ✅</h1>
          <p>Hi <span class="highlight">${data.customerName}</span>,</p>
          <p>Great news! 🎉</p>
          <p>Your booking has been reviewed and confirmed by our team.</p>

          <div class="section">
            <h2>✅ Confirmed Booking Details</h2>
            <div class="info-box">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              ${
                data.orderItems
                  ? "<p><strong>Items:</strong> Multiple items selected</p>"
                  : `<p><strong>Bouncy Castle:</strong> ${data.productName || "Selected Items"}</p>`
              }
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
              <p><strong>Delivery Time:</strong> ${data.deliveryTime}</p>
              <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
            </div>
          </div>

          ${renderItemsTable()}

          <div class="section">
            <h2>🚚 What Happens Next</h2>
            <ul style="padding-left: 20px; margin: 15px 0;">
              <li>Our delivery team will arrive around the confirmed delivery time</li>
              <li>Please ensure someone is available at the address</li>
              <li>We'll handle installation and safety checks</li>
            </ul>
          </div>

          <div class="section">
            <h2>🧹 Setup Area Requirement</h2>
            <p>Please ensure the area is clean and clear of:</p>
            <ul style="padding-left: 20px;">
              <li>Dog/animal waste</li>
              <li>Wood, stones, sharp objects</li>
              <li>Garden waste</li>
            </ul>
          </div>

          <p>Thank you for choosing YMA Bouncy Castle — we're excited to deliver the fun! 🎈</p>
        ` +
        footer
      );

    // ... (other templates like delivery-reminder, order-cancelled remain similar)
    // Add them if needed or keep as-is

    default:
      return baseTemplate + `<h1>${"Update"}</h1>` + footer;
  }
};

// ───────────────────────────────────────────────
// SEND EMAIL HELPER
// ───────────────────────────────────────────────

export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const mailOptions = {
      from: `"YMA Bouncy Castle" <${process.env.EMAIL_FROM}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${emailData.to}`);
  } catch (error: any) {
    console.error("Email sending failed:", error);
    throw new ApiError(`Failed to send email: ${error.message}`, 500);
  }
};

// ───────────────────────────────────────────────
// CUSTOMER ORDER EMAIL
// ───────────────────────────────────────────────

export const sendCustomerOrderEmail = async (
  template:
    | "order-received"
    | "order-confirmed"
    | "delivery-reminder"
    | "order-cancelled",
  data: OrderEmailData,
): Promise<void> => {
  const subject = getEmailSubject(template);
  const html = getEmailTemplate(template, { ...data });

  await sendEmail({
    to: data.to,
    subject,
    html,
  });
};

const getEmailSubject = (template: string): string => {
  switch (template) {
    case "order-received":
      return "We've Received Your Order – YMA Bouncy Castle 🎉";
    case "order-confirmed":
      return "Your YMA Bouncy Castle Booking Is Fully Confirmed ✅";
    case "delivery-reminder":
      return "We're Preparing Your Bouncy Castle – Delivery Reminder 🎈";
    case "order-cancelled":
      return "Your YMA Bouncy Castle Order Has Been Cancelled";
    default:
      return "YMA Bouncy Castle - Update";
  }
};
