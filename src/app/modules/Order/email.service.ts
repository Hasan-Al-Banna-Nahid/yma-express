import nodemailer from "nodemailer";
import { IOrderDocument } from "./order.interface";
import dotenv from "dotenv";
dotenv.config();
// Email configuration
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
  adminEmail: string;
}

const emailConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
  from: process.env.EMAIL_FROM || "iamnahid591998@gmail.com",
  fromName: process.env.EMAIL_FROM_NAME || "YMA Bouncy Castle",
  adminEmail: "iamnahid591998@gmail.com",
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter connection
transporter.verify((error) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Generate product table HTML
const generateProductTable = (order: IOrderDocument): string => {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: bold;">Product</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: bold;">Price</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: bold;">Quantity</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: bold;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td style="padding: 12px; border: 1px solid #dee2e6;">${
              item.name
            }</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">$${item.price.toFixed(
              2
            )}</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">${
              item.quantity
            }</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">$${(
              item.price * item.quantity
            ).toFixed(2)}</td>
          </tr>
        `
          )
          .join("")}
        ${
          order.deliveryFee > 0
            ? `
          <tr>
            <td colspan="3" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Delivery Fee:</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">$${order.deliveryFee.toFixed(
              2
            )}</td>
          </tr>
        `
            : ""
        }
        ${
          order.overnightFee > 0
            ? `
          <tr>
            <td colspan="3" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Overnight Fee:</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">$${order.overnightFee.toFixed(
              2
            )}</td>
          </tr>
        `
            : ""
        }
        <tr style="font-weight: bold; background-color: #f1f1f1;">
          <td colspan="3" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Total Amount:</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">$${order.totalAmount.toFixed(
            2
          )}</td>
        </tr>
      </tbody>
    </table>
  `;
};

// Generate delivery address
const generateDeliveryAddress = (order: IOrderDocument): string => {
  const addr = order.shippingAddress;
  return `
    <p style="margin: 5px 0;">
      <strong>Address:</strong><br>
      ${addr.street}<br>
      ${addr.city}, ${addr.zipCode}<br>
      ${addr.country}
    </p>
    ${
      addr.companyName
        ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${addr.companyName}</p>`
        : ""
    }
    ${
      addr.locationAccessibility
        ? `<p style="margin: 5px 0;"><strong>Access:</strong> ${addr.locationAccessibility}</p>`
        : ""
    }
    <p style="margin: 5px 0;"><strong>Delivery Time:</strong> ${
      addr.deliveryTime || "8:00 AM - 12:00 PM"
    }</p>
    <p style="margin: 5px 0;"><strong>Collection Time:</strong> ${
      addr.collectionTime || "Before 5:00 PM"
    }</p>
    <p style="margin: 5px 0;"><strong>Keep Overnight:</strong> ${
      addr.keepOvernight ? "Yes" : "No"
    }</p>
    ${
      addr.hireOccasion
        ? `<p style="margin: 5px 0;"><strong>Occasion:</strong> ${addr.hireOccasion}</p>`
        : ""
    }
    ${
      addr.notes
        ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${addr.notes}</p>`
        : ""
    }
  `;
};

