import mongoose, { Schema, Document } from "mongoose";
import { IInvoice } from "./invoice.interface";

// Use type instead of interface to avoid conflicts
export type IInvoiceModel = IInvoice & Document;

const InvoiceSchema: Schema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    booking: { type: Schema.Types.ObjectId, ref: "Order" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "cancelled"],
      default: "draft",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank-transfer", "credit-card", "other"],
    },
    notes: { type: String },
    isOrganization: { type: Boolean, default: false },
    organizationName: { type: String },
    showCashOnDelivery: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Generate unique invoice number before saving
InvoiceSchema.pre<IInvoiceModel>("save", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const Invoice = mongoose.model<IInvoiceModel>("Invoice");
    const latestInvoice = await Invoice.findOne(
      {},
      {},
      { sort: { createdAt: -1 } }
    );
    let nextNumber = 1;
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const lastNum = parseInt(
        latestInvoice.invoiceNumber.split("-").pop() || "0"
      );
      nextNumber = lastNum + 1;
    }
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(
      nextNumber
    ).padStart(5, "0")}`;
  }
  next();
});

const Invoice = mongoose.model<IInvoiceModel>("Invoice", InvoiceSchema);

export default Invoice;
