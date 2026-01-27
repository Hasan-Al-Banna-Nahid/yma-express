import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as productService from "./product.service";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import Category from "../Category/category.model";
import { uploadToCloudinary } from "../../utils/cloudinary.util";

// Add these functions to your existing product.controller.ts

/* =========================
   CLIENT SEARCH PRODUCTS
========================= */
export const clientSearchProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      category,
      state,
      city,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      difficulty,
      ageMin,
      ageMax,
      ageUnit,
      material,
      isSensitive,
    } = req.query;

    // Convert query parameters to proper types
    const params: productService.ClientSearchParams = {
      category: category as string,
      state: state as string,
      city: city as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      difficulty: difficulty as "easy" | "medium" | "difficult",
      ageMin: ageMin ? parseInt(ageMin as string) : undefined,
      ageMax: ageMax ? parseInt(ageMax as string) : undefined,
      ageUnit: ageUnit as "years" | "months",
      material: material as string,
      isSensitive:
        isSensitive !== undefined ? isSensitive === "true" : undefined,
    };

    // Validate date range
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);

      if (start > end) {
        throw new ApiError("Start date cannot be after end date", 400);
      }
    }

    // Validate price range
    if (params.minPrice !== undefined && params.maxPrice !== undefined) {
      if (params.minPrice > params.maxPrice) {
        throw new ApiError(
          "Minimum price cannot be greater than maximum price",
          400,
        );
      }
    }

    // Validate age range
    if (params.ageMin !== undefined && params.ageMax !== undefined) {
      if (params.ageMin > params.ageMax) {
        throw new ApiError(
          "Minimum age cannot be greater than maximum age",
          400,
        );
      }
    }

    const result = await productService.clientSearchProducts(params);

    res.status(200).json({
      status: "success",
      message: "Products fetched successfully",
      data: {
        products: result.products,
        filters: result.filters,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: result.total,
          pages: result.pages,
          hasNext: (params.page ?? 1) < result.pages,
          hasPrev: (params.page ?? 1) > 1,
        },
      },
    });
  },
);
// Get top selling products based on booking frequency
export const getTopSellingProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      limit = 10,
      timeRange = "month", // day, week, month, year, all
      category,
      state,
    } = req.query;

    const result = await productService.getTopSellingProducts({
      limit: parseInt(limit as string),
      timeRange: timeRange as "day" | "week" | "month" | "year" | "all",
      category: category as string,
      state: state as string,
    });

    res.status(200).json({
      status: "success",
      message: "Top selling products fetched successfully",
      data: result,
    });
  },
);

// Admin endpoint to manually mark products as top selling (featured)
export const markAsTopSelling = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { isTopSelling = true, rank, notes } = req.body;

    const product = await productService.markAsTopSelling(
      productId,
      isTopSelling,
      rank,
      notes,
    );

    res.status(200).json({
      status: "success",
      message: `Product ${isTopSelling ? "marked" : "unmarked"} as top selling`,
      data: { product },
    });
  },
);
/* =========================
   ADMIN SEARCH PRODUCTS
========================= */
/* =========================
   ADMIN SEARCH PRODUCTS - FIXED
========================= */
export const adminSearchProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      searchTerm,
      productId,
      active,
      available,
      categories,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Parse categories from query string (comma-separated)
    const categoriesArray = categories
      ? (categories as string).split(",").filter((cat) => cat.trim())
      : [];

    // Validate productId if provided
    if (productId) {
      if (!Types.ObjectId.isValid(productId as string)) {
        throw new ApiError("Invalid product ID format", 400);
      }
    }

    const params: productService.AdminSearchParams = {
      searchTerm: searchTerm as string,
      productId: productId as string,
      active: active !== undefined ? active === "true" : undefined,
      available: available !== undefined ? available === "true" : undefined,
      categories: categoriesArray,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await productService.adminSearchProducts(params);

    res.status(200).json({
      status: "success",
      message: "Products fetched successfully",
      data: {
        products: result.products,
        filters: result.filters,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: result.total,
          pages: result.pages,
          hasNext: (params.page ?? 1) < result.pages,
          hasPrev: (params.page ?? 1) > 1,
        },
      },
    });
  },
);