// Email templates
export const emailTemplates = {
  orderReceived: (order: IOrderDocument): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Received - YMA Bouncy Castle</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9f9f9;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, #4a90e2, #2c3e50);
          border-radius: 10px;
          color: white;
        }
        .logo { 
          max-width: 150px; 
          height: auto;
          margin-bottom: 15px;
        }
        .content { 
          background-color: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .button { 
          display: inline-block; 
          background-color: #28a745; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
          font-weight: bold;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .urgent { 
          background-color: #fff3cd; 
          border: 1px solid #ffeaa7; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
        }
        .contact-info {
          background-color: #e7f5ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        h1, h2, h3, h4 {
          color: #2c3e50;
        }
        .order-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
             alt="YMA Bouncy Castle" class="logo">
        <h1 style="color: white; margin: 10px 0;">We've Received Your Order 🎉</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${order.shippingAddress.firstName} ${
    order.shippingAddress.lastName
  }</strong>,</p>
        <p>Thank you for booking with <strong>YMA Bouncy Castle</strong> 🎈<br>
        We're excited to be part of your upcoming party!</p>
        
        <div class="order-details">
          <h3>🧾 Order Details</h3>
          <p><strong>Order ID:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString(
            "en-GB"
          )}</p>
          ${
            order.estimatedDeliveryDate
              ? `<p><strong>Estimated Delivery:</strong> ${new Date(
                  order.estimatedDeliveryDate
                ).toLocaleDateString("en-GB")}</p>`
              : ""
          }
          
          <h4>Delivery Information:</h4>
          ${generateDeliveryAddress(order)}
        </div>
        
        <div class="urgent">
          <h4>⚠️ Important – Events Within 72 Hours</h4>
          <p>If your party or event is happening within the next 72 hours, please call us immediately to confirm availability:</p>
          <div class="contact-info">
            <p style="font-size: 18px; margin: 10px 0;">
              📞 <strong>07951 431111</strong><br>
              📱 <strong>WhatsApp Available</strong>
            </p>
          </div>
        </div>
        
        <h3>Product Details</h3>
        ${generateProductTable(order)}
        
        <h3>🚚 What to Expect Next</h3>
        <p>Our team will review your order and contact you within 24 hours to confirm availability and delivery time.</p>
        <p>Please ensure someone is available at the delivery address during the selected time slot.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="tel:07951431111" class="button">Call Us Now</a>
        </div>
        
        <div class="contact-info">
          <p><strong>Need Help? Contact Us:</strong></p>
          <p>📞 07951 431111<br>
          📧 ${emailConfig.from}<br>
          🌐 www.ymabouncycastle.co.uk</p>
        </div>
      </div>
      
      <div class="footer">
        <p>YMA Bouncy Castle Team<br>
        Making your celebrations memorable since 2010</p>
        <p>📍 Bristol, UK | 📞 07951 431111</p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    </body>
    </html>
  `,

  orderConfirmed: (order: IOrderDocument): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed - YMA Bouncy Castle</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9f9f9;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, #28a745, #20c997);
          border-radius: 10px;
          color: white;
        }
        .logo { 
          max-width: 150px; 
          height: auto;
          margin-bottom: 15px;
        }
        .content { 
          background-color: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .checkmark { 
          color: #28a745; 
          font-size: 48px; 
          text-align: center; 
          margin: 20px 0;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .setup-guide { 
          background-color: #e7f5ff; 
          border: 1px solid #a5d8ff; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
        }
        .contact-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        h1, h2, h3, h4 {
          color: #2c3e50;
        }
        .confirmation {
          background-color: #d4edda;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          text-align: center;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
             alt="YMA Bouncy Castle" class="logo">
        <h1 style="color: white; margin: 10px 0;">Your Booking Is Confirmed ✅</h1>
      </div>
      
      <div class="content">
        <div class="checkmark">✅</div>
        
        <p>Hi <strong>${order.shippingAddress.firstName} ${
    order.shippingAddress.lastName
  }</strong>,</p>
        <div class="confirmation">
          <h3 style="color: #155724; margin: 0;">Great news! 🎉</h3>
          <p style="margin: 10px 0 0 0;">Your booking with <strong>YMA Bouncy Castle</strong> has been reviewed and confirmed by our team.</p>
        </div>
        
        <div class="setup-guide">
          <h4>✅ Confirmed Booking Details</h4>
          <p><strong>Order ID:</strong> ${order.orderNumber}</p>
          <p><strong>Confirmed Date:</strong> ${new Date().toLocaleDateString(
            "en-GB"
          )}</p>
          <p><strong>Status:</strong> Confirmed and scheduled for delivery</p>
          
          <h4>Delivery Information:</h4>
          ${generateDeliveryAddress(order)}
        </div>
        
        <h3>Product Details</h3>
        ${generateProductTable(order)}
        
        <div class="setup-guide">
          <h4>🧹 Important Setup Requirements</h4>
          <p>For safety and hygiene, please ensure the area is clean and clear before our arrival:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Remove dog or animal waste</li>
            <li>Clear wood, stones, or sharp objects</li>
            <li>Remove garden/backyard waste</li>
            <li>Ensure flat, clear surface (minimum 2m clearance all around)</li>
            <li>Make sure power socket is available within 30m radius</li>
          </ul>
          <p><strong>Note:</strong> Our team reserves the right to refuse setup if area is not suitable.</p>
        </div>
        
        <h4>🚚 What Happens Next</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Our delivery team will arrive within your selected time slot</li>
          <li>Please have someone available to receive and approve setup</li>
          <li>We'll handle installation, safety checks, and demonstration</li>
          <li>Payment is due upon delivery (cash or card accepted)</li>
        </ul>
        
        <div class="contact-info">
          <p><strong>Need to make changes or have questions?</strong></p>
          <p>📞 07951 431111<br>
          📱 WhatsApp Available<br>
          📧 ${emailConfig.from}</p>
          <p><em>Please quote your Order ID: ${order.orderNumber}</em></p>
        </div>
      </div>
      
      <div class="footer">
        <p>YMA Bouncy Castle Team<br>
        Thank you for choosing us for your celebration! 🎈</p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          This confirmation email serves as your booking receipt.
        </p>
      </div>
    </body>
    </html>
  `,

  deliveryReminder: (order: IOrderDocument): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Reminder - YMA Bouncy Castle</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9f9f9;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, #17a2b8, #138496);
          border-radius: 10px;
          color: white;
        }
        .logo { 
          max-width: 150px; 
          height: auto;
          margin-bottom: 15px;
        }
        .content { 
          background-color: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .reminder { 
          background-color: #fff3cd; 
          border: 1px solid #ffeaa7; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
        }
        .payment { 
          background-color: #d4edda; 
          border: 1px solid #c3e6cb; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .contact-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        h1, h2, h3, h4 {
          color: #2c3e50;
        }
        .countdown {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #17a2b8;
          margin: 20px 0;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
             alt="YMA Bouncy Castle" class="logo">
        <h1 style="color: white; margin: 10px 0;">Delivery Day Reminder 🎈</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${order.shippingAddress.firstName} ${
    order.shippingAddress.lastName
  }</strong>,</p>
        
        <div class="countdown">
          ⏰ Your delivery is scheduled for TOMORROW!
        </div>
        
        <p>We're getting everything ready for your <strong>YMA Bouncy Castle</strong> 🎉<br>
        Our team is preparing your castle to ensure it arrives clean, safe, and ready for fun!</p>
        
        <div class="reminder">
          <h4>🚚 Delivery Time Reminder</h4>
          <p><strong>Arrival Window:</strong> ${
            order.shippingAddress.deliveryTime || "8:00 AM - 12:00 PM"
          }</p>
          <p><em>Please note:</em> We operate within a time window. Please allow up to 30 minutes flexibility for traffic or previous deliveries.</p>
          <p><strong>Important:</strong> Someone must be present at the address to receive and approve the setup.</p>
        </div>
        
        <div class="payment">
          <h4>💷 Payment Information</h4>
          <p><strong>Total Amount Due:</strong> $${order.totalAmount.toFixed(
            2
          )}</p>
          <p><strong>Payment Method:</strong> ${
            order.paymentMethod === "cash_on_delivery"
              ? "Cash on Delivery"
              : "Credit Card"
          }</p>
          <p><strong>Accepted Payment:</strong> Cash, Credit/Debit Cards</p>
          <p><em>Please have the payment ready when our driver arrives.</em></p>
        </div>
        
        <h4>🧹 Final Setup Checklist</h4>
        <p>Before we arrive, please ensure:</p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>✅ Area is completely clear of debris, stones, and sharp objects</li>
          <li>✅ Grass is trimmed short (if setting up on grass)</li>
          <li>✅ Power socket is available within 30m</li>
          <li>✅ Path to setup area is clear (minimum 1.2m width)</li>
          <li>✅ Animal waste has been removed</li>
          <li>✅ You have decided on exact setup location</li>
        </ul>
        
        <div class="contact-info">
          <h4>📞 Running Late or Need to Reschedule?</h4>
          <p>If you need to adjust delivery time or have any questions:</p>
          <p style="font-size: 18px; margin: 10px 0;">
            📞 <strong>07951 431111</strong><br>
            📱 <strong>WhatsApp: Same Number</strong>
          </p>
          <p><em>Please call at least 2 hours before your scheduled time.</em></p>
        </div>
        
        <h3>Order Summary</h3>
        ${generateProductTable(order)}
        
        <div style="text-align: center; margin: 25px 0;">
          <p style="color: #666; font-size: 14px;">
            <strong>Reminder:</strong> This is an automated delivery reminder.<br>
            For urgent matters, please call us directly.
          </p>
        </div>
      </div>
      
      <div class="footer">
        <p>YMA Bouncy Castle Team<br>
        Looking forward to delivering the fun! 🎈</p>
        <p>📍 Bristol, UK | 📞 07951 431111 | 🌐 www.ymabouncycastle.co.uk</p>
      </div>
    </body>
    </html>
  `,

  orderCancelled: (order: IOrderDocument): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Cancelled - YMA Bouncy Castle</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9f9f9;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, #dc3545, #c82333);
          border-radius: 10px;
          color: white;
        }
        .logo { 
          max-width: 150px; 
          height: auto;
          margin-bottom: 15px;
        }
        .content { 
          background-color: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .cancelled { 
          color: #dc3545; 
          text-align: center; 
          font-size: 24px; 
          margin: 20px 0;
          font-weight: bold;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .rebook { 
          background-color: #f8f9fa; 
          border: 1px solid #dee2e6; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
          text-align: center;
        }
        .contact-info {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        h1, h2, h3, h4 {
          color: #2c3e50;
        }
        .cancellation-details {
          background-color: #f8d7da;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
             alt="YMA Bouncy Castle" class="logo">
        <h1 style="color: white; margin: 10px 0;">Order Cancellation</h1>
      </div>
      
      <div class="content">
        <div class="cancelled">❌ Order Cancelled</div>
        
        <p>Hi <strong>${order.shippingAddress.firstName} ${
    order.shippingAddress.lastName
  }</strong>,</p>
        <p>We're writing to confirm that your YMA Bouncy Castle order has been cancelled.</p>
        
        <div class="cancellation-details">
          <h4>❌ Cancelled Order Details</h4>
          <p><strong>Order ID:</strong> ${order.orderNumber}</p>
          <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString(
            "en-GB"
          )}</p>
          <p><strong>Status:</strong> Cancelled</p>
          ${
            order.adminNotes
              ? `<p><strong>Notes:</strong> ${order.adminNotes}</p>`
              : ""
          }
        </div>
        
        <h4>Order Summary</h4>
        ${generateProductTable(order)}
        
        <div class="rebook">
          <h4>🔁 Want to Rebook?</h4>
          <p>If you'd like to book for a different date or product, we'd be happy to help!</p>
          <p>We offer:</p>
          <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
            <li>Flexible rescheduling options</li>
            <li>Wide range of bouncy castles and inflatables</li>
            <li>Special discounts for rebooking within 30 days</li>
          </ul>
          <div class="contact-info">
            <p style="margin: 15px 0; font-size: 18px;">
              📞 <strong>07951 431111</strong><br>
              📱 <strong>WhatsApp Available</strong><br>
              📧 ${emailConfig.from}
            </p>
          </div>
        </div>
        
        <div style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h4>📋 Next Steps</h4>
          <p>1. If you requested this cancellation, no further action is needed.</p>
          <p>2. If you believe this was a mistake, contact us immediately.</p>
          <p>3. Any pending payments will be refunded within 5-7 business days.</p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="tel:07951431111" 
             style="display: inline-block; background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Contact Us to Rebook
          </a>
        </div>
      </div>
      
      <div class="footer">
        <p>YMA Bouncy Castle Team<br>
        We hope to be part of your celebration in the future 🎈</p>
        <p>📍 Bristol, UK | 📞 07951 431111 | 🌐 www.ymabouncycastle.co.uk</p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          This cancellation email serves as confirmation of order cancellation.
        </p>
      </div>
    </body>
    </html>
  `,

  invoice: (order: IOrderDocument, invoiceHtml: string): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - YMA Bouncy Castle</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9f9f9;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, #17a2b8, #138496);
          border-radius: 10px;
          color: white;
        }
        .logo { 
          max-width: 150px; 
          height: auto;
          margin-bottom: 15px;
        }
        .content { 
          background-color: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .invoice-btn { 
          display: inline-block; 
          background-color: #28a745; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0;
          font-weight: bold;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .amount-box {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: linear-gradient(135deg, #e7f5ff, #a5d8ff);
          border-radius: 10px;
        }
        .invoice-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .payment-info {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        h1, h2, h3, h4 {
          color: #2c3e50;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
             alt="YMA Bouncy Castle" class="logo">
        <h1 style="color: white; margin: 10px 0;">Your Invoice</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${order.shippingAddress.firstName} ${
    order.shippingAddress.lastName
  }</strong>,</p>
        <p>Please find your invoice attached for Order #${
          order.orderNumber
        }.</p>
        
        <div class="amount-box">
          <p style="margin: 0; font-size: 36px; font-weight: bold; color: #0056b3;">
            $${order.totalAmount.toFixed(2)}
          </p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">Total Amount</p>
        </div>
        
        <div class="invoice-details">
          <h4>📋 Invoice Summary</h4>
          <p><strong>Invoice #:</strong> INV-${order.orderNumber}</p>
          <p><strong>Invoice Date:</strong> ${new Date().toLocaleDateString(
            "en-GB"
          )}</p>
          <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString(
            "en-GB"
          )}</p>
          <p><strong>Invoice Type:</strong> ${
            order.invoiceType === "corporate"
              ? "Corporate Invoice"
              : "Regular Invoice"
          }</p>
          <p><strong>Status:</strong> ${
            order.status.charAt(0).toUpperCase() + order.status.slice(1)
          }</p>
        </div>
        
        <h4>Product Details</h4>
        ${generateProductTable(order)}
        
        <div class="payment-info">
          <h4>💳 Payment Details</h4>
          <p><strong>Payment Method:</strong> ${
            order.paymentMethod === "cash_on_delivery"
              ? "Cash on Delivery"
              : order.paymentMethod === "credit_card"
              ? "Credit Card"
              : "Online Payment"
          }</p>
          <p><strong>Payment Status:</strong> ${
            order.status === "delivered" ? "Paid" : "Pending"
          }</p>
          ${
            order.status !== "delivered"
              ? `
            <p><strong>Payment Due:</strong> Upon delivery</p>
            <p><em>Please have payment ready when our driver arrives.</em></p>
          `
              : ""
          }
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="#" class="invoice-btn">Download PDF Invoice</a>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <p><strong>Contact Information:</strong></p>
          <p>📞 07951 431111<br>
          📧 ${emailConfig.from}<br>
          🌐 www.ymabouncycastle.co.uk</p>
          <p style="font-size: 12px; color: #666;">
            Please quote Invoice #INV-${order.orderNumber} in all communications
          </p>
        </div>
      </div>
      
      <div class="footer">
        <p>YMA Bouncy Castle Team<br>
        Professional Bouncy Castle Hire Services</p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          This invoice is automatically generated. For any discrepancies, please contact us within 7 days.
        </p>
      </div>
    </body>
    </html>
  `,
};

// Email sending functions
export const sendOrderReceivedEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.orderReceived(order);

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `🎉 Order Received #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Thank you for your order ${
        order.orderNumber
      }. We've received your booking for ${order.items
        .map((i) => i.name)
        .join(", ")}. Delivery scheduled for ${
        order.shippingAddress.deliveryTime
      }. Contact: 07951 431111`,
    });

    console.log(
      `✅ Order received email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send order received email:", error);
    throw error;
  }
};

