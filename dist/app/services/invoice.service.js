"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceHtml = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const generateInvoiceHtml = async (order) => {
    const templatePath = path_1.default.resolve(__dirname, "../views/emails/invoice.ejs");
    if (!fs_1.default.existsSync(templatePath)) {
        // Fallback template
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .invoice { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .total { text-align: right; font-size: 1.2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>YMA Bouncy Castle</h1>
            <h2>INVOICE</h2>
            <p>Order Number: ${order.orderNumber}</p>
          </div>
          <div class="details">
            <div>
              <h3>Bill To:</h3>
              <p>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
              <p>${order.shippingAddress.email}</p>
              <p>${order.shippingAddress.phone}</p>
              <p>${order.shippingAddress.street}</p>
              <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
            </div>
            <div>
              <p><strong>Invoice Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
            .map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>£${item.price.toFixed(2)}</td>
                  <td>£${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `)
            .join("")}
            </tbody>
          </table>
          <div class="total">
            <h3>Total Amount: £${order.totalAmount.toFixed(2)}</h3>
          </div>
          <div style="margin-top: 30px; padding: 20px; background: #f9f9f9;">
            <p>Thank you for your business!</p>
            <p>YMA Bouncy Castle<br>
            Email: info@ymabouncycastle.com<br>
            Phone: +44 (0) 1234 567890</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    const template = fs_1.default.readFileSync(templatePath, "utf-8");
    return ejs_1.default.render(template, {
        order,
        year: new Date().getFullYear(),
        brandColor: "#7C3AED",
    });
};
exports.generateInvoiceHtml = generateInvoiceHtml;
