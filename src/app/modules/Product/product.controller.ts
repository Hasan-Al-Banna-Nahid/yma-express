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
          400
        );
      }
    }

    // Validate age range
    if (params.ageMin !== undefined && params.ageMax !== undefined) {
      if (params.ageMin > params.ageMax) {
        throw new ApiError(
          "Minimum age cannot be greater than maximum age",
          400
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
  }
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
  }
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
      notes
    );

    res.status(200).json({
      status: "success",
      message: `Product ${isTopSelling ? "marked" : "unmarked"} as top selling`,
      data: { product },
    });
  }
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
  }
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
  }
);
const validateRequiredFields = (
  body: any,
  requiredFields: string[]
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
        imageCoverFile.originalname
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
              `Found ${imageFiles.length} images in '${fieldName}' field`
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
      `Processing: 1 cover image and ${imageFiles.length} product images`
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
          }`
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
        400
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
        "safetyFeatures"
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
        "deliveryTimeOptions"
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
        "collectionTimeOptions"
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
  }
);

/* =========================
   UPDATE PRODUCT WITH FILE UPLOAD
========================= */
export const updateProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    console.log("=== UPDATE PRODUCT CONTROLLER START ===");
    console.log("Updating product ID:", productId);

    const files = req.files as any;
    const updateData: any = {};

    console.log("Update files received:", files ? Object.keys(files) : "none");
    console.log("Update body received:", req.body);

    // Handle file uploads
    if (files) {
      // Handle new cover image
      if (files.newImageCover && files.newImageCover.length > 0) {
        const newImageCover = files.newImageCover[0];
        console.log("Uploading new cover image:", newImageCover.originalname);
        try {
          const newCoverUrl = await uploadToCloudinary(newImageCover);
          updateData.newImageCover = newCoverUrl;
          console.log("New cover image uploaded:", newCoverUrl);
        } catch (error: any) {
          throw new ApiError(
            `Failed to upload cover image: ${error.message}`,
            500
          );
        }
      } else if (
        files["newImageCover[]"] &&
        files["newImageCover[]"].length > 0
      ) {
        const newImageCover = files["newImageCover[]"][0];
        console.log(
          "Uploading new cover image from array:",
          newImageCover.originalname
        );
        try {
          const newCoverUrl = await uploadToCloudinary(newImageCover);
          updateData.newImageCover = newCoverUrl;
          console.log("New cover image uploaded:", newCoverUrl);
        } catch (error: any) {
          throw new ApiError(
            `Failed to upload cover image: ${error.message}`,
            500
          );
        }
      }

      // Handle new product images
      let newImages: Express.Multer.File[] = [];
      if (
        files.newImages &&
        Array.isArray(files.newImages) &&
        files.newImages.length > 0
      ) {
        newImages = files.newImages;
        console.log(
          `Found ${newImages.length} new images in 'newImages' field`
        );
      } else if (
        files["newImages[]"] &&
        Array.isArray(files["newImages[]"]) &&
        files["newImages[]"].length > 0
      ) {
        newImages = files["newImages[]"];
        console.log(
          `Found ${newImages.length} new images in 'newImages[]' field`
        );
      }

      if (newImages.length > 0) {
        if (newImages.length > 5) {
          throw new ApiError("Maximum 5 images allowed", 400);
        }

        console.log("Uploading new product images to Cloudinary...");
        try {
          const newImageUrls = await Promise.all(
            newImages.map(async (file: Express.Multer.File, index: number) => {
              console.log(
                `Uploading new image ${index + 1}:`,
                file.originalname
              );
              const url = await uploadToCloudinary(file);
              console.log(`New image ${index + 1} uploaded:`, url);
              return url;
            })
          );
          updateData.newImages = newImageUrls;
          console.log("All new images uploaded successfully");
        } catch (error: any) {
          throw new ApiError(`Failed to upload images: ${error.message}`, 500);
        }
      }
    }

    // Process text fields from body
    const textFields = [
      "name",
      "description",
      "summary",
      "price",
      "perDayPrice",
      "perWeekPrice",
      "deliveryAndCollection",
      "priceDiscount",
      "duration",
      "maxGroupSize",
      "difficulty",
      "categories",
      "size",
      "active",
      "stock",
      "isSensitive",
      "material",
      "design",
      "location",
      "dimensions",
      "availableFrom",
      "availableUntil",
      "ageRange",
      "safetyFeatures",
      "qualityAssurance",
      "deliveryTimeOptions",
      "collectionTimeOptions",
      "defaultDeliveryTime",
      "defaultCollectionTime",
      "deliveryTimeFee",
      "collectionTimeFee",
    ];

    // Helper function to parse field value
    const parseFieldValue = (value: any, fieldName: string): any => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      // Handle JSON strings
      if (typeof value === "string") {
        if (
          (value.startsWith("{") && value.endsWith("}")) ||
          (value.startsWith("[") && value.endsWith("]"))
        ) {
          try {
            return JSON.parse(value);
          } catch {
            // If JSON parsing fails, return as string
            return value;
          }
        }
      }

      return value;
    };

    // Add fields from request body
    textFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        updateData[field] = parseFieldValue(req.body[field], field);
      }
    });

    // Helper function to convert value
    const convertValue = (
      value: any,
      type: "number" | "int" | "bool" | "date"
    ): any => {
      if (value === undefined || value === null) return undefined;

      switch (type) {
        case "number":
          const num = parseFloat(String(value));
          return isNaN(num) ? undefined : num;
        case "int":
          const int = parseInt(String(value), 10);
          return isNaN(int) ? undefined : int;
        case "bool":
          if (typeof value === "boolean") return value;
          if (typeof value === "string") {
            return value.toLowerCase() === "true" || value === "1";
          }
          if (typeof value === "number") return value !== 0;
          return Boolean(value);
        case "date":
          try {
            return new Date(value);
          } catch {
            return undefined;
          }
        default:
          return value;
      }
    };

    // Convert numeric fields
    const numericFields = [
      "price",
      "perDayPrice",
      "perWeekPrice",
      "priceDiscount",
      "deliveryTimeFee",
      "collectionTimeFee",
    ];
    numericFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateData[field] = convertValue(updateData[field], "number");
      }
    });

    // Convert integer fields
    const intFields = ["maxGroupSize", "stock"];
    intFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateData[field] = convertValue(updateData[field], "int");
      }
    });

    // Convert boolean fields
    if (updateData.active !== undefined) {
      updateData.active = convertValue(updateData.active, "bool");
    }
    if (updateData.isSensitive !== undefined) {
      updateData.isSensitive = convertValue(updateData.isSensitive, "bool");
    }

    // Convert date fields
    if (updateData.availableFrom !== undefined) {
      updateData.availableFrom = convertValue(updateData.availableFrom, "date");
    }
    if (updateData.availableUntil !== undefined) {
      updateData.availableUntil = convertValue(
        updateData.availableUntil,
        "date"
      );
    }

    // Handle categories if provided
    if (updateData.categories !== undefined) {
      let categoriesArray: string[] = [];

      if (Array.isArray(updateData.categories)) {
        categoriesArray = updateData.categories;
      } else if (typeof updateData.categories === "string") {
        try {
          // Try JSON first
          const parsed = JSON.parse(updateData.categories);
          if (Array.isArray(parsed)) {
            categoriesArray = parsed;
          } else {
            categoriesArray = [parsed];
          }
        } catch {
          // If not JSON, try comma-separated
          categoriesArray = updateData.categories
            .split(",")
            .map((cat: string) => cat.trim())
            .filter((cat: string) => cat.length > 0);
        }
      }

      if (categoriesArray.length > 0) {
        updateData.categories = categoriesArray;
      } else {
        delete updateData.categories;
      }
    }

    console.log("Update data prepared:", {
      fields: Object.keys(updateData),
      hasFiles: !!(updateData.newImageCover || updateData.newImages),
    });

    // Update the product
    try {
      const product = await productService.updateProduct(productId, updateData);
      console.log("Product updated successfully");

      res.status(200).json({
        status: "success",
        message: "Product updated successfully",
        data: {
          product,
        },
      });
    } catch (error: any) {
      console.error("Error updating product:", error);
      throw new ApiError(`Failed to update product: ${error.message}`, 500);
    }
  }
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

    const result = await productService.getAllProducts(
      page,
      limit,
      state,
      category,
      minPrice,
      maxPrice
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
  }
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
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    await productService.deleteProduct(productId);

    res.status(200).json({
      status: "success",
      message: "Product deleted successfully",
    });
  }
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
  }
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
  }
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
  }
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
  }
);

export const searchProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.trim().length < 2) {
      throw new ApiError(
        "Search query must be at least 2 characters long",
        400
      );
    }

    const result = await productService.searchProducts(
      query.trim(),
      page,
      limit
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
  }
);

export const getProductsByCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = req.params.categoryId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await productService.getProductsByCategory(
      categoryId,
      page,
      limit
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
  }
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
  }
);

// ... all your existing controller functions remain

/* =========================
   GET FREQUENTLY BOUGHT TOGETHER
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
      limit
    );

    res.status(200).json({
      status: "success",
      message: "Frequently bought together products",
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  }
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
      limit
    );

    res.status(200).json({
      status: "success",
      message: "Cart recommendations",
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  }
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
  }
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
export const createFrequentlyBoughtRelationships = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productIds } = req.body;

    // Validate input
    if (!productIds || !Array.isArray(productIds)) {
      throw new ApiError("Product IDs array is required", 400);
    }

    if (productIds.length < 2) {
      throw new ApiError("At least 2 product IDs are required", 400);
    }

    // Remove duplicates
    const uniqueProductIds = [...new Set(productIds)];

    const updatedProducts =
      await productService.createFrequentlyBoughtRelationships(
        uniqueProductIds
      );

    res.status(200).json({
      status: "success",
      message: "Frequently bought relationships created successfully",
      data: {
        products: updatedProducts,
        count: updatedProducts.length,
      },
    });
  }
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
          0
        ),
      },
    });
  }
);
