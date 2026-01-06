// src/app/modules/Invoice/invoice.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import * as invoiceService from "./invoice.service";
import * as orderService from "../../modules/UserOrder/order.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { IInvoice } from "./invoice.interface";
import mongoose, { Mongoose } from "mongoose";

// Utility to generate invoice number
const generateInvoiceNumber = async (): Promise<string> => {
  const prefix = "INV";
  const datePart = new Date().getFullYear().toString().slice(-2);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const invoices = await invoiceService.getAllInvoices();
  const count = invoices.length + 1;
  return `${prefix}-${datePart}-${count}-${randomPart}`;
};

// 1. Create Invoice
export const createInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      user,
      booking,
      amount,
      tax,
      discount,
      totalAmount,
      isOrganization,
      organizationName,
      // Don't destructure issueDate and dueDate if they're in rest
      ...rest
    } = req.body;
    const aReq = req as AuthenticatedRequest;

    if (!user && !aReq.user?._id) {
      throw new ApiError("User ID is required for invoice creation", 400);
    }

    // Create invoice data without duplicate properties
    const invoiceData: IInvoice = {
      ...rest, // This should NOT include issueDate and dueDate
      user: user || aReq.user._id,
      booking,
      amount,
      tax: tax || 0,
      discount: discount || 0,
      totalAmount,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isOrganization: isOrganization || false,
      organizationName: organizationName || undefined,
    };

    const invoice = await invoiceService.createInvoice(invoiceData);
    res.status(201).json({
      status: "success",
      message: "Invoice created successfully",
      data: { invoice },
    });
  }
);

// 2. Get All Invoices
export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const invoices = await invoiceService.getAllInvoices();
  res.status(200).json({
    status: "success",
    results: invoices.length,
    data: { invoices },
  });
});

// 3. Get Single Invoice
export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }
  res.status(200).json({
    status: "success",
    data: { invoice },
  });
});

// 4. Get Invoices by Booking
export const getInvoicesByBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const invoices = await invoiceService.getInvoicesByBooking(
      req.params.bookingId
    );
    res.status(200).json({
      status: "success",
      results: invoices.length,
      data: { invoices },
    });
  }
);

// 5. Update Invoice
export const updateInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const updatedInvoice = await invoiceService.updateInvoice(
      req.params.id,
      req.body
    );
    res.status(200).json({
      status: "success",
      message: "Invoice updated successfully",
      data: { invoice: updatedInvoice },
    });
  }
);

// 6. Delete Invoice
export const deleteInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    await invoiceService.deleteInvoice(req.params.id);
    res.status(204).json({
      status: "success",
      message: "Invoice deleted successfully",
      data: null,
    });
  }
);

// 7. Generate Invoice for Booking
export const generateInvoiceForBooking = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const bookingId = req.params.bookingId;
    const aReq = req as AuthenticatedRequest;

    console.log("Generating invoice for booking:", bookingId);

    try {
      const order = await orderService.getOrderById(bookingId);
      if (!order) {
        throw new ApiError("Booking not found", 404);
      }

      // Check if invoice already exists for this booking
      const existingInvoices = await invoiceService.getInvoicesByBooking(
        bookingId
      );
      if (existingInvoices.length > 0) {
        throw new ApiError("Invoice already exists for this booking", 400);
      }

      // Cast shipping address to any to access companyName
      const shippingAddress = order.shippingAddress as any;
      const companyName = shippingAddress?.companyName;
      const hasOrganization = !!companyName;

      // Map payment method from order to invoice format
      const paymentMethodMap: Record<
        string,
        "cash" | "bank-transfer" | "credit-card" | "other"
      > = {
        cash_on_delivery: "cash",
        bank_transfer: "bank-transfer",
        credit_card: "credit-card",
        paypal: "other",
        stripe: "other",
      };

      const invoicePaymentMethod =
        paymentMethodMap[(order as any).paymentMethod] || "other";

      // Create a new invoice document
      const invoiceData: IInvoice = {
        invoiceNumber: await generateInvoiceNumber(),
        booking: (order as any)._id as mongoose.Schema.Types.ObjectId,
        user: (order.user as any)._id || order.user,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        amount: order.totalAmount || 0,
        totalAmount: order.totalAmount || 0,
        status: "sent",
        paymentMethod: invoicePaymentMethod,
        isOrganization: hasOrganization,
        organizationName: companyName,
        showCashOnDelivery: (order as any).paymentMethod === "cash_on_delivery",
        notes: `Invoice generated from order #${(order as any).orderNumber}`,
      };

      const newInvoice = await invoiceService.createInvoice(invoiceData);

      // Generate HTML invoice
      const invoiceHtml = await invoiceService.generateInvoiceHtml(order);

      // Set headers for HTML response
      res.setHeader("Content-Type", "text/html");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invoice-${newInvoice.invoiceNumber}.html"`
      );
      res.send(invoiceHtml);
    } catch (error) {
      console.error("Invoice generation failed:", error);
      next(error);
    }
  }
);