export const sendOrderConfirmedEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.orderConfirmed(order);

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `✅ Order Confirmed #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Your order ${order.orderNumber} has been confirmed. Delivery on schedule. Please ensure area is clean. Contact: 07951 431111`,
    });

    console.log(
      `✅ Order confirmed email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send order confirmed email:", error);
    throw error;
  }
};

export const sendDeliveryReminderEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.deliveryReminder(order);

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `⏰ Delivery Reminder #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Reminder: Your bouncy castle delivery is scheduled for ${order.shippingAddress.deliveryTime}. Please have payment ready. Contact: 07951 431111`,
    });

    console.log(
      `✅ Delivery reminder email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send delivery reminder email:", error);
    throw error;
  }
};

export const sendOrderCancelledEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.orderCancelled(order);

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `❌ Order Cancelled #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Your order ${order.orderNumber} has been cancelled. Contact us at 07951 431111 if you wish to rebook.`,
    });

    console.log(
      `✅ Order cancelled email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send order cancelled email:", error);
    throw error;
  }
};

// Send admin notification for new order
export const notifyAdminNewOrder = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const orderDetails = `
NEW ORDER RECEIVED
==================

Order #: ${order.orderNumber}
Customer: ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}
Email: ${order.shippingAddress.email}
Phone: ${order.shippingAddress.phone}
Order Date: ${order.createdAt.toLocaleString("en-GB")}
Total Amount: $${order.totalAmount.toFixed(2)}
Status: ${order.status.toUpperCase()}

