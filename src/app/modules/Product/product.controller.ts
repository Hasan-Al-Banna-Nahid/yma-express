import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as productService from "./product.service";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
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

export const createProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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
      images,
      imageCover,
      location,
      dimensions,
      availableFrom,
      availableUntil,
      size,
      active = true,
      stock,
      isSensitive,
      material,
      design,
      ageRange,
      safetyFeatures,
      qualityAssurance,
    } = req.body;

    const requiredFields = [
      "name",
      "description",
      "price",
      "deliveryAndCollection",
      "duration",
      "maxGroupSize",
      "difficulty",
      "categories",
      "images",
      "imageCover",
      "location",
      "dimensions",
      "availableFrom",
      "availableUntil",
      "stock",
      "material",
      "design",
      "ageRange",
      "safetyFeatures",
      "qualityAssurance",
    ];

    if (isSensitive === undefined) {
      throw new ApiError("isSensitive field is required", 400);
    }

    const missingFields = validateRequiredFields(req.body, requiredFields);
    if (missingFields.length > 0) {
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      throw new ApiError("Categories must be a non-empty array", 400);
    }

    for (const categoryId of categories) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(`Invalid category ID: ${categoryId}`, 400);
      }
    }

    if (!location || !location.state) {
      throw new ApiError("Location state is required", 400);
    }

    if (
      !dimensions ||
      !dimensions.length ||
      !dimensions.width ||
      !dimensions.height
    ) {
      throw new ApiError(
        "Dimensions (length, width, height) are required",
        400
      );
    }

    if (
      dimensions.length < 1 ||
      dimensions.width < 1 ||
      dimensions.height < 1
    ) {
      throw new ApiError("Dimensions must be at least 1 foot", 400);
    }

    if (!ageRange || !ageRange.min || !ageRange.max || !ageRange.unit) {
      throw new ApiError("Age range (min, max, unit) is required", 400);
    }

    if (ageRange.min < 0 || ageRange.max < 0) {
      throw new ApiError("Age values cannot be negative", 400);
    }

    if (ageRange.max < ageRange.min) {
      throw new ApiError("Maximum age must be greater than minimum age", 400);
    }

    if (!["years", "months"].includes(ageRange.unit)) {
      throw new ApiError("Age unit must be 'years' or 'months'", 400);
    }

    if (!Array.isArray(safetyFeatures) || safetyFeatures.length === 0) {
      throw new ApiError("At least one safety feature is required", 400);
    }

    if (
      !qualityAssurance ||
      typeof qualityAssurance.isCertified !== "boolean"
    ) {
      throw new ApiError(
        "Quality assurance certification status is required",
        400
      );
    }

    const product = await productService.createProduct({
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
      images,
      imageCover,
      location: {
        state: location.state,
        city: location.city,
      },
      dimensions: {
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
      },
      availableFrom: new Date(availableFrom),
      availableUntil: new Date(availableUntil),
      size,
      active,
      stock,
      isSensitive: isSensitive || false,
      material,
      design,
      ageRange: {
        min: ageRange.min,
        max: ageRange.max,
        unit: ageRange.unit,
      },
      safetyFeatures,
      qualityAssurance: {
        isCertified: qualityAssurance.isCertified,
        certification: qualityAssurance.certification,
        warrantyPeriod: qualityAssurance.warrantyPeriod,
        warrantyDetails: qualityAssurance.warrantyDetails,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: {
        product,
      },
    });
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

export const updateProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const updateData = req.body;

    // Enhanced validation for all fields
    if (updateData.categories) {
      if (!Array.isArray(updateData.categories)) {
        throw new ApiError("Categories must be an array", 400);
      }
      for (const categoryId of updateData.categories) {
        if (!Types.ObjectId.isValid(categoryId)) {
          throw new ApiError(`Invalid category ID: ${categoryId}`, 400);
        }
      }
    }

    if (updateData.dimensions) {
      const { length, width, height } = updateData.dimensions;
      if (length !== undefined && length < 1) {
        throw new ApiError("Length must be at least 1 foot", 400);
      }
      if (width !== undefined && width < 1) {
        throw new ApiError("Width must be at least 1 foot", 400);
      }
      if (height !== undefined && height < 1) {
        throw new ApiError("Height must be at least 1 foot", 400);
      }
    }

    if (updateData.ageRange) {
      const { min, max, unit } = updateData.ageRange;

      if (min !== undefined && min < 0) {
        throw new ApiError("Minimum age cannot be negative", 400);
      }

      if (max !== undefined && max < 0) {
        throw new ApiError("Maximum age cannot be negative", 400);
      }

      if (min !== undefined && max !== undefined && max < min) {
        throw new ApiError("Maximum age must be greater than minimum age", 400);
      }

      if (unit !== undefined && !["years", "months"].includes(unit)) {
        throw new ApiError("Age unit must be 'years' or 'months'", 400);
      }
    }

    if (updateData.safetyFeatures !== undefined) {
      if (!Array.isArray(updateData.safetyFeatures)) {
        throw new ApiError("Safety features must be an array", 400);
      }
      if (updateData.safetyFeatures.length === 0) {
        throw new ApiError("At least one safety feature is required", 400);
      }
    }

    if (updateData.qualityAssurance) {
      if (
        updateData.qualityAssurance.isCertified !== undefined &&
        typeof updateData.qualityAssurance.isCertified !== "boolean"
      ) {
        throw new ApiError("Certification status must be boolean", 400);
      }
    }

    if (updateData.price !== undefined && updateData.price < 0) {
      throw new ApiError("Price cannot be negative", 400);
    }

    if (updateData.stock !== undefined && updateData.stock < 0) {
      throw new ApiError("Stock cannot be negative", 400);
    }

    if (updateData.maxGroupSize !== undefined && updateData.maxGroupSize < 1) {
      throw new ApiError("Max group size must be at least 1", 400);
    }

    // Validate date range if both dates are provided
    if (updateData.availableFrom && updateData.availableUntil) {
      const startDate = new Date(updateData.availableFrom);
      const endDate = new Date(updateData.availableUntil);

      if (startDate > endDate) {
        throw new ApiError(
          "Available from date cannot be after available until date",
          400
        );
      }
    }

    const product = await productService.updateProduct(productId, updateData);

    res.status(200).json({
      status: "success",
      message: "Product updated successfully",
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