/* =========================
   GET AVAILABLE FILTERS
========================= */
export const getAvailableFilters = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const filters = await productService.getAvailableFilters();

    res.status(200).json({
      status: "success",
      message: "Available filters fetched successfully",
      data: {
        filters,
      },
    });
  },
);
const validateRequiredFields = (
  body: any,
  requiredFields: string[],
): string[] => {
  const missing: string[] = [];

  requiredFields.forEach((field) => {
    const value = body[field];

    if (value === undefined) {
      missing.push(field);
    } else if (typeof value === "string" && value.trim() === "") {
      missing.push(field);
    } else if (Array.isArray(value) && value.length === 0) {
      missing.push(field);
    } else if (value === null) {
      missing.push(field);
    }
  });

  return missing;
};

/* =========================
   CREATE PRODUCT WITH FILE UPLOAD
========================= */
export const createProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("=== CREATE PRODUCT CONTROLLER START ===");
    console.log("Request headers:", req.headers["content-type"]);
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request files type:", typeof req.files);

    // Check if files exist in the request
    if (!req.files) {
      console.log("ERROR: No files found in request");
      throw new ApiError("No files uploaded. Please upload images.", 400);
    }

    // Debug the files structure
    const files = req.files as any;
    console.log("Files object structure:", JSON.stringify(files, null, 2));
    console.log("Files object keys:", Object.keys(files));

    // Extract files with proper type handling
    let imageCoverFile: Express.Multer.File | undefined;
    let imageFiles: Express.Multer.File[] = [];

    // Handle imageCover - check multiple possible field names
    if (files.imageCover && files.imageCover.length > 0) {
      imageCoverFile = files.imageCover[0];
    } else if (files["imageCover[]"] && files["imageCover[]"].length > 0) {
      imageCoverFile = files["imageCover[]"][0];
    } else if (Array.isArray(files) && files.length > 0) {
      // If files is an array (unlikely but possible)
      const fileArray = files as Express.Multer.File[];
      imageCoverFile = fileArray[0];
      console.log(
        "Found imageCover in files array:",
        imageCoverFile.originalname,
      );
    }

    if (!imageCoverFile) {
      console.log("ERROR: No imageCover file found");
      throw new ApiError("Cover image is required", 400);
    }

    // Handle images - check multiple possible field names
    if (
      files.images &&
      Array.isArray(files.images) &&
      files.images.length > 0
    ) {
      imageFiles = files.images;
      console.log(`Found ${imageFiles.length} images in 'images' field`);
    } else if (
      files["images[]"] &&
      Array.isArray(files["images[]"]) &&
      files["images[]"].length > 0
    ) {
      imageFiles = files["images[]"];
      console.log(`Found ${imageFiles.length} images in 'images[]' field`);
    } else if (files.image && files.image.length > 0) {
      // Check singular 'image' field
      imageFiles = Array.isArray(files.image) ? files.image : [files.image];
      console.log(`Found ${imageFiles.length} images in 'image' field`);
    }

    // If still no images, check if there's a single file that's not the cover
    if (imageFiles.length === 0) {
      // Check all file fields
      for (const fieldName in files) {
        if (fieldName !== "imageCover" && fieldName !== "imageCover[]") {
          const fieldFiles = files[fieldName];
          if (Array.isArray(fieldFiles) && fieldFiles.length > 0) {
            imageFiles = fieldFiles;
            console.log(
              `Found ${imageFiles.length} images in '${fieldName}' field`,
            );
            break;
          }
        }
      }
    }

    if (imageFiles.length === 0) {
      console.log("ERROR: No product images found");
      throw new ApiError("At least one product image is required", 400);
    }

    if (imageFiles.length > 5) {
      throw new ApiError("Maximum 5 images allowed", 400);
    }

    console.log(
      `Processing: 1 cover image and ${imageFiles.length} product images`,
    );

    // Upload files to Cloudinary
    let imageCoverUrl = "";
    let imageUrls: string[] = [];

    try {
      console.log("Uploading cover image to Cloudinary...");
      imageCoverUrl = await uploadToCloudinary(imageCoverFile);
      console.log("Cover image uploaded successfully:", imageCoverUrl);

      console.log("Uploading product images to Cloudinary...");
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        console.log(
          `Uploading product image ${i + 1}/${imageFiles.length}: ${
            file.originalname
          }`,
        );
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
        console.log(`Image ${i + 1} uploaded: ${url}`);
      }
      console.log("All images uploaded successfully");
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      throw new ApiError(`Failed to upload images: ${error.message}`, 500);
    }

    // Get and validate text fields from request body
    console.log("Processing request body fields...");
    const {
      name,
      description,
      summary,
      price,
      perDayPrice,
      perWeekPrice,
      deliveryAndCollection,
      priceDiscount,
      duration,
      maxGroupSize,
      difficulty,
      categories,
      location,
      dimensions,
      availableFrom,
      availableUntil,
      size,
      active = "true",
      stock,
      isSensitive = "false",
      material,
      design,
      ageRange,
      safetyFeatures,
      qualityAssurance,
      deliveryTimeOptions,
      collectionTimeOptions,
      defaultDeliveryTime,
      defaultCollectionTime,
      deliveryTimeFee,
      collectionTimeFee,
    } = req.body;

    // Log received fields for debugging
    console.log("Received fields:", {
      name,
      description: description ? `${description.substring(0, 50)}...` : "empty",
      price,
      categories,
      material,
      design,
    });

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!description) missingFields.push("description");
    if (!price) missingFields.push("price");
    if (!material) missingFields.push("material");
    if (!design) missingFields.push("design");
    if (!categories) missingFields.push("categories");

    if (missingFields.length > 0) {
      console.log("ERROR: Missing required fields:", missingFields);
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400,
      );
    }

    // Parse categories
    let categoriesArray: string[] = [];
    try {
      if (Array.isArray(categories)) {
        categoriesArray = categories;
      } else if (typeof categories === "string") {
        // Try JSON first
        try {
          const parsed = JSON.parse(categories);
          if (Array.isArray(parsed)) {
            categoriesArray = parsed;
          } else {
            categoriesArray = [parsed];
          }
        } catch {
          // If not JSON, try comma-separated
          categoriesArray = categories
            .split(",")
            .map((cat) => cat.trim())
            .filter((cat) => cat.length > 0);
        }
      }

      if (categoriesArray.length === 0) {
        throw new ApiError("At least one category is required", 400);
      }

      console.log("Categories parsed:", categoriesArray);
    } catch (error: any) {
      throw new ApiError(`Invalid categories: ${error.message}`, 400);
    }

    // Helper function to parse JSON fields
    const parseJsonField = (field: any, fieldName: string): any => {
      if (!field && field !== 0 && field !== false) return undefined;

      if (typeof field === "object") return field;

      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }

      return field;
    };

    // Helper function to parse numeric fields
    const parseNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === "")
        return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    };

    // Helper function to parse boolean fields
    const parseBoolean = (value: any): boolean => {
      if (value === undefined || value === null) return false;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
      }
      if (typeof value === "number") return value !== 0;
      return Boolean(value);
    };

    // Build product data object
    const productData: any = {
      name: String(name),
      description: String(description),
      summary: summary ? String(summary) : undefined,
      price: parseNumber(price) || 0,
      perDayPrice: parseNumber(perDayPrice),
      perWeekPrice: parseNumber(perWeekPrice),
      deliveryAndCollection: deliveryAndCollection
        ? String(deliveryAndCollection)
        : "",
      priceDiscount: parseNumber(priceDiscount),
      duration: duration ? String(duration) : "",
      maxGroupSize: parseInt(String(maxGroupSize || 1)) || 1,
      difficulty: (difficulty as "easy" | "medium" | "difficult") || "medium",
      categories: categoriesArray,
      images: imageUrls,
      imageCover: imageCoverUrl,
      location: {
        state: "",
        city: "",
      },
      dimensions: {
        length: 1,
        width: 1,
        height: 1,
      },
      availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
      availableUntil: availableUntil
        ? new Date(availableUntil)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      size: size ? String(size) : undefined,
      active: parseBoolean(active),
      stock: parseInt(String(stock || 0)) || 0,
      isSensitive: parseBoolean(isSensitive),
      material: String(material),
      design: String(design),
      ageRange: {
        min: 0,
        max: 0,
        unit: "years" as "years" | "months",
      },
      safetyFeatures: [],
      qualityAssurance: {
        isCertified: false,
      },
      deliveryTimeOptions: ["8am-12pm", "12pm-4pm", "4pm-8pm"],
      collectionTimeOptions: ["before_5pm", "after_5pm", "next_day"],
      defaultDeliveryTime: "8am-12pm",
      defaultCollectionTime: "before_5pm",
      deliveryTimeFee: 0,
      collectionTimeFee: 0,
    };

    // Parse location
    try {
      const parsedLocation = parseJsonField(location, "location");
      if (parsedLocation) {
        if (typeof parsedLocation === "object") {
          if (parsedLocation.state)
            productData.location.state = String(parsedLocation.state);
          if (parsedLocation.city)
            productData.location.city = String(parsedLocation.city);
        } else {
          productData.location.state = String(parsedLocation);
        }
      }
    } catch (error) {
      console.warn("Failed to parse location:", error);
    }

    // Parse dimensions
    try {
      const parsedDimensions = parseJsonField(dimensions, "dimensions");
      if (parsedDimensions && typeof parsedDimensions === "object") {
        if (parsedDimensions.length)
          productData.dimensions.length =
            parseNumber(parsedDimensions.length) || 1;
        if (parsedDimensions.width)
          productData.dimensions.width =
            parseNumber(parsedDimensions.width) || 1;
        if (parsedDimensions.height)
          productData.dimensions.height =
            parseNumber(parsedDimensions.height) || 1;
      }
    } catch (error) {
      console.warn("Failed to parse dimensions:", error);
    }

    // Parse age range
    try {
      const parsedAgeRange = parseJsonField(ageRange, "ageRange");
      if (parsedAgeRange && typeof parsedAgeRange === "object") {
        if (parsedAgeRange.min !== undefined)
          productData.ageRange.min = parseInt(String(parsedAgeRange.min)) || 0;
        if (parsedAgeRange.max !== undefined)
          productData.ageRange.max = parseInt(String(parsedAgeRange.max)) || 0;
        if (
          parsedAgeRange.unit &&
          ["years", "months"].includes(parsedAgeRange.unit)
        ) {
          productData.ageRange.unit = parsedAgeRange.unit;
        }
      }
    } catch (error) {
      console.warn("Failed to parse ageRange:", error);
    }

    // Parse safety features
    try {
      const parsedSafetyFeatures = parseJsonField(
        safetyFeatures,
        "safetyFeatures",
      );
      if (parsedSafetyFeatures) {
        if (Array.isArray(parsedSafetyFeatures)) {
          productData.safetyFeatures = parsedSafetyFeatures.map(String);
        } else if (typeof parsedSafetyFeatures === "string") {
          productData.safetyFeatures = [parsedSafetyFeatures];
        }
      }
    } catch (error) {
      console.warn("Failed to parse safetyFeatures:", error);
    }

    // Parse quality assurance
    try {
      const parsedQA = parseJsonField(qualityAssurance, "qualityAssurance");
      if (parsedQA) {
        productData.qualityAssurance = {
          isCertified: parseBoolean(parsedQA.isCertified),
          certification: parsedQA.certification
            ? String(parsedQA.certification)
            : undefined,
          warrantyPeriod: parsedQA.warrantyPeriod
            ? String(parsedQA.warrantyPeriod)
            : undefined,
          warrantyDetails: parsedQA.warrantyDetails
            ? String(parsedQA.warrantyDetails)
            : undefined,
        };
      }
    } catch (error) {
      console.warn("Failed to parse qualityAssurance:", error);
    }

    // Parse delivery/collection options
    try {
      const parsedDeliveryOptions = parseJsonField(
        deliveryTimeOptions,
        "deliveryTimeOptions",
      );
      if (parsedDeliveryOptions && Array.isArray(parsedDeliveryOptions)) {
        productData.deliveryTimeOptions = parsedDeliveryOptions.map(String);
      }
    } catch (error) {
      console.warn("Failed to parse deliveryTimeOptions:", error);
    }

    try {
      const parsedCollectionOptions = parseJsonField(
        collectionTimeOptions,
        "collectionTimeOptions",
      );
      if (parsedCollectionOptions && Array.isArray(parsedCollectionOptions)) {
        productData.collectionTimeOptions = parsedCollectionOptions.map(String);
      }
    } catch (error) {
      console.warn("Failed to parse collectionTimeOptions:", error);
    }

    if (defaultDeliveryTime)
      productData.defaultDeliveryTime = String(defaultDeliveryTime);
    if (defaultCollectionTime)
      productData.defaultCollectionTime = String(defaultCollectionTime);
    if (deliveryTimeFee)
      productData.deliveryTimeFee = parseNumber(deliveryTimeFee) || 0;
    if (collectionTimeFee)
      productData.collectionTimeFee = parseNumber(collectionTimeFee) || 0;

    console.log("Product data prepared. Creating product...");
    console.log("Product data summary:", {
      name: productData.name,
      price: productData.price,
      categories: productData.categories.length,
      images: productData.images.length,
      coverImage: !!productData.imageCover,
      material: productData.material,
      design: productData.design,
    });

    // Create the product
    try {
      const product = await productService.createProduct(productData);
      console.log("Product created successfully with ID:", product._id);

      res.status(201).json({
        status: "success",
        message: "Product created successfully",
        data: { product },
      });
    } catch (error: any) {
      console.error("Error creating product in service:", error);
      throw new ApiError(`Failed to create product: ${error.message}`, 500);
    }
  },
);

