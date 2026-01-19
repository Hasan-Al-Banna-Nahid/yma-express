import nodemailer from "nodemailer";
import ApiError from "../../utils/apiError";

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface OrderEmailData {
  customerName: string;
  orderId: string;
  productName: string;
  eventDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  totalAmount: number;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const getEmailTemplate = (template: string, data: any): string => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";

  const baseTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.subject || "YMA Bouncy Castle"}</title>
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
            This email was sent to ${data.customerEmail || data.to}. If you believe this was sent by mistake, please ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

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
              <p><strong>Bouncy Castle:</strong> ${data.productName}</p>
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
              <p><strong>Delivery Time:</strong> ${data.deliveryTime}</p>
              <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
              <p><strong>Total Amount:</strong> £${data.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div class="section">
            <h2>🚚 Delivery Information</h2>
            <p>Please make sure someone is available at the delivery address during the selected delivery time to receive and confirm the setup.</p>
          </div>

          <div class="section">
            <h2>⚠️ Important – Events Within 72 Hours</h2>
            <p>If your party or event is happening within the next 72 hours, please call us immediately to confirm availability and delivery arrangements:</p>
            <p style="font-size: 18px; font-weight: bold;">📞 07951 431111</p>
            <p>This helps us avoid last-minute issues and ensures we can serve you properly.</p>
          </div>

          <p>If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.</p>
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
          <p>Your booking with YMA Bouncy Castle has been reviewed and confirmed by our team.</p>
          <p>Everything is now locked in, and we're all set to deliver and set up for your event.</p>
          
          <div class="section">
            <h2>✅ Confirmed Booking Details</h2>
            <div class="info-box">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Bouncy Castle:</strong> ${data.productName}</p>
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
              <p><strong>Delivery Time:</strong> ${data.deliveryTime}</p>
              <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
            </div>
          </div>

          <div class="section">
            <h2>🚚 What Happens Next</h2>
            <ul style="padding-left: 20px; margin: 15px 0;">
              <li>Our delivery team will arrive around the confirmed delivery time</li>
              <li>Please ensure someone is available at the address to receive and approve the setup</li>
              <li>We'll take care of installation and safety checks</li>
            </ul>
          </div>

          <div class="section">
            <h2>🧹 Important Setup Requirement</h2>
            <p>For safety and hygiene reasons, please ensure the area where the bouncy castle will be placed is clean and clear before our team arrives.</p>
            <p>This includes removing:</p>
            <ul style="padding-left: 20px; margin: 10px 0;">
              <li>Dog or animal waste</li>
              <li>Wood, stones, sharp objects</li>
              <li>Garden or backyard waste</li>
            </ul>
            <p>A clean surface helps us set up quickly and keeps everyone safe.</p>
          </div>

          <p>If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.</p>
          <p>Thank you for choosing YMA Bouncy Castle — we're excited to be part of your celebration! 🎈</p>
        ` +
        footer
      );

    case "delivery-reminder":
      return (
        baseTemplate +
        `
          <h1 class="title">We're Preparing Your Bouncy Castle – Delivery Reminder 🎈</h1>
          <p>Hi <span class="highlight">${data.customerName}</span>,</p>
          <p>We're getting everything ready for your YMA Bouncy Castle 🎉</p>
          <p>Our team is currently preparing your bouncy castle to ensure it arrives clean, safe, and ready for fun.</p>
          <p>Please take a moment to review the important delivery details below 👇</p>
          
          <div class="section">
            <h2>🚚 Delivery Time Reminder</h2>
            <div class="info-box">
              <p>We will arrive at your selected delivery time:</p>
              <p style="font-size: 18px; font-weight: bold;">🕒 ${data.deliveryTime}</p>
              <p>If you selected our standard delivery time, delivery will take place between 8:00 AM and 12:00 PM</p>
              <p>If you selected a specific delivery time, please allow a 15-minute window in case of traffic or unexpected circumstances</p>
              <p>Kindly make sure someone is available at the address during this time.</p>
            </div>
          </div>

          <div class="section">
            <h2>🧹 Setup Area Must Be Clean & Clear</h2>
            <p>For safety and hygiene reasons, please ensure the area where the bouncy castle will be placed is clean and ready before our arrival.</p>
            <p>Please remove:</p>
            <ul style="padding-left: 20px; margin: 10px 0;">
              <li>Dog or animal waste</li>
              <li>Wood, stones, or sharp objects</li>
              <li>Garden or backyard waste</li>
            </ul>
            <p>A clear surface helps us set up quickly and keeps everyone safe.</p>
          </div>

          <div class="section">
            <h2>💷 Cash on Delivery Reminder</h2>
            <p>All orders are cash on delivery.</p>
            <p>Please ensure the payment is ready when our driver arrives.</p>
          </div>

          <p>If you have any questions, want to add extras, or need help with anything else, feel free to give us a call or send a message on WhatsApp.</p>
          <p style="font-size: 18px; font-weight: bold;">📞 07951 431111</p>
          <p>Thank you for choosing YMA Bouncy Castle — we look forward to delivering the fun! 🎈</p>
        ` +
        footer
      );

    case "order-cancelled":
      return (
        baseTemplate +
        `
          <h1 class="title">Your YMA Bouncy Castle Order Has Been Cancelled</h1>
          <p>Hi <span class="highlight">${data.customerName}</span>,</p>
          <p>We're writing to confirm that your YMA Bouncy Castle order has been cancelled.</p>
          
          <div class="section">
            <h2>❌ Cancelled Order Details</h2>
            <div class="info-box">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Bouncy Castle:</strong> ${data.productName}</p>
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
              <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
            </div>
          </div>

          <p>If this cancellation was requested by you, no further action is needed.</p>
          <p>If you believe this cancellation was made by mistake or you'd like to rebook for a different date or product, please get in touch with us as soon as possible and we'll be happy to help.</p>
          <p style="font-size: 18px; font-weight: bold;">📞 07951 431111</p>
          <p>Thank you for considering YMA Bouncy Castle.</p>
          <p>We hope to be part of your celebration in the future 🎈</p>
        ` +
        footer
      );

    default:
      return (
        baseTemplate +
        `
          <h1 class="title">${data.subject}</h1>
          <div>${data.content}</div>
        ` +
        footer
      );
  }
};

export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error("Email sending failed:", error);
    throw new ApiError("Failed to send email", 500);
  }
};

export const sendCustomerOrderEmail = async (
  template:
    | "order-received"
    | "order-confirmed"
    | "delivery-reminder"
    | "order-cancelled",
  data: OrderEmailData & { to: string },
): Promise<void> => {
  const html = getEmailTemplate(template, data);

  await sendEmail({
    to: data.to,
    subject: getEmailSubject(template),
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