// 8. Generate Custom Invoice
export const generateCustomInvoice = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const aReq = req as AuthenticatedRequest;
    const {
      user,
      customerEmail,
      items,
      notes,
      shippingAddress,
      isOrganization,
      organizationName,
      issueDate,
      dueDate,
      amount,
      tax,
      discount,
      totalAmount,
      paymentMethod,
      showCashOnDelivery,
    } = req.body;

    if (!customerEmail || !items || !totalAmount || !shippingAddress) {
      throw new ApiError(
        "Customer email, items, shipping address, and total amount are required for custom invoice",
        400
      );
    }

    // Cast shipping address to any
    const shippingAddr = shippingAddress as any;

    // Extract organization info
    const finalIsOrganization =
      isOrganization !== undefined
        ? isOrganization
        : !!shippingAddr.companyName;

    const finalOrganizationName = organizationName || shippingAddr.companyName;

    // Create custom invoice
    const customInvoiceData: IInvoice = {
      invoiceNumber: await generateInvoiceNumber(),
      user: user || aReq.user?._id,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate
        ? new Date(dueDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      amount: amount || 0,
      tax: tax || 0,
      discount: discount || 0,
      totalAmount: totalAmount || 0,
      status: "draft",
      paymentMethod: paymentMethod as any,
      notes: notes || `Custom invoice for ${customerEmail}`,
      isOrganization: finalIsOrganization,
      organizationName: finalOrganizationName,
      showCashOnDelivery: showCashOnDelivery || false,
    };

    // Create the invoice
    const newInvoice = await invoiceService.createInvoice(customInvoiceData);

    // Generate HTML
    const invoiceHtml = await invoiceService.generateCustomInvoiceHtml({
      ...customInvoiceData,
      shippingAddress: shippingAddr,
      customerEmail,
      items,
    });

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="custom-invoice-${newInvoice.invoiceNumber}.html"`
    );
    res.send(invoiceHtml);
  }
);

// 9. Get Invoices by User
export const getInvoicesByUser = asyncHandler(
  async (req: Request, res: Response) => {
    const aReq = req as AuthenticatedRequest;
    const userId = req.params.userId || aReq.user?._id;

    if (!userId) {
      throw new ApiError("User ID is required", 400);
    }

    const invoices = await invoiceService.getInvoicesByUser(
      userId instanceof mongoose.Types.ObjectId ? userId.toString() : userId
    );
    res.status(200).json({
      status: "success",
      results: invoices.length,
      data: { invoices },
    });
  }
);

// 10. Update Invoice Status
export const updateInvoiceStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.body;

    if (!["draft", "sent", "paid", "cancelled"].includes(status)) {
      throw new ApiError("Invalid status value", 400);
    }

    const updatedInvoice = await invoiceService.updateInvoiceStatus(
      req.params.id,
      status
    );

    res.status(200).json({
      status: "success",
      message: "Invoice status updated successfully",
      data: { invoice: updatedInvoice },
    });
  }
);
