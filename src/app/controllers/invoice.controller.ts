// src/app/controllers/invoice.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import { generateOrderInvoice } from "../services/order.service";

// Simple invoice controller that only handles order invoices
export const generateOrderInvoiceController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    console.log("🧾 [CONTROLLER] Generating invoice for order:", orderId);

    try {
      const invoiceHtml = await generateOrderInvoice(orderId);

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
      const invoiceHtml = await generateOrderInvoice(orderId);

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
