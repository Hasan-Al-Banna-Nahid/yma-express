// src/app/modules/Invoice/invoice.service.ts
import mongoose from "mongoose";
import Invoice from "./invoice.model";
import { IInvoice } from "./invoice.interface";
import { IOrder } from "../../modules/UserOrder/order.model";

// Get all invoices
export const getAllInvoices = async () => {
  return await Invoice.find()
    .populate("user")
    .populate("booking")
    .sort({ createdAt: -1 });
};

// Get invoice by ID
export const getInvoiceById = async (id: string) => {
  return await Invoice.findById(id).populate("user").populate("booking");
};

// Create invoice
export const createInvoice = async (invoiceData: IInvoice) => {
  return await Invoice.create(invoiceData);
};

// Update invoice
export const updateInvoice = async (
  id: string,
  updateData: Partial<IInvoice>
) => {
  return await Invoice.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

// Delete invoice
export const deleteInvoice = async (id: string) => {
  return await Invoice.findByIdAndDelete(id);
};

// Get invoices by booking
export const getInvoicesByBooking = async (bookingId: string) => {
  return await Invoice.find({ booking: bookingId })
    .populate("user")
    .populate("booking")
    .sort({ createdAt: -1 });
};

// Get invoices by user
export const getInvoicesByUser = async (userId: string) => {
  return await Invoice.find({ user: userId })
    .populate("booking")
    .sort({ createdAt: -1 });
};

// Update invoice status
export const updateInvoiceStatus = async (
  invoiceId: string,
  status: "draft" | "sent" | "paid" | "cancelled"
) => {
  return await Invoice.findByIdAndUpdate(
    invoiceId,
    { status },
    { new: true, runValidators: true }
  );
};

// Generate invoice HTML from order
export async function generateInvoiceHtml(order: IOrder): Promise<string> {
  // Simplified HTML template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice</title>
    </head>
    <body>
      <h1>Invoice for Order #${order.orderNumber}</h1>
      <p>Total: $${order.totalAmount}</p>
    </body>
    </html>
  `;
}

// Generate custom invoice HTML
export async function generateCustomInvoiceHtml(
  invoiceData: any
): Promise<string> {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Custom Invoice #${invoiceData.invoiceNumber}</title>
    </head>
    <body>
      <h1>Custom Invoice</h1>
      <p>Customer: ${invoiceData.customerEmail}</p>
      <p>Total: $${invoiceData.totalAmount}</p>
    </body>
    </html>
  `;
}
