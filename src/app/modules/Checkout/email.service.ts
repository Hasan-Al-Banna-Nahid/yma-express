// src/services/checkout/email.service.ts
import nodemailer from "nodemailer";
import { IOrder } from "../../modules/UserOrder/order.model";

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
  return `$${amount.toFixed(2)}`;
};

const formatDate = (date?: Date | string): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (
  order: IOrder
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const customerEmail = order.shippingAddress.email;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    const orderId = order.orderNumber;
    const orderDate = formatDate(order.createdAt);

    // Calculate totals
    const subtotal = order.totalAmount;
    const shippingFee =
      order.paymentMethod === "credit_card" || order.paymentMethod === "online"
        ? 0
        : 15.0;
    const tax = subtotal * 0.1;
    const total = subtotal + shippingFee + tax;

    // Build items HTML
    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
          item.name
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${
          item.quantity
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
          item.price
        )}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
          item.price * item.quantity
        )}</td>
      </tr>
    `
      )
      .join("");

    // Email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #f2f2f2; padding: 10px; text-align: left; }
        .total-row { font-weight: bold; font-size: 1.1em; border-top: 2px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Order Confirmed!</h1>
        <p>Thank you for your purchase, ${customerName}!</p>
    </div>
    
    <div class="content">
        <div class="card">
            <h2>Order Details</h2>
            <p><strong>Order Number:</strong> ${orderId}</p>
            <p><strong>Order Date:</strong> ${orderDate}</p>
            <p><strong>Status:</strong> <span style="color: #4CAF50;">${order.status.toUpperCase()}</span></p>
            <p><strong>Payment Method:</strong> ${
              order.paymentMethod === "credit_card" ||
              order.paymentMethod === "online"
                ? "Online Payment"
                : "Cash on Delivery"
            }</p>
            <p><strong>Invoice Type:</strong> ${order.invoiceType.toUpperCase()}</p>
            ${
              order.bankDetails
                ? `<p><strong>Bank Details:</strong><br>${order.bankDetails}</p>`
                : ""
            }
        </div>

        <div class="card">
            <h2>Order Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 10px;">Subtotal:</td>
                        <td style="text-align: right; padding: 10px;">${formatCurrency(
                          subtotal
                        )}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 10px;">Shipping:</td>
                        <td style="text-align: right; padding: 10px;">${formatCurrency(
                          shippingFee
                        )}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 10px;">Tax (10%):</td>
                        <td style="text-align: right; padding: 10px;">${formatCurrency(
                          tax
                        )}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="3" style="text-align: right; padding: 10px;">Total:</td>
                        <td style="text-align: right; padding: 10px;">${formatCurrency(
                          total
                        )}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="card">
            <h2>Shipping Information</h2>
            <p><strong>Name:</strong> ${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }</p>
            <p><strong>Address:</strong> ${order.shippingAddress.street}${
      order.shippingAddress.apartment
        ? `, ${order.shippingAddress.apartment}`
        : ""
    }</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.zipCode
    }</p>
            <p>${order.shippingAddress.country}</p>
            <p><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
            <p><strong>Email:</strong> ${order.shippingAddress.email}</p>
            ${
              order.shippingAddress.deliveryTime
                ? `<p><strong>Preferred Delivery Time:</strong> ${order.shippingAddress.deliveryTime}</p>`
                : ""
            }
            ${
              order.shippingAddress.notes
                ? `<p><strong>Notes:</strong> ${order.shippingAddress.notes}</p>`
                : ""
            }
        </div>

        ${
          order.estimatedDeliveryDate
            ? `
        <div class="card">
            <h2>Delivery Estimate</h2>
            <p>Your order is estimated to be delivered by: <strong>${formatDate(
              order.estimatedDeliveryDate
            )}</strong></p>
        </div>
        `
            : ""
        }

        <div class="footer">
            <p>If you have any questions, contact our support team at support@ymabouncycastle.com</p>
            <p>© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    // Plain text version
    const text = `
ORDER CONFIRMATION #${orderId}

Dear ${customerName},

Thank you for your order! Your order has been confirmed and is being processed.

