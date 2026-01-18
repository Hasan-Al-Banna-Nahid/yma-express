import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import * as customerService from "./customer.service";
import mongoose from "mongoose";

export const getAllCustomersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      search: req.query.search as string,
      phone: req.query.phone as string,
      email: req.query.email as string,
      name: req.query.name as string,
      city: req.query.city as string,
      postcode: req.query.postcode as string,
      customerType: req.query.customerType as "retail" | "corporate",
      tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
      minOrders: req.query.minOrders
        ? parseInt(req.query.minOrders as string)
        : undefined,
      maxOrders: req.query.maxOrders
        ? parseInt(req.query.maxOrders as string)
        : undefined,
      minSpent: req.query.minSpent
        ? parseFloat(req.query.minSpent as string)
        : undefined,
      maxSpent: req.query.maxSpent
        ? parseFloat(req.query.maxSpent as string)
        : undefined,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      isFavorite:
        req.query.isFavorite === "true"
          ? true
          : req.query.isFavorite === "false"
            ? false
            : undefined,
      hasNotes:
        req.query.hasNotes === "true"
          ? true
          : req.query.hasNotes === "false"
            ? false
            : undefined,
    };

    const result = await customerService.getAllCustomers(page, limit, filters);

    ApiResponse(res, 200, "Customers retrieved successfully", result);
  },
);

export const getCustomerByIdHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const customer = await customerService.getCustomerById(id);

    ApiResponse(res, 200, "Customer retrieved successfully", { customer });
  },
);

export const getCustomerByUserIdHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const customer = await customerService.getCustomerByUserId(userId);

    ApiResponse(res, 200, "Customer retrieved successfully", { customer });
  },
);

export const searchCustomersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ApiError("Search term must be at least 2 characters", 400);
    }

    const result = await customerService.searchCustomers(
      searchTerm,
      page,
      limit,
    );

    ApiResponse(res, 200, "Customers search results", result);
  },
);

export const getCustomerOrderHistoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const result = await customerService.getCustomerOrderHistory(customerId);

    ApiResponse(res, 200, "Customer order history retrieved", result);
  },
);

export const getCustomerStatsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await customerService.getCustomerStats();

    ApiResponse(res, 200, "Customer statistics retrieved", stats);
  },
);

export const updateCustomerHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError("Invalid customer ID", 400);
    }

    const customer = await customerService.updateCustomer(id, updateData);

    ApiResponse(res, 200, "Customer updated successfully", { customer });
  },
);

export const deleteCustomerHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError("Invalid customer ID", 400);
    }

    await customerService.deleteCustomer(id);

    ApiResponse(res, 200, "Customer deleted successfully");
  },
);

export const getCustomersByDateRangeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!startDate || !endDate) {
      throw new ApiError("startDate and endDate are required", 400);
    }

    const result = await customerService.getCustomersByDateRange(
      new Date(startDate as string),
      new Date(endDate as string),
      page,
      limit,
    );

    ApiResponse(res, 200, "Customers by date range", result);
  },
);

export const toggleFavoriteHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const customer = await customerService.toggleFavorite(id);

    ApiResponse(res, 200, "Customer favorite status updated", { customer });
  },
);

export const addCustomerTagHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tag } = req.body;

    if (!tag || tag.trim().length === 0) {
      throw new ApiError("Tag is required", 400);
    }

    const customer = await customerService.addCustomerTag(id, tag.trim());

    ApiResponse(res, 200, "Tag added to customer", { customer });
  },
);

export const removeCustomerTagHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tag } = req.body;

    if (!tag || tag.trim().length === 0) {
      throw new ApiError("Tag is required", 400);
    }

    const customer = await customerService.removeCustomerTag(id, tag.trim());

    ApiResponse(res, 200, "Tag removed from customer", { customer });
  },
);

export const getCustomerAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const start = startDate ? new Date(startDate as string) : thirtyDaysAgo;
    const end = endDate ? new Date(endDate as string) : today;

    // Get customer stats
    const stats = await customerService.getCustomerStats();

    // Get customers by date range
    const customersByDate = await customerService.getCustomersByDateRange(
      start,
      end,
      1,
      1000,
    );

    // Calculate customer growth
    const customerGrowth = {
      total: stats.totalCustomers,
      newToday: stats.newCustomersToday,
      repeatRate:
        stats.totalCustomers > 0
          ? (stats.repeatCustomers / stats.totalCustomers) * 100
          : 0,
    };

    ApiResponse(res, 200, "Customer analytics retrieved", {
      stats,
      customerGrowth,
      recentCustomers: customersByDate.data.slice(0, 10),
    });
  },
);
