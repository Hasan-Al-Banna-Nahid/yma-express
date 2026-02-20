// src/modules/order/email.service.ts
import { sendEmail } from "../../utils/resendEmail.service";
import { IOrderDocument } from "./order.interface";
import dotenv from "dotenv";
dotenv.config();

// Email configuration
interface EmailConfig {
  adminEmail: string;
}

const emailConfig: EmailConfig = {
  adminEmail: process.env.ADMIN_EMAIL || "admin@ymabouncycastle.co.uk",
};

// Generate product table HTML
const generateProductTable = (order: IOrderDocument): string => {
  return `
    <div style="margin: 20px 0; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; min-width: 600px; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white;">
            <th style="padding: 12px; text-align: left; border: none; font-weight: 600;">Product</th>
            <th style="padding: 12px; text-align: center; border: none; font-weight: 600;">Price</th>
            <th style="padding: 12px; text-align: center; border: none; font-weight: 600;">Qty</th>
            <th style="padding: 12px; text-align: right; border: none; font-weight: 600;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item, index) => `
            <tr style="${index % 2 === 0 ? "background-color: #f9f9f9;" : ""}">
              <td style="padding: 15px; border: none; border-bottom: 1px solid #e0e0e0;">
                <div style="font-weight: 600; color: #333;">${item.name}</div>
                ${
                  item.hireOccasion
                    ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">Occasion: ${item.hireOccasion}</div>`
                    : ""
                }
                ${
                  item.keepOvernight
                    ? `<div style="font-size: 12px; color: #2196F3; margin-top: 4px;">✨ Overnight Keep</div>`
                    : ""
                }
              </td>
              <td style="padding: 15px; text-align: center; border: none; border-bottom: 1px solid #e0e0e0; color: #333;">
                £${item.price.toFixed(2)}
              </td>
              <td style="padding: 15px; text-align: center; border: none; border-bottom: 1px solid #e0e0e0; color: #333;">
                ${item.quantity}
              </td>
              <td style="padding: 15px; text-align: right; border: none; border-bottom: 1px solid #e0e0e0; color: #333; font-weight: 600;">
                £${(item.price * item.quantity).toFixed(2)}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
        <tfoot style="background-color: #f5f5f5;">
          ${
            order.subtotalAmount > 0
              ? `
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #555;">
                Subtotal:
              </td>
              <td style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #555;">
                £${order.subtotalAmount.toFixed(2)}
              </td>
            </tr>
          `
              : ""
          }
          ${
            order.deliveryFee > 0
              ? `
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #555;">
                Delivery Fee:
              </td>
              <td style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #555;">
                £${order.deliveryFee.toFixed(2)}
              </td>
            </tr>
          `
              : ""
          }
          ${
            order.overnightFee > 0
              ? `
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #555;">
                Overnight Fee:
              </td>
              <td style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #555;">
                £${order.overnightFee.toFixed(2)}
              </td>
            </tr>
          `
              : ""
          }
          ${
            order.discountAmount > 0
              ? `
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #4CAF50;">
                Discount:
              </td>
              <td style="padding: 12px; text-align: right; border: none; font-weight: 600; color: #4CAF50;">
                -£${order.discountAmount.toFixed(2)}
              </td>
            </tr>
          `
              : ""
          }
          <tr style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white;">
            <td colspan="3" style="padding: 15px; text-align: right; border: none; font-weight: 700; font-size: 16px;">
              TOTAL:
            </td>
            <td style="padding: 15px; text-align: right; border: none; font-weight: 700; font-size: 16px;">
              £${order.totalAmount.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

// Generate delivery address
const generateDeliveryAddress = (order: IOrderDocument): string => {
  const addr = order.shippingAddress;
  return `
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #4CAF50; margin: 0 0 15px 0; font-size: 18px;">📍 Delivery Information</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div>
          <div style="font-weight: 600; color: #555; font-size: 13px;">Full Name</div>
          <div style="color: #333; margin-top: 4px;">${addr.firstName} ${
    addr.lastName
  }</div>
        </div>
        <div>
          <div style="font-weight: 600; color: #555; font-size: 13px;">Contact</div>
          <div style="color: #333; margin-top: 4px;">
            📞 ${addr.phone}<br>
            ✉️ ${addr.email}
          </div>
        </div>
        <div>
          <div style="font-weight: 600; color: #555; font-size: 13px;">Address</div>
          <div style="color: #333; margin-top: 4px;">
            ${addr.street}<br>
            ${addr.city}, ${addr.zipCode}<br>
            ${addr.country}
          </div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
        <div>
          <div style="font-weight: 600; color: #555; font-size: 13px;">Delivery Time</div>
          <div style="color: #333; margin-top: 4px; padding: 5px 10px; background: #e3f2fd; border-radius: 4px; display: inline-block;">
            ${addr.deliveryTime || "8:00 AM - 12:00 PM"}
          </div>
        </div>
        <div>
          <div style="font-weight: 600; color: #555; font-size: 13px;">Collection Time</div>
          <div style="color: #333; margin-top: 4px; padding: 5px 10px; background: #e8f5e8; border-radius: 4px; display: inline-block;">
            ${addr.collectionTime || "Before 5:00 PM"}
          </div>
        </div>
        <div>
          <div style="font-weight: 600; color: #555; font-size: 13px;">Keep Overnight</div>
          <div style="color: #333; margin-top: 4px; padding: 5px 10px; background: ${
            addr.keepOvernight ? "#fff3cd" : "#f8f9fa"
          }; border-radius: 4px; display: inline-block;">
            ${addr.keepOvernight ? "✅ Yes" : "❌ No"}
          </div>
        </div>
      </div>
      ${
        addr.hireOccasion
          ? `
        <div style="margin-top: 15px;">
          <div style="font-weight: 600; color: #555; font-size: 13px;">Occasion</div>
          <div style="color: #333; margin-top: 4px; padding: 5px 10px; background: #f3e5f5; border-radius: 4px; display: inline-block;">
            ${addr.hireOccasion}
          </div>
        </div>
      `
          : ""
      }
      ${
        addr.notes
          ? `
        <div style="margin-top: 15px;">
          <div style="font-weight: 600; color: #555; font-size: 13px;">Additional Notes</div>
          <div style="color: #333; margin-top: 4px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #4CAF50;">
            ${addr.notes}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
};

// Define ALL email templates
const emailTemplates = {
  orderReceived: (order: IOrderDocument): string => {
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - YMA Bouncy Castle</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; padding: 20px; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 40px 30px; text-align: center; color: white; }
          .logo { max-width: 150px; margin-bottom: 20px; }
          .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
          .header p { font-size: 16px; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .greeting { margin-bottom: 30px; }
          .greeting h2 { color: #4CAF50; font-size: 22px; margin-bottom: 10px; }
          .greeting p { color: #666; font-size: 16px; }
          .order-info { background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 5px solid #4CAF50; }
          .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
          .info-item { background: white; padding: 12px; border-radius: 8px; border: 1px solid #e0e0e0; }
          .info-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .info-value { font-size: 16px; font-weight: 600; color: #333; margin-top: 5px; }
          .urgent-notice { background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%); color: white; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center; }
          .urgent-notice h3 { font-size: 18px; margin-bottom: 10px; }
          .contact-box { background: #e3f2fd; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; border: 2px solid #2196F3; }
          .contact-box h4 { color: #1976D2; margin-bottom: 15px; }
          .contact-number { font-size: 24px; font-weight: 700; color: #1976D2; margin: 10px 0; }
          .whatsapp-badge { display: inline-block; background: #25D366; color: white; padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-weight: 600; }
          .action-buttons { display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap; }
          .btn { flex: 1; min-width: 200px; padding: 15px; text-align: center; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
          .btn-primary { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; }
          .btn-secondary { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; }
          .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
          .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
          .footer p { margin: 10px 0; opacity: 0.8; }
          .social-icons { display: flex; justify-content: center; gap: 15px; margin: 20px 0; }
          .social-icon { width: 40px; height: 40px; background: #4CAF50; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; text-decoration: none; }
          @media (max-width: 600px) {
            .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; }
            .action-buttons { flex-direction: column; }
            .btn { min-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
            <h1>🎉 Your Order is Confirmed!</h1>
            <p>Thank you for choosing YMA Bouncy Castle</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              <h2>Hi ${order.shippingAddress.firstName},</h2>
              <p>We're excited to confirm your booking! Our team is preparing everything for your special day.</p>
            </div>
            
            <div class="order-info">
              <h3 style="color: #4CAF50; margin-bottom: 20px;">📋 Order Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Order Number</div>
                  <div class="info-value">${order.orderNumber}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Order Date</div>
                  <div class="info-value">${orderDate}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Total Amount</div>
                  <div class="info-value" style="color: #4CAF50; font-size: 18px;">£${order.totalAmount.toFixed(
                    2
                  )}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value"><span style="background: #ff9800; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">Pending Confirmation</span></div>
                </div>
              </div>
            </div>
            
            ${generateDeliveryAddress(order)}
            
            <div class="urgent-notice">
              <h3>⚠️ IMPORTANT: Events Within 72 Hours</h3>
              <p>If your event is happening within the next 72 hours, please call us immediately to confirm availability!</p>
            </div>
            
            <h3 style="color: #4CAF50; margin: 30px 0 20px 0;">🛒 Order Summary</h3>
            ${generateProductTable(order)}
            
            <div class="contact-box">
              <h4>📞 Need Immediate Assistance?</h4>
              <div class="contact-number">07951 431111</div>
              <div class="whatsapp-badge">WhatsApp Available</div>
              <p style="margin-top: 10px; font-size: 14px;">Available 8 AM - 9 PM, 7 days a week</p>
            </div>
            
            <div class="action-buttons">
              <a href="tel:07951431111" class="btn btn-primary">📱 Call Us Now</a>
              <a href="https://wa.me/447951431111" class="btn btn-secondary">💬 WhatsApp Message</a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-top: 30px;">
              <h4 style="color: #4CAF50; margin-bottom: 15px;">📋 What Happens Next?</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div style="text-align: center; padding: 15px;">
                  <div style="background: #4CAF50; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-weight: bold;">1</div>
                  <div style="font-weight: 600; margin-bottom: 5px;">Order Review</div>
                  <div style="font-size: 14px; color: #666;">We'll review your order within 24 hours</div>
                </div>
                <div style="text-align: center; padding: 15px;">
                  <div style="background: #2196F3; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-weight: bold;">2</div>
                  <div style="font-weight: 600; margin-bottom: 5px;">Confirmation Call</div>
                  <div style="font-size: 14px; color: #666;">We'll call to confirm all details</div>
                </div>
                <div style="text-align: center; padding: 15px;">
                  <div style="background: #FF9800; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-weight: bold;">3</div>
                  <div style="font-weight: 600; margin-bottom: 5px;">Delivery Day</div>
                  <div style="font-size: 14px; color: #666;">We'll deliver at your scheduled time</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="social-icons">
              <a href="#" class="social-icon">FB</a>
              <a href="#" class="social-icon">IG</a>
              <a href="#" class="social-icon">TW</a>
            </div>
            <p>YMA Bouncy Castle | Making celebrations memorable since 2010</p>
            <p style="opacity: 0.8; margin-top: 10px;">📍 Bristol, UK | 📞 07951 431111 | ✉️ orders@ymabouncycastle.co.uk</p>
            <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  orderConfirmed: (order: IOrderDocument): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - YMA Bouncy Castle</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); min-height: 100vh; padding: 20px; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); padding: 40px 30px; text-align: center; color: white; position: relative; }
          .header:after { content: "✅"; font-size: 60px; position: absolute; right: 30px; top: 30px; opacity: 0.3; }
          .logo { max-width: 150px; margin-bottom: 20px; }
          .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .confirmation-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; }
          .setup-checklist { background: #fff8e1; border-radius: 12px; padding: 25px; margin: 30px 0; border: 2px solid #ffd54f; }
          .checklist-item { display: flex; align-items: flex-start; margin-bottom: 15px; }
          .checklist-item:last-child { margin-bottom: 0; }
          .check-icon { background: #4CAF50; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; }
          .payment-reminder { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center; }
          .payment-amount { font-size: 36px; font-weight: 700; margin: 10px 0; }
          .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
          @media (max-width: 600px) { .content { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
            <h1>🎉 Booking Confirmed!</h1>
            <p>Your YMA Bouncy Castle is scheduled for delivery</p>
          </div>
          
          <div class="content">
            <div class="confirmation-badge">✅ CONFIRMED & SCHEDULED</div>
            
            <h2 style="color: #4CAF50; margin-bottom: 20px;">Hi ${
              order.shippingAddress.firstName
            },</h2>
            <p style="font-size: 16px; margin-bottom: 20px; color: #555;">
              Great news! Your booking with <strong>YMA Bouncy Castle</strong> has been reviewed and confirmed by our team. 
              We're all set for your special day!
            </p>
            
            ${generateDeliveryAddress(order)}
            
            <div class="setup-checklist">
              <h3 style="color: #FF9800; margin-bottom: 20px;">🧹 Setup Requirements Checklist</h3>
              <div class="checklist-item">
                <div class="check-icon">✓</div>
                <div>
                  <strong>Clean, Clear Area</strong>
                  <p style="color: #666; font-size: 14px; margin-top: 5px;">Remove all debris, stones, and sharp objects from the setup area</p>
                </div>
              </div>
              <div class="checklist-item">
                <div class="check-icon">✓</div>
                <div>
                  <strong>Power Source</strong>
                  <p style="color: #666; font-size: 14px; margin-top: 5px;">Ensure power socket is available within 30m radius</p>
                </div>
              </div>
              <div class="checklist-item">
                <div class="check-icon">✓</div>
                <div>
                  <strong>Access Path</strong>
                  <p style="color: #666; font-size: 14px; margin-top: 5px;">Clear path (minimum 1.2m width) from vehicle to setup area</p>
                </div>
              </div>
              <div class="checklist-item">
                <div class="check-icon">✓</div>
                <div>
                  <strong>Animal Waste</strong>
                  <p style="color: #666; font-size: 14px; margin-top: 5px;">Remove all pet waste from the garden/backyard area</p>
                </div>
              </div>
              <div class="checklist-item">
                <div class="check-icon">⚠️</div>
                <div>
                  <strong>Important Note</strong>
                  <p style="color: #666; font-size: 14px; margin-top: 5px;">Our team reserves the right to refuse setup if area is not suitable for safety reasons</p>
                </div>
              </div>
            </div>
            
            <h3 style="color: #4CAF50; margin: 30px 0 20px 0;">🛒 Order Summary</h3>
            ${generateProductTable(order)}
            
            <div class="payment-reminder">
              <h3 style="margin-bottom: 15px;">💷 Payment Due Upon Delivery</h3>
              <div class="payment-amount">£${order.totalAmount.toFixed(2)}</div>
              <p>Accepted: Cash or Card Payments</p>
              <p style="font-size: 14px; margin-top: 10px;">Please have payment ready when our driver arrives</p>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 12px; margin-top: 30px;">
              <h4 style="color: #388E3C; margin-bottom: 15px;">📞 Need to Make Changes?</h4>
              <p style="color: #555; margin-bottom: 15px;">
                If you need to adjust your delivery time or have any questions, please contact us:
              </p>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #1976D2; margin: 10px 0;">07951 431111</div>
                <p style="color: #666; font-size: 14px;">Please quote your Order ID: ${
                  order.orderNumber
                }</p>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>YMA Bouncy Castle Team</p>
            <p style="opacity: 0.8; margin-top: 10px;">Thank you for choosing us for your celebration! 🎈</p>
            <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
              This confirmation email serves as your booking receipt.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  deliveryReminder: (order: IOrderDocument): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ready to be Delivered - YMA Bouncy Castle</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); min-height: 100vh; padding: 20px; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 40px 30px; text-align: center; color: white; }
          .logo { max-width: 150px; margin-bottom: 20px; }
          .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .countdown { text-align: center; font-size: 24px; font-weight: 700; color: #2196F3; margin: 20px 0; padding: 20px; background: #e3f2fd; border-radius: 12px; }
          .reminder-box { background: #fff8e1; border-radius: 12px; padding: 25px; margin: 30px 0; border: 2px solid #ffd54f; }
          .payment-box { background: #e8f5e9; border-radius: 12px; padding: 25px; margin: 30px 0; border: 2px solid #4CAF50; }
          .checklist { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
          .checklist-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: white; border-radius: 8px; }
          .checkmark { color: #4CAF50; font-weight: bold; }
          .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
          @media (max-width: 600px) { .content { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
            <h1>📦 Ready to be Delivered</h1>
            <p>Your YMA Bouncy Castle is arriving tomorrow!</p>
          </div>
          
          <div class="content">
            <div class="countdown">
              🎉 Your Delivery is Scheduled for TOMORROW!
            </div>
            
            <h2 style="color: #2196F3; margin-bottom: 20px;">Hi ${
              order.shippingAddress.firstName
            },</h2>
            <p style="font-size: 16px; margin-bottom: 20px; color: #555;">
              We're getting everything ready for your <strong>YMA Bouncy Castle</strong> delivery tomorrow! 
              Our team is preparing your castle to ensure it arrives clean, safe, and ready for fun!
            </p>
            
            <div class="reminder-box">
              <h3 style="color: #FF9800; margin-bottom: 15px;">🚚 Delivery Time Reminder</h3>
              <p><strong>Arrival Window:</strong> ${
                order.shippingAddress.deliveryTime || "8:00 AM - 12:00 PM"
              }</p>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">
                <em>Please note:</em> We operate within a time window. Please allow up to 30 minutes flexibility for traffic or previous deliveries.
              </p>
              <p style="color: #d32f2f; font-weight: 600; margin-top: 15px;">
                ⚠️ <strong>Important:</strong> Someone must be present at the address to receive and approve the setup.
              </p>
            </div>
            
            <div class="payment-box">
              <h3 style="color: #4CAF50; margin-bottom: 15px;">💷 Payment Information</h3>
              <div style="text-align: center; margin: 20px 0;">
                <div style="font-size: 32px; font-weight: 700; color: #4CAF50;">£${order.totalAmount.toFixed(
                  2
                )}</div>
                <p style="color: #666;">Total Amount Due</p>
              </div>
              <p><strong>Payment Method:</strong> ${
                order.paymentMethod === "cash_on_delivery"
                  ? "Cash on Delivery"
                  : "Credit Card"
              }</p>
              <p><strong>Accepted Payment:</strong> Cash, Credit/Debit Cards</p>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">
                <em>Please have the payment ready when our driver arrives.</em>
              </p>
            </div>
            
            <h3 style="color: #2196F3; margin: 30px 0 20px 0;">🧹 Final Setup Checklist</h3>
            <p style="margin-bottom: 15px;">Before we arrive, please ensure:</p>
            
            <div class="checklist">
              <div class="checklist-item">
                <span class="checkmark">✅</span>
                <span>Area is completely clear of debris, stones, and sharp objects</span>
              </div>
              <div class="checklist-item">
                <span class="checkmark">✅</span>
                <span>Grass is trimmed short (if setting up on grass)</span>
              </div>
              <div class="checklist-item">
                <span class="checkmark">✅</span>
                <span>Power socket is available within 30m</span>
              </div>
              <div class="checklist-item">
                <span class="checkmark">✅</span>
                <span>Path to setup area is clear (minimum 1.2m width)</span>
              </div>
              <div class="checklist-item">
                <span class="checkmark">✅</span>
                <span>Animal waste has been removed</span>
              </div>
              <div class="checklist-item">
                <span class="checkmark">✅</span>
                <span>You have decided on exact setup location</span>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h4 style="color: #1976D2; margin-bottom: 15px;">📞 Running Late or Need to Reschedule?</h4>
              <p style="margin-bottom: 15px;">If you need to adjust delivery time or have any questions:</p>
              <div style="font-size: 24px; font-weight: 700; color: #1976D2; margin: 15px 0;">
                📞 07951 431111<br>
                <span style="font-size: 16px; color: #25D366;">📱 WhatsApp Available</span>
              </div>
              <p style="color: #666; font-size: 14px;">
                <em>Please call at least 2 hours before your scheduled time.</em>
              </p>
            </div>
            
            <h3 style="color: #2196F3; margin: 30px 0 20px 0;">🛒 Order Summary</h3>
            ${generateProductTable(order)}
          </div>
          
          <div class="footer">
            <p>YMA Bouncy Castle Team</p>
            <p style="opacity: 0.8; margin-top: 10px;">Looking forward to delivering the fun! 🎈</p>
            <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
              This is an automated delivery reminder. For urgent matters, please call us directly.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  orderCancelled: (order: IOrderDocument): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Cancelled - YMA Bouncy Castle</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); min-height: 100vh; padding: 20px; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); padding: 40px 30px; text-align: center; color: white; }
          .logo { max-width: 150px; margin-bottom: 20px; }
          .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .cancellation-badge { background: #f44336; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; text-align: center; }
          .cancellation-details { background: #ffebee; border-radius: 12px; padding: 25px; margin: 30px 0; border: 2px solid #f44336; }
          .rebook-box { background: #e8f5e9; border-radius: 12px; padding: 25px; margin: 30px 0; border: 2px solid #4CAF50; }
          .next-steps { background: #f5f5f5; border-radius: 12px; padding: 25px; margin: 30px 0; }
          .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
          @media (max-width: 600px) { .content { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
            <h1>❌ Order Cancelled</h1>
            <p>YMA Bouncy Castle</p>
          </div>
          
          <div class="content">
            <div class="cancellation-badge">❌ ORDER CANCELLED</div>
            
            <h2 style="color: #f44336; margin-bottom: 20px;">Hi ${
              order.shippingAddress.firstName
            },</h2>
            <p style="font-size: 16px; margin-bottom: 20px; color: #555;">
              We're writing to confirm that your YMA Bouncy Castle order has been cancelled.
            </p>
            
            <div class="cancellation-details">
              <h3 style="color: #f44336; margin-bottom: 15px;">❌ Cancelled Order Details</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                  <div style="font-size: 12px; color: #888;">Order ID</div>
                  <div style="font-weight: 600; color: #333;">${
                    order.orderNumber
                  }</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #888;">Cancellation Date</div>
                  <div style="font-weight: 600; color: #333;">${new Date().toLocaleDateString(
                    "en-GB"
                  )}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #888;">Status</div>
                  <div style="font-weight: 600; color: #f44336;">Cancelled</div>
                </div>
              </div>
              ${
                order.adminNotes
                  ? `
                <div style="margin-top: 15px;">
                  <div style="font-size: 12px; color: #888;">Notes</div>
                  <div style="color: #333; padding: 10px; background: white; border-radius: 8px; margin-top: 5px;">
                    ${order.adminNotes}
                  </div>
                </div>
              `
                  : ""
              }
            </div>
            
            <h3 style="color: #333; margin: 30px 0 20px 0;">🛒 Order Summary</h3>
            ${generateProductTable(order)}
            
            <div class="rebook-box">
              <h3 style="color: #4CAF50; margin-bottom: 15px;">🔁 Want to Rebook?</h3>
              <p style="margin-bottom: 15px;">If you'd like to book for a different date or product, we'd be happy to help!</p>
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #4CAF50; margin-bottom: 10px;">We offer:</h4>
                <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
                  <li>Flexible rescheduling options</li>
                  <li>Wide range of bouncy castles and inflatables</li>
                  <li>Special discounts for rebooking within 30 days</li>
                </ul>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <div style="font-size: 20px; font-weight: 700; color: #1976D2; margin: 10px 0;">
                  📞 07951 431111<br>
                  <span style="font-size: 16px; color: #25D366;">📱 WhatsApp Available</span>
                </div>
              </div>
            </div>
            
            <div class="next-steps">
              <h3 style="color: #333; margin-bottom: 15px;">📋 Next Steps</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div style="padding: 15px; background: white; border-radius: 8px;">
                  <div style="font-weight: 600; color: #4CAF50; margin-bottom: 5px;">1. Cancellation Complete</div>
                  <div style="color: #666; font-size: 14px;">If you requested this cancellation, no further action is needed.</div>
                </div>
                <div style="padding: 15px; background: white; border-radius: 8px;">
                  <div style="font-weight: 600; color: #f44336; margin-bottom: 5px;">2. Mistake?</div>
                  <div style="color: #666; font-size: 14px;">If you believe this was a mistake, contact us immediately.</div>
                </div>
                <div style="padding: 15px; background: white; border-radius: 8px;">
                  <div style="font-weight: 600; color: #2196F3; margin-bottom: 5px;">3. Refunds</div>
                  <div style="color: #666; font-size: 14px;">Any pending payments will be refunded within 5-7 business days.</div>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:07951431111" 
                 style="display: inline-block; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
                Contact Us to Rebook
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>YMA Bouncy Castle Team</p>
            <p style="opacity: 0.8; margin-top: 10px;">We hope to be part of your celebration in the future 🎈</p>
            <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
              This cancellation email serves as confirmation of order cancellation.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  invoice: (order: IOrderDocument): string => {
    const invoiceDate = new Date().toLocaleDateString("en-GB");
    const dueDate = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toLocaleDateString("en-GB");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - YMA Bouncy Castle</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
          .email-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 40px 30px; text-align: center; color: white; }
          .logo { max-width: 150px; margin-bottom: 20px; }
          .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .invoice-preview { background: white; border: 2px solid #e0e0e0; border-radius: 12px; padding: 30px; margin: 30px 0; }
          .invoice-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #4CAF50; }
          .invoice-title { font-size: 28px; color: #333; font-weight: bold; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info, .customer-info { flex: 1; }
          .company-info h3, .customer-info h3 { color: #4CAF50; margin-bottom: 15px; font-size: 16px; }
          .company-info p, .customer-info p { margin-bottom: 5px; color: #555; font-size: 14px; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .invoice-table th { background: #4CAF50; color: white; padding: 12px; text-align: left; font-size: 14px; }
          .invoice-table td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
          .invoice-table tr:nth-child(even) { background: #f9f9f9; }
          .total-section { text-align: right; margin-top: 20px; }
          .total-row { display: flex; justify-content: flex-end; margin-bottom: 8px; }
          .total-label { width: 150px; text-align: right; padding-right: 20px; color: #555; font-size: 14px; }
          .total-value { width: 150px; text-align: right; font-weight: bold; font-size: 14px; }
          .grand-total { font-size: 20px; color: #4CAF50; margin-top: 10px; }
          .payment-info { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
          .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
          @media (max-width: 600px) { 
            .content { padding: 20px; }
            .invoice-details { flex-direction: column; }
            .invoice-header { flex-direction: column; text-align: center; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
            <h1>🧾 Your Invoice</h1>
            <p>Invoice #INV-${order.orderNumber}</p>
          </div>
          
          <div class="content">
            <h2 style="color: #2196F3; margin-bottom: 20px;">Hi ${
              order.shippingAddress.firstName
            },</h2>
            <p style="font-size: 16px; margin-bottom: 20px; color: #555;">
              Please find your invoice for Order #${order.orderNumber} below. 
              You can also download it from your account dashboard.
            </p>
            
            <div class="invoice-preview">
              <div class="invoice-header">
                <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" style="max-width: 120px;">
                <div class="invoice-title">INVOICE</div>
              </div>
              
              <div class="invoice-details">
                <div class="company-info">
                  <h3>From:</h3>
                  <p><strong>YMA Bouncy Castle</strong></p>
                  <p>Bristol, United Kingdom</p>
                  <p>Phone: 07951 431111</p>
                  <p>Email: orders@ymabouncycastle.co.uk</p>
                </div>
                <div class="customer-info">
                  <h3>Bill To:</h3>
                  <p><strong>${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }</strong></p>
                  <p>${order.shippingAddress.companyName || ""}</p>
                  <p>${order.shippingAddress.street}</p>
                  <p>${order.shippingAddress.city}, ${
      order.shippingAddress.zipCode
    }</p>
                  <p>${order.shippingAddress.country}</p>
                  <p>Email: ${order.shippingAddress.email}</p>
                  <p>Phone: ${order.shippingAddress.phone}</p>
                </div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap;">
                <div>
                  <p><strong>Invoice #:</strong> INV-${order.orderNumber}</p>
                  <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
                </div>
                <div>
                  <p><strong>Order #:</strong> ${order.orderNumber}</p>
                  <p><strong>Due Date:</strong> ${dueDate}</p>
                  <p><strong>Invoice Type:</strong> ${
                    order.invoiceType === "corporate" ? "Corporate" : "Regular"
                  }</p>
                </div>
              </div>
              
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.quantity}</td>
                      <td>£${item.price.toFixed(2)}</td>
                      <td>£${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                  ${
                    order.deliveryFee > 0
                      ? `
                    <tr>
                      <td colspan="3">Delivery Fee</td>
                      <td>£${order.deliveryFee.toFixed(2)}</td>
                    </tr>
                  `
                      : ""
                  }
                  ${
                    order.overnightFee > 0
                      ? `
                    <tr>
                      <td colspan="3">Overnight Keeping Fee</td>
                      <td>£${order.overnightFee.toFixed(2)}</td>
                    </tr>
                  `
                      : ""
                  }
                </tbody>
              </table>
              
              <div class="total-section">
                <div class="total-row">
                  <div class="total-label">Subtotal:</div>
                  <div class="total-value">£${order.subtotalAmount.toFixed(
                    2
                  )}</div>
                </div>
                ${
                  order.deliveryFee > 0
                    ? `
                  <div class="total-row">
                    <div class="total-label">Delivery Fee:</div>
                    <div class="total-value">£${order.deliveryFee.toFixed(
                      2
                    )}</div>
                  </div>
                `
                    : ""
                }
                ${
                  order.overnightFee > 0
                    ? `
                  <div class="total-row">
                    <div class="total-label">Overnight Fee:</div>
                    <div class="total-value">£${order.overnightFee.toFixed(
                      2
                    )}</div>
                  </div>
                `
                    : ""
                }
                <div class="total-row grand-total">
                  <div class="total-label">TOTAL:</div>
                  <div class="total-value">£${order.totalAmount.toFixed(
                    2
                  )}</div>
                </div>
              </div>
              
              <div class="payment-info">
                <h3 style="color: #4CAF50; margin-bottom: 10px; font-size: 16px;">Payment Information</h3>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Payment Method:</strong> ${
                  order.paymentMethod === "cash_on_delivery"
                    ? "Cash on Delivery"
                    : order.paymentMethod === "credit_card"
                    ? "Credit Card"
                    : "Online Payment"
                }</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Payment Status:</strong> ${
                  order.status === "delivered" ? "Paid" : "Pending"
                }</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Bank Details:</strong> ${
                  order.bankDetails ||
                  "Account details will be provided separately"
                }</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #777; font-size: 14px;">Thank you for choosing YMA Bouncy Castle!</p>
                <p style="color: #999; font-size: 12px; margin-top: 5px;">© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
              </div>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h4 style="color: #388E3C; margin-bottom: 15px;">💡 What's Next?</h4>
              <p style="color: #555; margin-bottom: 15px; font-size: 14px;">
                You can view and download this invoice anytime from your account dashboard.
              </p>
              <a href="${
                process.env.FRONTEND_URL || "https://ymabouncycastle.co.uk"
              }/dashboard/orders/${order._id}" 
                 style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 10px;">
                View Order in Dashboard
              </a>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 12px; margin-top: 30px; text-align: center;">
              <h4 style="color: #1976D2; margin-bottom: 15px;">📞 Need Help?</h4>
              <div style="font-size: 18px; font-weight: 700; color: #1976D2; margin: 10px 0;">
                📞 07951 431111
              </div>
              <p style="color: #666; margin: 5px 0; font-size: 14px;">📧 accounts@ymabouncycastle.co.uk</p>
              <p style="color: #666; font-size: 12px; margin-top: 10px;">
                Please quote Invoice #INV-${
                  order.orderNumber
                } in all communications
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>YMA Bouncy Castle | Professional Bouncy Castle Hire Services</p>
            <p style="opacity: 0.8; margin-top: 10px; font-size: 14px;">📍 Bristol, UK | 📞 07951 431111</p>
            <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
              This invoice is automatically generated. For any discrepancies, please contact us within 7 days.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};

// Email sending functions
export const sendOrderReceivedEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.orderReceived(order);

    await sendEmail({
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `🎉 Order Confirmation #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Thank you for your order ${order.orderNumber}. We've received your booking. Contact: 07951 431111`,
    });

    console.log(
      `✅ Order received email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send order received email:", error);
  }
};

export const sendOrderConfirmedEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.orderConfirmed(order);

    await sendEmail({
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `✅ Booking Confirmed #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Your order ${order.orderNumber} has been confirmed. Delivery on schedule. Contact: 07951 431111`,
    });

    console.log(
      `✅ Order confirmed email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send order confirmed email:", error);
  }
};

export const sendDeliveryReminderEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.deliveryReminder(order);

    await sendEmail({
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `📦 Ready to be Delivered #${order.orderNumber} - YMA Bouncy Castle`,
      html,
      text: `Ready to be delivered tomorrow: your order ${order.orderNumber} is scheduled for ${order.shippingAddress.deliveryTime}. Contact: 07951 431111`,
    });

    console.log(
      `✅ Delivery reminder email sent to ${order.shippingAddress.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send delivery reminder email:", error);
  }
};

export const sendOrderCancelledEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.orderCancelled(order);

    await sendEmail({
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
  }
};

// Send invoice email WITHOUT attachments
export const sendInvoiceEmail = async (
  order: IOrderDocument
): Promise<void> => {
  try {
    const html = emailTemplates.invoice(order);

    await sendEmail({
      to: order.shippingAddress.email,
      bcc: emailConfig.adminEmail,
      subject: `🧾 Invoice #INV-${order.orderNumber} - YMA Bouncy Castle`,
      html: html,
      text: `Invoice for order ${order.orderNumber}. Total: £${order.totalAmount}.`,
      // NO ATTACHMENTS - invoice is included in email body
    });

    console.log(`✅ Invoice email sent to ${order.shippingAddress.email}`);
  } catch (error) {
    console.error("❌ Failed to send invoice email:", error);
    throw error;
  }
};

// Send admin notification
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
Total: £${order.totalAmount.toFixed(2)}
Status: ${order.status.toUpperCase()}

ACTION REQUIRED: Review and confirm order
================================
      `;

    await sendEmail({
      to: emailConfig.adminEmail,
      subject: `🚨 NEW ORDER: ${order.orderNumber} - £${order.totalAmount} - ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      text: orderDetails,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545; text-align: center;">🚨 NEW ORDER RECEIVED</h2>
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="color: #2c3e50;">Order #${order.orderNumber}</h3>
            <div style="margin: 15px 0;">
              <p><strong>Customer:</strong> ${
                order.shippingAddress.firstName
              } ${order.shippingAddress.lastName}</p>
              <p><strong>Email:</strong> ${order.shippingAddress.email}</p>
              <p><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
              <p><strong>Total Amount:</strong> <span style="color: #28a745; font-weight: bold;">£${order.totalAmount.toFixed(
                2
              )}</span></p>
              <p><strong>Status:</strong> <span style="background: #ffc107; padding: 2px 8px; border-radius: 3px;">${order.status.toUpperCase()}</span></p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.ADMIN_URL || ""}/orders/${order._id}" 
                 style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
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
  }
};