/* =========================
   UPDATE PRODUCT WITH FILE UPLOAD
========================= */

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const productId = req.params.id;
    const updateData: any = { ...req.body };
    const files = req.files as any;

    // ===== Handle Cover Image =====
    if (files?.imageCover?.[0]) {
      updateData.imageCover = await uploadToCloudinary(files.imageCover[0]);
    }

    // ===== Handle Product Images =====
    if (files?.images?.length) {
      if (files.images.length > 5)
        throw new ApiError("Maximum 5 images allowed", 400);
      updateData.images = await Promise.all(
        files.images.map((file: any) => uploadToCloudinary(file)),
      );
    }

    // ===== Parse nested JSON strings =====
    const nestedFields = [
      "dimensions",
      "location",
      "ageRange",
      "qualityAssurance",
      "bookedDates",
    ];
    nestedFields.forEach((field) => {
      if (updateData[field] && typeof updateData[field] === "string") {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch {
          throw new ApiError(`Invalid JSON for field ${field}`, 400);
        }
      }
    });

    // ===== Convert category strings to ObjectIds =====
    if (updateData.categories) {
      if (typeof updateData.categories === "string") {
        // Comma separated string
        updateData.categories = updateData.categories
          .split(",")
          .map((id: string) => new Types.ObjectId(id.trim()));
      } else if (Array.isArray(updateData.categories)) {
        updateData.categories = updateData.categories.map(
          (id: string) => new Types.ObjectId(id),
        );
      }
    }

    // ===== Convert vendor, discount, stock, active fields to correct types =====
    const numberFields = [
      "price",
      "perDayPrice",
      "perWeekPrice",
      "priceDiscount",
      "discount",
      "stock",
      "deliveryTimeFee",
      "collectionTimeFee",
      "maxGroupSize",
      "topPickRank",
      "salesCount",
    ];
    numberFields.forEach((field) => {
      if (updateData[field] !== undefined)
        updateData[field] = Number(updateData[field]);
    });

    const booleanFields = [
      "active",
      "isSensitive",
      "isTopPick",
      "isTopSelling",
    ];
    booleanFields.forEach((field) => {
      if (updateData[field] !== undefined)
        updateData[field] =
          updateData[field] === "true" || updateData[field] === true;
    });

    const dateFields = ["availableFrom", "availableUntil"];
    dateFields.forEach((field) => {
      if (updateData[field]) updateData[field] = new Date(updateData[field]);
    });

    // ===== Call service to update product =====
    const product = await productService.updateProductService(
      productId,
      updateData,
    );

    res.status(200).json({
      status: "success",
      message: "Product updated successfully",
      data: { product },
    });
  },
);

