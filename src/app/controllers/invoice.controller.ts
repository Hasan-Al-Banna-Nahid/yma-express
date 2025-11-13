// src/controllers/invoice.controller.ts
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import {
  createInvoice,
  getInvoice,
  getInvoices,
  getInvoicesByUser,
  getInvoicesByBooking,
  updateInvoice,
  deleteInvoice,
  generateInvoiceForBooking,
  generateCustomInvoice,
} from "../services/invoice.service";
import ApiError from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { IUser } from "../interfaces/user.interface";

// Narrow req.user in this controller to have id and role
type Role = "user" | "admin";
type AuthenticatedRequest = Request & {
  user: IUser & { id: string; role: Role };
};

// Safely extract the owner id whether invoice.user is ObjectId or populated doc
function ownerId(user: Types.ObjectId | { _id: Types.ObjectId }): string {
  return (user instanceof Types.ObjectId ? user : user._id).toString();
}

/** POST /invoices */
export const createInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const invoiceData = {
      ...aReq.body,
      user: aReq.user.id, // string OK; Mongoose will cast
    };

    const invoice = await createInvoice(invoiceData);
    ApiResponse(res, 201, "Invoice created successfully", { invoice });
  } catch (err) {
    next(err);
  }
};

/** GET /invoices/:id */
export const getInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const invoice = await getInvoice(req.params.id);

    // Allow owner or admin
    if (
      ownerId(invoice.user as any) !== aReq.user.id &&
      aReq.user.role !== "admin"
    ) {
      throw new ApiError("You are not authorized to view this invoice", 403);
    }

    ApiResponse(res, 200, "Invoice retrieved successfully", { invoice });
  } catch (err) {
    next(err);
  }
};

/** GET /invoices */
export const getInvoicesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const invoices =
      aReq.user.role === "admin"
        ? await getInvoices()
        : await getInvoicesByUser(aReq.user.id);

    ApiResponse(res, 200, "Invoices retrieved successfully", { invoices });
  } catch (err) {
    next(err);
  }
};

/** GET /invoices/booking/:bookingId */
export const getInvoicesByBookingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const invoices = await getInvoicesByBooking(req.params.bookingId);

    if (
      invoices.length > 0 &&
      ownerId(invoices[0].user as any) !== aReq.user.id &&
      aReq.user.role !== "admin"
    ) {
      throw new ApiError("You are not authorized to view these invoices", 403);
    }

    ApiResponse(res, 200, "Invoices retrieved successfully", { invoices });
  } catch (err) {
    next(err);
  }
};

/** PATCH /invoices/:id */
export const updateInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const invoice = await getInvoice(req.params.id);

    if (
      ownerId(invoice.user as any) !== aReq.user.id &&
      aReq.user.role !== "admin"
    ) {
      throw new ApiError("You are not authorized to update this invoice", 403);
    }

    const updatedInvoice = await updateInvoice(req.params.id, req.body);
    ApiResponse(res, 200, "Invoice updated successfully", {
      invoice: updatedInvoice,
    });
  } catch (err) {
    next(err);
  }
};

/** DELETE /invoices/:id */
export const deleteInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const invoice = await getInvoice(req.params.id);

    if (
      ownerId(invoice.user as any) !== aReq.user.id &&
      aReq.user.role !== "admin"
    ) {
      throw new ApiError("You are not authorized to delete this invoice", 403);
    }

    await deleteInvoice(req.params.id);
    ApiResponse(res, 204, "Invoice deleted successfully");
  } catch (err) {
    next(err);
  }
};

/** POST /invoices/generate/:bookingId */
export const generateInvoiceForBookingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isOrganization } = req.body;
    const invoice = await generateInvoiceForBooking(
      req.params.bookingId,
      isOrganization
    );
    ApiResponse(res, 201, "Invoice generated successfully", { invoice });
  } catch (err) {
    next(err);
  }
};

/** POST /invoices/custom */
export const generateCustomInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) throw new ApiError("User not found", 404);

    const { amount, description, isOrganization } = aReq.body;
    const invoice = await generateCustomInvoice(
      aReq.user.id,
      amount,
      description,
      isOrganization
    );

    ApiResponse(res, 201, "Custom invoice generated successfully", { invoice });
  } catch (err) {
    next(err);
  }
};
