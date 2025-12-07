// src/app/controllers/invoice.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import { generateInvoiceHtml } from "../services/invoice.service";
import * as orderService from "../services/order.service";

// Simple invoice controller that only handles order invoices
export const generateOrderInvoiceController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    console.log("🧾 [CONTROLLER] Generating invoice for order:", orderId);

    try {
      const order = await orderService.getOrderById(orderId);
      const invoiceHtml = await generateInvoiceHtml(order);

      // Set headers for HTML response
      res.setHeader("Content-Type", "text/html");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invoice-${orderId}.html"`
      );

      res.send(invoiceHtml);
    } catch (error) {
      console.error("❌ [CONTROLLER] Invoice generation failed:", error);
      throw new ApiError("Failed to generate invoice", 500);
    }
  }
);

export const downloadOrderInvoiceController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    console.log("📥 [CONTROLLER] Downloading invoice for order:", orderId);

    try {
      const order = await orderService.getOrderById(orderId);
      const invoiceHtml = await generateInvoiceHtml(order);

      // Set headers for download
      res.setHeader("Content-Type", "text/html");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="invoice-${orderId}.html"`
      );

      res.send(invoiceHtml);
    } catch (error) {
      console.error("❌ [CONTROLLER] Invoice download failed:", error);
      throw new ApiError("Failed to download invoice", 500);
    }
  }
);

// Stub functions for missing invoice handlers
export const createInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: createInvoiceHandler",
    });
  }
);

export const getInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: getInvoiceHandler",
    });
  }
);

export const getInvoicesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: getInvoicesHandler",
    });
  }
);

export const getInvoicesByBookingHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: getInvoicesByBookingHandler",
    });
  }
);

export const updateInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: updateInvoiceHandler",
    });
  }
);

export const deleteInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: deleteInvoiceHandler",
    });
  }
);

export const generateInvoiceForBookingHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: generateInvoiceForBookingHandler",
    });
  }
);

export const generateCustomInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(501).json({
      status: "error",
      message: "Not Implemented: generateCustomInvoiceHandler",
    });
  }
);