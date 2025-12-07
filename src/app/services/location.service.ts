// src/services/invoice.service.ts
import ejs from "ejs";
import path from "path";
import fs from "fs";
import Order, { IOrder } from "../models/order.model";

export async function generateInvoiceHtml(order: IOrder): Promise<string> {
  const templatePath = path.resolve(
    process.cwd(),
    "src",
    "views",
    "emails",
    "invoice.ejs"
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error("Invoice template not found");
  }

  const templateVars = {
    order,
    company: {
      name: "YMA Bouncy Castle",
      address: "123 Party Street, Entertainment City",
      phone: "+1 (555) 123-4567",
      email: "info@ymabouncycastle.com",
      website: "www.ymabouncycastle.com",
    },
    currentDate: new Date().toLocaleDateString(),
    year: new Date().getFullYear(),
  };

  return await ejs.renderFile(templatePath, templateVars, { async: true });
}

export async function generateAdminInvoiceHtml(
  order: IOrder
): Promise<string> {
  const templatePath = path.resolve(
    process.cwd(),
    "src",
    "views",
    "emails",
    "admin-invoice.ejs"
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error("Admin invoice template not found");
  }

  const templateVars = {
    order,
    company: {
      name: "YMA Bouncy Castle",
      address: "123 Party Street, Entertainment City",
      phone: "+1 (555) 123-4567",
      email: "info@ymabouncycastle.com",
      website: "www.ymabouncycastle.com",
      taxId: "TAX-123-456-789",
    },
    currentDate: new Date().toLocaleDateString(),
    year: new Date().getFullYear(),
  };

  return await ejs.renderFile(templatePath, templateVars, { async: true });
}