PRODUCTS:
${order.items
  .map(
    (item) =>
      `- ${item.name} x${item.quantity}: $${(
        item.price * item.quantity
      ).toFixed(2)}`
  )
  .join("\n")}

DELIVERY ADDRESS:
${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.zipCode}
${order.shippingAddress.country}

DELIVERY DETAILS:
Delivery Time: ${order.shippingAddress.deliveryTime || "Standard (8am-12pm)"}
Collection Time: ${
      order.shippingAddress.collectionTime || "Standard (before 5pm)"
    }
Keep Overnight: ${order.shippingAddress.keepOvernight ? "YES" : "NO"}
Occasion: ${order.shippingAddress.hireOccasion || "Not specified"}
Notes: ${order.shippingAddress.notes || "None"}

PAYMENT:
Method: ${
      order.paymentMethod === "cash_on_delivery"
        ? "Cash on Delivery"
        : "Credit Card"
    }
Invoice Type: ${order.invoiceType}

ACTION REQUIRED:
1. Review order details
2. Confirm product availability
3. Schedule delivery
4. Contact customer if needed

================================
      `;

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: emailConfig.adminEmail,
      subject: `🚨 NEW ORDER: ${order.orderNumber} - $${order.totalAmount} - ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      text: orderDetails,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #dc3545; text-align: center;">🚨 NEW ORDER RECEIVED</h2>
          <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="color: #2c3e50;">Order #${order.orderNumber}</h3>
            <div style="margin: 15px 0;">
              <p><strong>Customer:</strong> ${
                order.shippingAddress.firstName
              } ${order.shippingAddress.lastName}</p>
              <p><strong>Email:</strong> ${order.shippingAddress.email}</p>
              <p><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
              <p><strong>Total Amount:</strong> <span style="color: #28a745; font-weight: bold;">$${order.totalAmount.toFixed(
                2
              )}</span></p>
              <p><strong>Status:</strong> <span style="background-color: #ffc107; padding: 2px 8px; border-radius: 3px;">${order.status.toUpperCase()}</span></p>
            </div>
            <hr>
            <h4>Products:</h4>
            <ul style="list-style: none; padding: 0;">
              ${order.items
                .map(
                  (item) => `
                <li style="padding: 5px 0; border-bottom: 1px solid #eee;">
                  ${item.name} x${item.quantity} - $${(
                    item.price * item.quantity
                  ).toFixed(2)}
                </li>
              `
                )
                .join("")}
            </ul>
            <hr>
            <h4>Delivery Address:</h4>
            <p>${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.zipCode}<br>
            ${order.shippingAddress.country}</p>
            <hr>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.BASE_URL}/admin/orders/${order._id}" 
                 style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Order Details
              </a>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`✅ Admin notification sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ Failed to send admin notification:", error);
    // Don't throw error for admin notifications to avoid blocking order creation
  }
};
// Add this function to your existing email.service.ts

export const sendInvoiceEmail = async (
  order: IOrderDocument,
  invoiceHtml: string
): Promise<void> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - YMA Bouncy Castle</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
                 alt="YMA Bouncy Castle" style="max-width: 150px;">
            <h1 style="color: #4CAF50;">Your Invoice</h1>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p>Hi <strong>${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }</strong>,</p>
            <p>Please find your invoice for Order #${
              order.orderNumber
            } attached.</p>
            
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #e7f5ff, #a5d8ff); border-radius: 10px;">
              <p style="margin: 0; font-size: 36px; font-weight: bold; color: #0056b3;">
                £${order.totalAmount.toFixed(2)}
              </p>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">Total Amount</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Invoice #:</strong> INV-${order.orderNumber}</p>
              <p><strong>Invoice Date:</strong> ${new Date().toLocaleDateString(
                "en-GB"
              )}</p>
              <p><strong>Payment Status:</strong> ${
                order.status === "delivered" ? "Paid" : "Pending"
              }</p>
              <p><strong>Payment Method:</strong> ${
                order.paymentMethod === "cash_on_delivery"
                  ? "Cash on Delivery"
                  : "Credit Card"
              }</p>
            </div>
            
            <p>You can also view and download your invoice from your account dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/orders/${order._id}" 
                 style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View Order Details
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p><strong>Need Help?</strong></p>
              <p>📞 07951 431111<br>
              📧 orders@ymabouncycastle.co.uk</p>
            </div>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p>YMA Bouncy Castle<br>
            Professional Bouncy Castle Hire Services</p>
            <p style="font-size: 12px; color: #999; margin-top: 10px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `🧾 Invoice #INV-${order.orderNumber} - YMA Bouncy Castle`,
      html: html,
      text: `Invoice for order ${order.orderNumber}. Total: £${order.totalAmount}. You can download the invoice from your account.`,
      attachments: [
        {
          filename: `invoice-${order.orderNumber}.html`,
          content: invoiceHtml,
          contentType: "text/html",
        },
      ],
    });

    console.log(`✅ Invoice email sent to ${order.shippingAddress.email}`);
  } catch (error) {
    console.error("❌ Failed to send invoice email:", error);
    throw error;
  }
};