export const getAllProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const state = req.query.state as string;
    const category = req.query.category as string;

    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice as string)
      : undefined;

    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice as string)
      : undefined;

    const search = req.query.search as string; // 🔍 product name

    const result = await productService.getAllProducts(
      page,
      limit,
      state,
      category,
      minPrice,
      maxPrice,
      search,
    );

    res.status(200).json({
      status: "success",
      results: result.products.length,
      data: {
        products: result.products,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  },
);

export const getProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);

    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  },
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    await productService.deleteProduct(productId);

    res.status(200).json({
      status: "success",
      message: "Product deleted successfully",
    });
  },
);

export const getProductsByState = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const state = req.params.state;
    const products = await productService.getProductsByState(state);

    res.status(200).json({
      status: "success",
      results: products.length,
      data: {
        products,
      },
    });
  },
);

export const getAvailableStates = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const states = await productService.getAvailableStates();

    res.status(200).json({
      status: "success",
      results: states.length,
      data: {
        states,
      },
    });
  },
);

export const updateProductStock = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      throw new ApiError("Valid stock quantity is required", 400);
    }

    const product = await productService.updateProductStock(productId, stock);

    res.status(200).json({
      status: "success",
      message: "Product stock updated successfully",
      data: {
        product,
      },
    });
  },
);

