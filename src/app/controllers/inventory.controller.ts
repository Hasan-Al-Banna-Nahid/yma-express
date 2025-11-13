import { Request, Response, NextFunction } from "express";
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
} from "../services/inventory.service";
import { IInventory } from "../interfaces/inventory.interface";
import ApiError from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";

export const createInventoryItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const inventoryItem = await createInventoryItem(req.body);

    ApiResponse(res, 201, "Inventory item created successfully", {
      inventoryItem,
    });
  } catch (err) {
    next(err);
  }
};

export const getInventoryItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const inventoryItem = await getInventoryItem(req.params.id);

    ApiResponse(res, 200, "Inventory item retrieved successfully", {
      inventoryItem,
    });
  } catch (err) {
    next(err);
  }
};

export const getInventoryItemsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const inventoryItems = await getInventoryItems(req.query);

    ApiResponse(res, 200, "Inventory items retrieved successfully", {
      inventoryItems,
    });
  } catch (err) {
    next(err);
  }
};

export const updateInventoryItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const inventoryItem = await updateInventoryItem(req.params.id, req.body);

    ApiResponse(res, 200, "Inventory item updated successfully", {
      inventoryItem,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteInventoryItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteInventoryItem(req.params.id);

    ApiResponse(res, 204, "Inventory item deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getAvailableInventoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

export const getBookedInventoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

export const checkInventoryAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

export const releaseExpiredCartItemsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await releaseExpiredCartItems();

    ApiResponse(res, 200, "Expired cart items released successfully", {
      count,
    });
  } catch (err) {
    next(err);
  }
};
