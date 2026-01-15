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
  // releaseExpiredCartItems,
} from "./inventory.service";
import Product from "../../modules/Product/product.model";
import Inventory from "../../modules/Inventory/inventory.model";

// inventory.controller.ts
export const createInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("📦 Request body keys:", Object.keys(req.body));
    console.log("📦 Request body values:", req.body);
    console.log("📦 Files received:", req.files?.length || 0);

    // Log all fields to see what's actually coming in
    for (const [key, value] of Object.entries(req.body)) {
      console.log(`📋 ${key}: ${value} (type: ${typeof value})`);
    }

    // Destructure with defaults to avoid undefined errors
    const {
      productName = "",
      width = "",
      length = "",
      height = "",
      isSensitive = "false",
      deliveryTime = "",
      collectionTime = "",
      rentalPrice = "",
      quantity = "",
      categories = "",
      warehouse = "",
      vendor = "",
      status = "available",
    } = req.body;

    // VALIDATION: Check required fields
    const requiredFields = [
      { field: "productName", value: productName },
      { field: "width", value: width },
      { field: "length", value: length },
      { field: "height", value: height },
      { field: "deliveryTime", value: deliveryTime },
      { field: "collectionTime", value: collectionTime },
      { field: "rentalPrice", value: rentalPrice },
      { field: "quantity", value: quantity },
      { field: "categories", value: categories },
      { field: "warehouse", value: warehouse },
      { field: "vendor", value: vendor },
    ];

    const missingFields = requiredFields
      .filter((item) => !item.value || item.value.trim() === "")
      .map((item) => item.field);

    console.log("🔍 Missing fields:", missingFields);

    if (missingFields.length > 0) {
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    // Handle file uploads for images
    const images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      console.log("📸 Processing uploaded files...");
      images.push(...req.files.map((file: Express.Multer.File) => file.path));
      console.log("📸 Images paths:", images);
    }

    if (images.length === 0) {
      throw new ApiError("At least one image is required", 400);
    }

    // Prepare inventory data
    const inventoryData = {
      productName: productName.trim(),
      description: `${productName.trim()} - Available for rent`,
      dimensions: {
        width: parseFloat(width),
        length: parseFloat(length),
        height: parseFloat(height),
        unit: "feet",
      },
      isSensitive: isSensitive === "true" || isSensitive === true,
      images: images,
      deliveryTime: parseInt(deliveryTime),
      collectionTime: parseInt(collectionTime),
      rentalPrice: parseFloat(rentalPrice),
      quantity: parseInt(quantity),
      // Handle categories - could be string or array
      category: Array.isArray(categories)
        ? categories[0]
        : typeof categories === "string"
        ? categories.split(",")[0].trim()
        : categories,
      categories: Array.isArray(categories)
        ? categories
        : typeof categories === "string"
        ? categories.split(",").map((cat: string) => cat.trim())
        : [categories],
      warehouse: warehouse,
      vendor: vendor,
      status: status,
    };

    console.log("✅ Final inventory data:", {
      productName: inventoryData.productName,
      categories: inventoryData.categories,
      hasCategories: inventoryData.categories.length > 0,
      category: inventoryData.category,
    });

    // Create inventory item
    const inventoryItem = await createInventoryItem(inventoryData);

    console.log(`✅ Inventory item created: ${inventoryItem._id}`);

    ApiResponse(res, 201, "Inventory item created successfully", {
      inventoryItem: {
        id: inventoryItem._id,
        productName: inventoryItem.productName,
        quantity: inventoryItem.quantity,
        warehouse: inventoryItem.warehouse,
        vendor: inventoryItem.vendor,
        rentalPrice: inventoryItem.rentalPrice,
        status: inventoryItem.status,
        categories: inventoryItem.categories,
      },
    });
  }
);

export const updateInventoryItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const inventoryId = req.params.id;
    const updateData = req.body;

    console.log("🔄 Update inventory request:", {
      inventoryId,
      updateData: Object.keys(updateData),
    });

    // Handle file uploads - all optional
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages = req.files.map((file: Express.Multer.File) => file.path);
      const existingItem = await Inventory.findById(inventoryId);
      const existingImages = existingItem?.images || [];
      updateData.images = [...existingImages, ...newImages];
    }

    // Parse numeric fields if provided (all optional)
    const numericFields = [
      "width",
      "length",
      "height",
      "rentalPrice",
      "quantity",
      "deliveryTime",
      "collectionTime",
      "minBookingDays",
      "maxBookingDays",
    ];

    numericFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        if (field === "width" || field === "length" || field === "height") {
          if (!updateData.dimensions) updateData.dimensions = {};
          updateData.dimensions[field] = parseFloat(req.body[field]);
        } else {
          updateData[field] = parseFloat(req.body[field]);
        }
      }
    });

    // Parse boolean fields if provided
    if (req.body.isSensitive !== undefined) {
      updateData.isSensitive =
        req.body.isSensitive === "true" || req.body.isSensitive === true;
    }

    // Update product if productName is provided
    if (req.body.productName) {
      const inventoryItem = await Inventory.findById(inventoryId);
      if (inventoryItem && inventoryItem.product) {
        await Product.findByIdAndUpdate(
          inventoryItem.product,
          {
            name: req.body.productName,
            title: req.body.productName,
          },
          { new: true }
        );
        updateData.productName = req.body.productName;
      }
    }

    console.log("📋 Update data to save:", updateData);

    const inventoryItem = await updateInventoryItem(inventoryId, updateData);

    ApiResponse(res, 200, "Inventory item updated successfully", {
      inventoryItem,
    });
  }
);

// Keep all other functions exactly as they are
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

// export const releaseExpiredCartItemsHandler = asyncHandler(
//   async (req: Request, res: Response) => {
//     const count = await releaseExpiredCartItems();
//
//     ApiResponse(res, 200, "Expired cart items released successfully", {
//       count,
//     });
//   }
// );

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
