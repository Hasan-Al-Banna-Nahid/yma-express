import nodemailer from "nodemailer";
import ApiError from "../../utils/apiError";
import dotenv from "dotenv";
dotenv.config();
interface OrderEmailData {
  to: string;
  customerName: string;
  orderId: string;
  eventDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  totalAmount: number;
  orderItems: Array<{
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

const getEmailTemplate = (template: string, data: OrderEmailData): string => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";

  const itemsHtml = data.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">£${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">£${item.subtotal.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd;">
      <div style="background: #4CAF50; padding: 20px; text-align: center;">
        <img src="${logoUrl}" width="150" alt="YMA Bouncy Castle">
      </div>
      <div style="padding: 20px;">
        <h2 style="color: #333;">Order Preparation Confirmed!</h2>
        <p>Hi <strong>${data.customerName}</strong>,</p>
        <p>We have prepared your reorder request. Here are the details:</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
          <p><strong>Order Ref:</strong> ${data.orderId}</p>
          <p><strong>Event Date:</strong> ${data.eventDate}</p>
          <p><strong>Address:</strong> ${data.deliveryAddress}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #eee;">
              <th style="text-align: left; padding: 10px;">Item</th>
              <th style="text-align: left; padding: 10px;">Qty</th>
              <th style="text-align: left; padding: 10px;">Price</th>
              <th style="text-align: left; padding: 10px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <h3 style="text-align: right; color: #4CAF50;">Total: £${data.totalAmount.toFixed(2)}</h3>
      </div>
      <div style="background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>YMA Bouncy Castle | 📞 07951 431111</p>
      </div>
    </div>
  `;
};

export const sendCustomerOrderEmail = async (
  template: string,
  data: OrderEmailData,
) => {
  const html = getEmailTemplate(template, data);
  await transporter.sendMail({
    from: `"YMA Bouncy Castle" <${process.env.EMAIL_FROM}>`,
    to: data.to,
    subject: `Reorder Details for ${data.customerName} - YMA Bouncy Castle`,
    html,
  });
};