export const getFeaturedProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 8;
    const products = await productService.getFeaturedProducts(limit);

    res.status(200).json({
      status: "success",
      results: products.length,
      data: {
        products,
      },
    });
  },
);

export const searchProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.trim().length < 2) {
      throw new ApiError(
        "Search query must be at least 2 characters long",
        400,
      );
    }

    const result = await productService.searchProducts(
      query.trim(),
      page,
      limit,
    );

    res.status(200).json({
      status: "success",
      results: result.products.length,
      data: {
        products: result.products,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  },
);

export const getProductsByCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = req.params.categoryId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await productService.getProductsByCategory(
      categoryId,
      page,
      limit,
    );

    res.status(200).json({
      status: "success",
      results: result.products.length,
      data: {
        products: result.products,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  },
);
// Add these to your existing product.controller.ts

// Get top picks (simplified version)
export const getTopPicks = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 8;

  const topPicks = await productService.getTopPicks(limit);

  res.status(200).json({
    success: true,
    data: {
      topPicks,
    },
  });
});

// Admin: Mark/unmark as top pick
export const markAsTopPick = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { isTopPick = true } = req.body;

    const product = await productService.markAsTopPick(productId, isTopPick);

    res.status(200).json({
      success: true,
      message: `Product ${isTopPick ? "marked" : "unmarked"} as top pick`,
      data: { product },
    });
  },
);

