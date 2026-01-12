import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
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

export const createInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryItem = await createInventoryItem(req.body);

    ApiResponse(res, 201, "Inventory item created successfully", {
      inventoryItem,
    });
  }
);

export const getInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryItem = await getInventoryItem(req.params.id);

    ApiResponse(res, 200, "Inventory item retrieved successfully", {
      inventoryItem,
    });
  }
);

export const getInventoryItemsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryItems = await getInventoryItems(req.query);

    ApiResponse(res, 200, "Inventory items retrieved successfully", {
      inventoryItems,
    });
  }
);

export const updateInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryItem = await updateInventoryItem(req.params.id, req.body);

    ApiResponse(res, 200, "Inventory item updated successfully", {
      inventoryItem,
    });
  }
);

export const deleteInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await deleteInventoryItem(req.params.id);

    ApiResponse(res, 200, "Inventory item deleted successfully", {});
  }
);

export const getAvailableInventoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, startDate, endDate, warehouse } = req.query;

    if (!productId || !startDate || !endDate) {
      throw new ApiError(
        "Please provide productId, startDate and endDate query parameters",
        400
      );
    }

    const availableInventory = await getAvailableInventory(
      productId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      warehouse as string | undefined
    );

    ApiResponse(res, 200, "Available inventory retrieved successfully", {
      availableInventory,
    });
  }
);

export const getBookedInventoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, startDate, endDate, warehouse } = req.query;

    if (!productId || !startDate || !endDate) {
      throw new ApiError(
        "Please provide productId, startDate and endDate query parameters",
        400
      );
    }

    const bookedInventory = await getBookedInventory(
      productId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      warehouse as string | undefined
    );

    ApiResponse(res, 200, "Booked inventory retrieved successfully", {
      bookedInventory,
    });
  }
);

export const checkInventoryAvailabilityHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, startDate, endDate, quantity } = req.query;

    if (!productId || !startDate || !endDate || !quantity) {
      throw new ApiError(
        "Please provide productId, startDate, endDate and quantity query parameters",
        400
      );
    }

    const availability = await checkInventoryAvailability(
      productId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      parseInt(quantity as string)
    );

    ApiResponse(res, 200, "Inventory availability checked successfully", {
      availability,
    });
  }
);

export const releaseExpiredCartItemsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const count = await releaseExpiredCartItems();

    ApiResponse(res, 200, "Expired cart items released successfully", {
      count,
    });
  }
);

// New endpoint for product availability
export const checkProductAvailabilityHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, startDate, endDate, quantity } = req.body;

    if (!productId || !startDate || !endDate || !quantity) {
      throw new ApiError(
        "Please provide productId, startDate, endDate and quantity in request body",
        400
      );
    }

    const availability = await checkInventoryAvailability(
      productId,
      new Date(startDate),
      new Date(endDate),
      quantity
    );

    ApiResponse(res, 200, "Product availability checked successfully", {
      productId,
      startDate,
      endDate,
      requestedQuantity: quantity,
      ...availability,
    });
  }
);
