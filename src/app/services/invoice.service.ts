import ApiError from "../utils/apiError";
import Invoice from "../models/invoice.model";
import Booking from "../models/booking.model";
import { IInvoice } from "../interfaces/invoice.interface";
// import { sendTemplatedEmail } from "./email.service";
import { Types } from "mongoose";

const generateInvoiceNumber = () => {
  const prefix = "INV";
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${month}${randomNum}`;
};

// Minimal shape we need for emails after populating
type UserMinimal = { _id: Types.ObjectId; name: string; email: string };

// Input type for creating invoices: we generate invoiceNumber ourselves
type CreateInvoiceInput = Omit<
  IInvoice,
  "invoiceNumber" | "user" | "booking"
> & {
  user: string | Types.ObjectId;
  booking?: string | Types.ObjectId;
};

export const createInvoice = async (invoiceData: CreateInvoiceInput) => {
  // If a booking is provided, validate it exists
  if (invoiceData.booking) {
    const exists = await Booking.exists({ _id: invoiceData.booking });
    if (!exists) throw new ApiError("No booking found with that ID", 404);
  }

  const invoiceNumber = generateInvoiceNumber();

  const created = await Invoice.create({
    ...invoiceData,
    invoiceNumber,
  });

  // Populate user for email fields
  const populated = await created.populate<{ user: UserMinimal }>({
    path: "user",
    select: "name email",
  });

  const user = populated.user as unknown as UserMinimal;
  if (!user?.email) {
    // If your system allows users without email, skip sending
    return populated;
  }

  // await sendEmail({
  //     email: user.email,
  //     subject: `Your Invoice #${invoiceNumber}`,
  //     template: 'invoiceCreated',
  //     templateVars: {
  //         name: user.name,
  //         invoiceNumber: populated.invoiceNumber,
  //         issueDate: populated.issueDate.toLocaleDateString(),
  //         dueDate: populated.dueDate.toLocaleDateString(),
  //         amount: populated.amount,
  //         totalAmount: populated.totalAmount,
  //     },
  // });

  return populated;
};

export const getInvoice = async (id: string) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new ApiError("No invoice found with that ID", 404);
  }
  return invoice;
};

export const getInvoices = async (filter: any = {}) => {
  return await Invoice.find(filter);
};

export const getInvoicesByUser = async (userId: string) => {
  return await Invoice.find({ user: userId });
};

export const getInvoicesByBooking = async (bookingId: string) => {
  return await Invoice.find({ booking: bookingId });
};

export const updateInvoice = async (
  id: string,
  updateData: Partial<IInvoice>
) => {
  const invoice = await Invoice.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!invoice) {
    throw new ApiError("No invoice found with that ID", 404);
  }

  // If status updated to paid, send payment confirmation email
  if (updateData.status === "paid") {
    const populated = await invoice.populate<{ user: UserMinimal }>({
      path: "user",
      select: "name email",
    });
    const user = populated.user as unknown as UserMinimal;

    if (user?.email) {
      // await sendEmail({
      //     email: user.email,
      //     subject: `Payment Received for Invoice #${populated.invoiceNumber}`,
      //     template: 'invoicePaid',
      //     templateVars: {
      //         name: user.name,
      //         invoiceNumber: populated.invoiceNumber,
      //         paymentDate: new Date().toLocaleDateString(),
      //         amount: populated.amount,
      //     },
      // });
    }
  }

  return invoice;
};

export const deleteInvoice = async (id: string) => {
  const invoice = await Invoice.findByIdAndDelete(id);

  if (!invoice) {
    throw new ApiError("No invoice found with that ID", 404);
  }

  return invoice;
};

export const generateInvoiceForBooking = async (
  bookingId: string,
  isOrganization = false
) => {
  const booking = await Booking.findById(bookingId)
    .populate("user")
    .populate("product");
  if (!booking) {
    throw new ApiError("No booking found with that ID", 404);
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

  const invoiceData: CreateInvoiceInput = {
    booking: bookingId,
    user: booking.user._id, // ObjectId
    issueDate: new Date(),
    dueDate,
    amount: booking.price,
    tax: 0,
    discount: 0,
    totalAmount: booking.price,
    status: "sent",
    paymentMethod: "cash",
    isOrganization,
    showCashOnDelivery: !isOrganization,
  };

  return await createInvoice(invoiceData);
};

export const generateCustomInvoice = async (
  userId: string,
  amount: number,
  description: string,
  isOrganization: boolean
) => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

  const invoiceData: CreateInvoiceInput = {
    user: userId, // string OK
    issueDate: new Date(),
    dueDate,
    amount,
    tax: 0,
    discount: 0,
    totalAmount: amount,
    status: "sent",
    paymentMethod: "bank-transfer",
    notes: description,
    isOrganization,
    showCashOnDelivery: !isOrganization,
    // no booking for custom invoices
  };

  return await createInvoice(invoiceData);
};