// ... all your existing controller functions remain

/* =========================
   GET FREQUENTLY BOUGHT TOGETHER
========================= */

/* =========================
   GET FREQUENTLY BOUGHT TOGETHER WITH ENHANCED FIELDS
========================= */
export const getFrequentlyBoughtTogether = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productIds } = req.body;
    const limit = parseInt(req.query.limit as string) || 5;

    // Validate input
    if (!productIds || !Array.isArray(productIds)) {
      throw new ApiError("Product IDs array is required", 400);
    }

    if (productIds.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No products provided",
        data: {
          recommendations: [],
          count: 0,
        },
      });
    }

    // Validate each product ID
    for (const id of productIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(`Invalid product ID: ${id}`, 400);
      }
    }

    const recommendations = await productService.getFrequentlyBoughtTogether(
      productIds,
      limit,
    );

    // Get booked dates for all recommended products
    const recommendedProductIds = recommendations
      .filter((p) => p && p._id)
      .map((p) => (p._id as unknown as string).toString());

    const bookedDatesMap = await productService.getBookedDatesForProducts(
      recommendedProductIds,
    );

    // Enhance recommendations with additional fields
    const enhancedRecommendations = await Promise.all(
      recommendations.map(async (product: any) => {
        if (!product) return null;

        const productId = product._id?.toString();

        return {
          id: productId,
          name: product.name,
          description: product.description,
          price: product.price,
          discount: product.discount || 0,
          discountPrice: product.discountPrice || product.price,
          dimensions: product.dimensions || {
            length: 0,
            width: 0,
            height: 0,
          },
          images: product.images || [], // Return all images
          imageCover: product.imageCover, // Also include cover separately
          material: product.material,
          design: product.design,
          ageRange: product.ageRange,
          safetyFeatures: product.safetyFeatures || [],
          qualityAssurance: product.qualityAssurance,
          location: product.location,
          categories: product.categories,
          bookedDates: bookedDatesMap[productId] || [],
          frequentlyBoughtDetails: product.frequentlyBoughtTogether?.find(
            (item: any) => {
              const itemId =
                item.productId?._id?.toString() || item.productId?.toString();
              return productIds.includes(itemId);
            },
          ),
          metadata: {
            isAvailable: product.stock > 0,
            stock: product.stock,
            active: product.active,
            hasDiscount: (product.discount || 0) > 0,
            totalImages: (product.images || []).length,
          },
        };
      }),
    ).then((results) => results.filter((r) => r !== null));

    res.status(200).json({
      status: "success",
      message: "Frequently bought together products",
      data: {
        recommendations: enhancedRecommendations,
        count: enhancedRecommendations.length,
        requestedProducts: productIds,
        metadata: {
          includes: [
            "discount",
            "dimensions",
            "images",
            "bookedDates",
            "material",
            "design",
            "ageRange",
            "safetyFeatures",
          ],
          requestedProducts: productIds.length,
          foundProducts: enhancedRecommendations.length,
        },
      },
    });
  },
);