ORDER DETAILS:
Order Number: ${orderId}
Order Date: ${orderDate}
Status: ${order.status}
Payment Method: ${
      order.paymentMethod === "credit_card" || order.paymentMethod === "online"
        ? "Online Payment"
        : "Cash on Delivery"
    }
Invoice Type: ${order.invoiceType}

ORDER SUMMARY:
${order.items
  .map(
    (item) =>
      `${item.name} x ${item.quantity} = ${formatCurrency(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

Subtotal: ${formatCurrency(subtotal)}
Shipping: ${formatCurrency(shippingFee)}
Tax (10%): ${formatCurrency(tax)}
Total: ${formatCurrency(total)}

SHIPPING INFORMATION:
Name: ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}
Address: ${order.shippingAddress.street}${
      order.shippingAddress.apartment
        ? `, ${order.shippingAddress.apartment}`
        : ""
    }
${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.zipCode
    }
${order.shippingAddress.country}
Phone: ${order.shippingAddress.phone}
Email: ${order.shippingAddress.email}
${
  order.shippingAddress.deliveryTime
    ? `Preferred Delivery Time: ${order.shippingAddress.deliveryTime}`
    : ""
}
${order.shippingAddress.notes ? `Notes: ${order.shippingAddress.notes}` : ""}

Estimated Delivery: ${formatDate(order.estimatedDeliveryDate)}

If you have any questions, contact our support team at support@ymabouncycastle.com

© ${new Date().getFullYear()} YMA Bouncy Castle
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "YMA Bouncy Castle"}" <${
        process.env.EMAIL_FROM
      }>`,
      to: customerEmail,
      subject: `🎉 Order Confirmation #${orderId} - YMA Bouncy Castle`,
      html: html,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Order confirmation sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
    return false;
  }
};

// Send admin notification
export const sendOrderNotificationToAdmin = async (
  order: IOrder
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || "admin@ymabouncycastle.com";
    const orderId = order.orderNumber;
    const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #d32f2f;">🚨 NEW ORDER NOTIFICATION</h2>
    
    <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <strong style="color: #d32f2f;">ACTION REQUIRED:</strong> New order received and needs processing
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Order Number:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Amount:</strong> ${formatCurrency(order.totalAmount)}</p>
        <p><strong>Payment Method:</strong> ${
          order.paymentMethod === "credit_card" ||
          order.paymentMethod === "online"
            ? "Online"
            : "Cash on Delivery"
        }</p>
        <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
        <p><strong>Invoice Type:</strong> ${order.invoiceType.toUpperCase()}</p>
        <p><strong>Terms Accepted:</strong> ${
          order.termsAccepted ? "Yes" : "No"
        }</p>
        <p><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
    </div>
    
    <div style="margin: 15px 0;">
        <h3>Customer Contact:</h3>
        <p>📞 Phone: ${order.shippingAddress.phone}</p>
        <p>✉️ Email: ${order.shippingAddress.email}</p>
    </div>
    
    <div style="margin: 15px 0;">
        <h3>Delivery Address:</h3>
        <p>${order.shippingAddress.street}${
      order.shippingAddress.apartment
        ? `, ${order.shippingAddress.apartment}`
        : ""
    }</p>
        <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.zipCode
    }</p>
        <p>${order.shippingAddress.country}</p>
    </div>
    
    <div style="margin: 15px 0;">
        <h3>Items (${order.items.length}):</h3>
        <ul>
            ${order.items
              .map(
                (item) =>
                  `<li>${item.name} (x${item.quantity}) - ${formatCurrency(
                    item.price * item.quantity
                  )}</li>`
              )
              .join("")}
        </ul>
        <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
    </div>
    
    ${
      order.bankDetails
        ? `
    <div style="margin: 15px 0;">
        <h3>Bank Details:</h3>
        <p>${order.bankDetails}</p>
    </div>
    `
        : ""
    }
    
    <hr style="margin: 20px 0;">
    <p style="color: #666; font-size: 0.9em;">
        This is an automated notification from YMA Bouncy Castle Order System
    </p>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "YMA Bouncy Castle"}" <${
        process.env.EMAIL_FROM
      }>`,
      to: adminEmail,
      subject: `📦 NEW ORDER #${orderId} - ${customerName}`,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Admin notification sent for order #${orderId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
    return false;
  }
};
