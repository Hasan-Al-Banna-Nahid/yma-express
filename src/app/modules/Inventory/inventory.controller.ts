import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import {
  createInventoryItem,
  getInventoryItem,
  getInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  getAvailableInventory,
  getBookedInventory,
  checkInventoryAvailability,
  releaseExpiredCartItems,
} from "./inventory.service";
import { IInventory } from "./inventory.interface";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";

export const createInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const inventoryItem = await createInventoryItem(req.body);

    ApiResponse(res, 201, "Inventory item created successfully", {
      inventoryItem,
    });
  }
);

export const getInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const inventoryItem = await getInventoryItem(req.params.id);

    ApiResponse(res, 200, "Inventory item retrieved successfully", {
      inventoryItem,
    });
  }
);

export const getInventoryItemsHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const inventoryItems = await getInventoryItems(req.query);

    ApiResponse(res, 200, "Inventory items retrieved successfully", {
      inventoryItems,
    });
  }
);

export const updateInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const inventoryItem = await updateInventoryItem(req.params.id, req.body);

    ApiResponse(res, 200, "Inventory item updated successfully", {
      inventoryItem,
    });
  }
);

export const deleteInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteInventoryItem(req.params.id);

    ApiResponse(res, 204, "Inventory item deleted successfully");
  }
);

export const getAvailableInventoryHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId, startDate, endDate } = req.query;
    if (!productId || !startDate || !endDate) {
      throw new ApiError(
        "Please provide productId, startDate and endDate query parameters",
        400
      );
    }

    const availableInventory = await getAvailableInventory(
      productId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    ApiResponse(res, 200, "Available inventory retrieved successfully", {
      availableInventory,
    });
  }
);

export const getBookedInventoryHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId, startDate, endDate } = req.query;
    if (!productId || !startDate || !endDate) {
      throw new ApiError(
        "Please provide productId, startDate and endDate query parameters",
        400
      );
    }

    const bookedInventory = await getBookedInventory(
      productId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    ApiResponse(res, 200, "Booked inventory retrieved successfully", {
      bookedInventory,
    });
  }
);

export const checkInventoryAvailabilityHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId, date } = req.query;
    if (!productId || !date) {
      throw new ApiError(
        "Please provide productId and date query parameters",
        400
      );
    }

    const availability = await checkInventoryAvailability(
      productId as string,
      new Date(date as string)
    );

    ApiResponse(res, 200, "Inventory availability checked successfully", {
      availability,
    });
  }
);

export const releaseExpiredCartItemsHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const count = await releaseExpiredCartItems();

    ApiResponse(res, 200, "Expired cart items released successfully", {
      count,
    });
  }
);