/* =========================
   GET CART RECOMMENDATIONS
========================= */
export const getCartRecommendations = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cartItems } = req.body;
    const limit = parseInt(req.query.limit as string) || 8;

    // Validate input
    if (!cartItems || !Array.isArray(cartItems)) {
      throw new ApiError("Cart items array is required", 400);
    }

    // Validate cart items
    const validCartItems = cartItems
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        productId: item.productId,
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
      }))
      .filter((item) => item.productId);

    const recommendations = await productService.getCartRecommendations(
      validCartItems,
      limit,
    );

    res.status(200).json({
      status: "success",
      message: "Cart recommendations",
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  },
);

/* =========================
   RECORD PURCHASE FOR ANALYTICS
========================= */
export const recordPurchase = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { orderItems } = req.body;

    // Validate input
    if (!orderItems || !Array.isArray(orderItems)) {
      throw new ApiError("Order items array is required", 400);
    }

    // Extract product IDs
    const productIds: string[] = [];

    for (const item of orderItems) {
      if (!item || !item.productId) {
        continue;
      }

      if (!Types.ObjectId.isValid(item.productId)) {
        throw new ApiError(`Invalid product ID: ${item.productId}`, 400);
      }

      productIds.push(item.productId);
    }

    // Need at least 2 products for meaningful recommendations
    if (productIds.length < 2) {
      return res.status(200).json({
        status: "success",
        message: "Purchase recorded (insufficient data for recommendations)",
      });
    }

    // Record purchase
    await productService.recordPurchase(productIds);

    res.status(200).json({
      status: "success",
      message: "Purchase recorded for recommendation analytics",
    });
  },
);
/* =========================
   ADD FREQUENTLY BOUGHT TOGETHER PRODUCTS (Admin Only)
========================= */
/* =========================
   ADD FREQUENTLY BOUGHT TOGETHER PRODUCTS (Admin Only)
========================= */
/* =========================
   CREATE FREQUENTLY BOUGHT RELATIONSHIPS (Admin Only)
========================= */
/* =========================
   CREATE FREQUENTLY BOUGHT RELATIONSHIPS WITH FILE UPLOAD
========================= */
export const createFrequentlyBoughtRelationships = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productIds } = req.body;
    const files = req.files as any;

    // Validate input
    if (!productIds || !Array.isArray(productIds)) {
      throw new ApiError("Product IDs array is required", 400);
    }

    if (productIds.length < 2) {
      throw new ApiError("At least 2 product IDs are required", 400);
    }

    // Validate each product ID
    for (const id of productIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(`Invalid product ID: ${id}`, 400);
      }
    }

    // Extract additional data for product updates
    const {
      discount,
      dimensions,
      // Other update fields can be added here
    } = req.body;

    // Prepare update data for each product
    const productUpdates: { [productId: string]: any } = {};

    // Process files if uploaded
    if (files) {
      // Handle image cover updates
      if (files.newImageCover && files.newImageCover.length > 0) {
        try {
          const newImageCover = files.newImageCover[0];
          const coverUrl = await uploadToCloudinary(newImageCover);

          // Apply cover to first product or all products? Let's apply to first product
          const firstProductId = productIds[0];
          productUpdates[firstProductId] = productUpdates[firstProductId] || {};
          productUpdates[firstProductId].imageCover = coverUrl;

          console.log(
            `Updated cover image for product ${firstProductId}: ${coverUrl}`,
          );
        } catch (error: any) {
          console.error("Failed to upload cover image:", error);
        }
      }

      // Handle additional images
      if (files["images[]"] && files["images[]"].length > 0) {
        const newImages = files["images[]"];
        try {
          const imageUrls = await Promise.all(
            newImages.map(async (file: Express.Multer.File) => {
              return await uploadToCloudinary(file);
            }),
          );

          // Apply images to products - you can decide logic here
          // For example, apply to all products or specific ones
          productIds.forEach((productId, index) => {
            if (index < imageUrls.length) {
              productUpdates[productId] = productUpdates[productId] || {};
              productUpdates[productId].$push =
                productUpdates[productId].$push || {};
              productUpdates[productId].$push.images = {
                $each: [imageUrls[index]],
                $position: 0,
              };
            }
          });
        } catch (error: any) {
          console.error("Failed to upload images:", error);
        }
      }
    }

    // Process other update fields
    if (discount !== undefined) {
      const discountValue = parseFloat(discount);
      if (!isNaN(discountValue) && discountValue >= 0 && discountValue <= 100) {
        productIds.forEach((productId) => {
          productUpdates[productId] = productUpdates[productId] || {};
          productUpdates[productId].discount = discountValue;
        });
      }
    }

    if (dimensions) {
      try {
        const parsedDimensions =
          typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;

        if (parsedDimensions && typeof parsedDimensions === "object") {
          const { length, width, height } = parsedDimensions;

          productIds.forEach((productId) => {
            productUpdates[productId] = productUpdates[productId] || {};
            productUpdates[productId].dimensions = {
              length: parseFloat(length) || 1,
              width: parseFloat(width) || 1,
              height: parseFloat(height) || 1,
            };
          });
        }
      } catch (error) {
        console.warn("Failed to parse dimensions:", error);
      }
    }

    // Create frequently bought relationships
    const updatedProducts =
      await productService.createFrequentlyBoughtRelationships(
        productIds,
        productUpdates,
      );

    res.status(200).json({
      status: "success",
      message:
        "Frequently bought relationships created successfully with updates",
      data: {
        products: updatedProducts.map((product) => ({
          id: product._id,
          name: product.name,
          price: product.price,
          discount: product.discount || 0,
          discountPrice: product.discount || product.price,
          dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
          images: product.images || [],
          imageCover: product.imageCover,
          frequentlyBoughtTogether: product.frequentlyBoughtTogether?.map(
            (item: any) => ({
              productId: item.productId?._id || item.productId,
              productName: item.productId?.name || "Unknown",
              frequency: item.frequency,
              confidence: item.confidence,
            }),
          ),
        })),
        count: updatedProducts.length,
        metadata: {
          filesUploaded: files ? Object.keys(files).length : 0,
          fieldsUpdated: Object.keys(productUpdates).length,
          totalProducts: productIds.length,
        },
      },
    });
  },
);

export const getAllFrequentRelationships = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const relationships = await productService.getAllFrequentRelationships();

    res.status(200).json({
      status: "success",
      message: "All frequently bought relationships fetched successfully",
      data: {
        relationships,
        count: relationships.length,
        totalConnections: relationships.reduce(
          (sum, product) => sum + product.frequentlyBought.length,
          0,
        ),
      },
    });
  },
);
