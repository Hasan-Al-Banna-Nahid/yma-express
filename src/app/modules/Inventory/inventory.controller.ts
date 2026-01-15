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
import Product from "../../modules/Product/product.model";
import Inventory from "../../modules/Inventory/inventory.model";

// inventory.controller.ts
export const createInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      productId, // Get productId from body
      productName,
      description, // This is the inventory description
      width,
      length,
      height,
      isSensitive,
      deliveryTime,
      collectionTime,
      rentalPrice,
      quantity,
      category,
      warehouse,
      vendor,
      minBookingDays,
      maxBookingDays,
      status,
    } = req.body;

    console.log("Request body:", req.body); // Debug log

    // Check if product exists OR create it
    let product;
    if (productId) {
      product = await Product.findById(productId);
      if (!product) {
        throw new ApiError("Product not found with given ID", 404);
      }
    } else if (productName) {
      // Create new product if productId not provided
      product = await Product.create({
        title: productName,
        description: description || "Product description",
        category: category || "General",
        status: "active",
      });
    } else {
      throw new ApiError("Either productId or productName is required", 400);
    }

    // Handle file uploads
    const images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      images.push(...req.files.map((file: Express.Multer.File) => file.path));
    }

    // Prepare inventory data
    const inventoryData = {
      product: product._id, // Link to product
      productName: product.name,
      description, // Inventory description
      dimensions: {
        width: parseFloat(width),
        length: parseFloat(length),
        height: parseFloat(height),
      },
      isSensitive: isSensitive === "true" || isSensitive === true,
      images,
      deliveryTime: parseInt(deliveryTime),
      collectionTime: parseInt(collectionTime),
      rentalPrice: parseFloat(rentalPrice),
      quantity: parseInt(quantity),
      category,
      warehouse,
      vendor,
      minBookingDays: parseInt(minBookingDays) || 1,
      maxBookingDays: parseInt(maxBookingDays) || 30,
      status: status || "available",
    };

    console.log("Inventory data to create:", inventoryData); // Debug log

    const inventoryItem = await createInventoryItem(inventoryData);

    ApiResponse(res, 201, "Inventory item created successfully", {
      inventoryItem,
    });
  }
);

export const updateInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryId = req.params.id;
    const updateData = req.body;

    console.log("Update request body:", req.body); // Debug log

    // Handle file uploads
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages = req.files.map((file: Express.Multer.File) => file.path);
      const existingItem = await Inventory.findById(inventoryId);
      const existingImages = existingItem?.images || [];
      updateData.images = [...existingImages, ...newImages];
    }

    // Update dimensions if provided
    if (req.body.width || req.body.length || req.body.height) {
      updateData.dimensions = {
        width: req.body.width ? parseFloat(req.body.width) : undefined,
        length: req.body.length ? parseFloat(req.body.length) : undefined,
        height: req.body.height ? parseFloat(req.body.height) : undefined,
      };
    }

    // Parse numeric fields
    if (req.body.rentalPrice)
      updateData.rentalPrice = parseFloat(req.body.rentalPrice);
    if (req.body.quantity) updateData.quantity = parseInt(req.body.quantity);
    if (req.body.deliveryTime)
      updateData.deliveryTime = parseInt(req.body.deliveryTime);
    if (req.body.collectionTime)
      updateData.collectionTime = parseInt(req.body.collectionTime);
    if (req.body.minBookingDays)
      updateData.minBookingDays = parseInt(req.body.minBookingDays);
    if (req.body.maxBookingDays)
      updateData.maxBookingDays = parseInt(req.body.maxBookingDays);
    if (req.body.isSensitive !== undefined) {
      updateData.isSensitive =
        req.body.isSensitive === "true" || req.body.isSensitive === true;
    }

    console.log("Update data to save:", updateData); // Debug log

    const inventoryItem = await updateInventoryItem(inventoryId, updateData);

    ApiResponse(res, 200, "Inventory item updated successfully", {
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
