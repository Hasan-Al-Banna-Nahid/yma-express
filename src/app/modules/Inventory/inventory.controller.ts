import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItem,
  getInventoryItems,
  deleteInventoryItem,
  getAvailableInventory,
  getBookedInventory,
  checkInventoryAvailability,
} from "./inventory.service";

/* ---------------------------------- */
/* CREATE INVENTORY ITEM               */
/* ---------------------------------- */
export const createInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryData = { ...req.body };

    // Handle uploaded files
    if (req.files && Array.isArray(req.files)) {
      inventoryData.images = req.files.map(
        (file: Express.Multer.File) => file.path,
      );
    }

    // Parse dimensions if passed as strings
    if (inventoryData.dimensions) {
      if (typeof inventoryData.dimensions === "string") {
        inventoryData.dimensions = JSON.parse(inventoryData.dimensions);
      }
      // ensure numeric
      inventoryData.dimensions.width = parseFloat(
        inventoryData.dimensions.width,
      );
      inventoryData.dimensions.length = parseFloat(
        inventoryData.dimensions.length,
      );
      inventoryData.dimensions.height = parseFloat(
        inventoryData.dimensions.height,
      );
    }

    const item = await createInventoryItem(inventoryData);

    ApiResponse(res, 201, "Inventory item created successfully", {
      inventoryItem: item,
    });
  },
);

/* ---------------------------------- */
/* UPDATE INVENTORY ITEM               */
/* ---------------------------------- */
export const updateInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryId = req.params.id;
    const updateData = { ...req.body };

    // Handle uploaded files
    if (req.files && Array.isArray(req.files)) {
      const newImages = req.files.map((file: Express.Multer.File) => file.path);
      const existingItem = await getInventoryItem(inventoryId);
      updateData.images = [...(existingItem.images || []), ...newImages];
    }

    // Parse numeric fields in dimensions if present
    if (updateData.dimensions && typeof updateData.dimensions === "string") {
      updateData.dimensions = JSON.parse(updateData.dimensions);
    }

    const updatedItem = await updateInventoryItem(inventoryId, updateData);

    ApiResponse(res, 200, "Inventory item updated successfully", {
      inventoryItem: updatedItem,
    });
  },
);

/* ---------------------------------- */
/* GET SINGLE INVENTORY ITEM           */
/* ---------------------------------- */
export const getInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const item = await getInventoryItem(req.params.id);
    ApiResponse(res, 200, "Inventory item retrieved successfully", {
      inventoryItem: item,
    });
  },
);

/* ---------------------------------- */
/* GET ALL INVENTORY ITEMS             */
/* ---------------------------------- */
export const getInventoryItemsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, ...filter } = req.query;
    const items = await getInventoryItems(
      filter,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
    );
    ApiResponse(res, 200, "Inventory items retrieved successfully", {
      inventoryItems: items,
    });
  },
);

/* ---------------------------------- */
/* DELETE INVENTORY ITEM               */
/* ---------------------------------- */
export const deleteInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await deleteInventoryItem(req.params.id);
    ApiResponse(res, 200, "Inventory item deleted successfully", {});
  },
);

/* ---------------------------------- */
/* GET AVAILABLE INVENTORY             */
/* ---------------------------------- */
export const getAvailableInventoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productName, startDate, endDate, warehouse } = req.query;

    if (!productName || !startDate || !endDate) {
      throw new ApiError(
        "Please provide productName, startDate, and endDate",
        400,
      );
    }

    const items = await getAvailableInventory(
      productName as string,
      new Date(startDate as string),
      new Date(endDate as string),
      warehouse as string | undefined,
    );

    ApiResponse(res, 200, "Available inventory retrieved successfully", {
      availableInventory: items,
    });
  },
);

/* ---------------------------------- */
/* GET BOOKED INVENTORY                */
/* ---------------------------------- */
export const getBookedInventoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productName, startDate, endDate, warehouse } = req.query;

    if (!productName || !startDate || !endDate) {
      throw new ApiError(
        "Please provide productName, startDate, and endDate",
        400,
      );
    }

    const items = await getBookedInventory(
      productName as string,
      new Date(startDate as string),
      new Date(endDate as string),
      warehouse as string | undefined,
    );

    ApiResponse(res, 200, "Booked inventory retrieved successfully", {
      bookedInventory: items,
    });
  },
);

/* ---------------------------------- */
/* CHECK INVENTORY AVAILABILITY        */
/* ---------------------------------- */
export const checkInventoryAvailabilityHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // We expect these in the body (POST) or query (GET)
    const { productName, startDate, endDate, quantity, warehouse } = req.body;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!productName || !startDate || !endDate || !quantity) {
      throw new ApiError(
        "Missing required fields: productName, startDate, endDate, quantity",
        400,
      );
    }

    const result = await checkInventoryAvailability({
      productName: productName as string,
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      requestedQuantity: Number(quantity),
      warehouse: warehouse as string,
      page,
      limit,
    });

    ApiResponse(
      res,
      200,
      "Inventory availability checked successfully",
      result,
    );
  },
);
