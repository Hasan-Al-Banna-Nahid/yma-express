import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as productService from "../services/product.service";
import { uploadToCloudinary } from "../utils/cloudinary.util";
import ApiError from "../utils/apiError";

export const createProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let imageCoverUrl;
    let imagesUrls: string[] = [];

    // Handle cover image
    if (req.files && (req.files as any).imageCover) {
      imageCoverUrl = await uploadToCloudinary(
        (req.files as any).imageCover[0]
      );
    }

    // Handle multiple images
    if (req.files && (req.files as any).images) {
      for (const file of (req.files as any).images) {
        const imageUrl = await uploadToCloudinary(file);
        imagesUrls.push(imageUrl);
      }
    }

    // Validate required fields
    if (!req.body.location) {
      throw new ApiError("Location is required", 400);
    }

    // Parse and validate dates
    let availableFrom: Date | undefined;
    let availableUntil: Date | undefined;

    if (req.body.availableFrom) {
      availableFrom = new Date(req.body.availableFrom);
      if (isNaN(availableFrom.getTime())) {
        throw new ApiError("Invalid availableFrom date format", 400);
      }
    }

    if (req.body.availableUntil) {
      availableUntil = new Date(req.body.availableUntil);
      if (isNaN(availableUntil.getTime())) {
        throw new ApiError("Invalid availableUntil date format", 400);
      }
    }

    // Parse request data with proper validation
    const productData = {
      name: req.body.name,
      description: req.body.description,
      summary: req.body.summary,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      priceDiscount: req.body.priceDiscount
        ? parseFloat(req.body.priceDiscount)
        : undefined,
      duration: req.body.duration ? parseInt(req.body.duration) : undefined,
      maxGroupSize: req.body.maxGroupSize
        ? parseInt(req.body.maxGroupSize)
        : undefined,
      difficulty: req.body.difficulty,
      categories: req.body.categories
        ? typeof req.body.categories === "string"
          ? JSON.parse(req.body.categories)
          : req.body.categories
        : [],
      location: req.body.location,
      availableFrom: availableFrom,
      availableUntil: availableUntil,
      stock: req.body.stock ? parseInt(req.body.stock) : 0,
      size: req.body.size,
      ...(imageCoverUrl && { imageCover: imageCoverUrl }),
      ...(imagesUrls.length > 0 && { images: imagesUrls }),
    };

    // Validate required fields
    const requiredFields = [
      "name",
      "description",
      "price",
      "duration",
      "maxGroupSize",
      "difficulty",
      "location",
    ];
    const missingFields = requiredFields.filter(
      (field) => !productData[field as keyof typeof productData]
    );

    if (missingFields.length > 0) {
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    if (!availableFrom || !availableUntil) {
      throw new ApiError(
        "Both availableFrom and availableUntil dates are required",
        400
      );
    }

    const product = await productService.createProduct(productData);

    res.status(201).json({
      status: "success",
      data: {
        product,
      },
    });
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let imageCoverUrl;
    let imagesUrls: string[] = [];

    if (req.files && (req.files as any).imageCover) {
      imageCoverUrl = await uploadToCloudinary(
        (req.files as any).imageCover[0]
      );
    }

    if (req.files && (req.files as any).images) {
      for (const file of (req.files as any).images) {
        const imageUrl = await uploadToCloudinary(file);
        imagesUrls.push(imageUrl);
      }
    }

    const updateData: any = {};

    // Parse specific fields if provided with validation
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.summary) updateData.summary = req.body.summary;
    if (req.body.price) updateData.price = parseFloat(req.body.price);
    if (req.body.priceDiscount)
      updateData.priceDiscount = parseFloat(req.body.priceDiscount);
    if (req.body.duration) updateData.duration = parseInt(req.body.duration);
    if (req.body.maxGroupSize)
      updateData.maxGroupSize = parseInt(req.body.maxGroupSize);
    if (req.body.difficulty) updateData.difficulty = req.body.difficulty;
    if (req.body.size) updateData.size = req.body.size;
    if (req.body.location) updateData.location = req.body.location;

    // Parse categories
    if (req.body.categories) {
      updateData.categories =
        typeof req.body.categories === "string"
          ? JSON.parse(req.body.categories)
          : req.body.categories;
    }

    // Parse and validate dates
    if (req.body.availableFrom) {
      const availableFrom = new Date(req.body.availableFrom);
      if (isNaN(availableFrom.getTime())) {
        throw new ApiError("Invalid availableFrom date format", 400);
      }
      updateData.availableFrom = availableFrom;
    }

    if (req.body.availableUntil) {
      const availableUntil = new Date(req.body.availableUntil);
      if (isNaN(availableUntil.getTime())) {
        throw new ApiError("Invalid availableUntil date format", 400);
      }
      updateData.availableUntil = availableUntil;
    }

    // Handle stock update
    if (req.body.stock !== undefined) {
      updateData.stock = parseInt(req.body.stock);
    }

    // Handle image updates
    if (imageCoverUrl) updateData.imageCover = imageCoverUrl;
    if (imagesUrls.length > 0) updateData.images = imagesUrls;

    const product = await productService.updateProduct(
      req.params.id,
      updateData
    );

    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  }
);

export const getProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { products, total } = await productService.getAllProducts(req.query);

    res.status(200).json({
      status: "success",
      results: products.length,
      total,
      data: {
        products,
      },
    });
  }
);

export const getProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await productService.getProductById(req.params.id);

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
    await productService.deleteProduct(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

export const getAvailableLocations = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locations = await productService.getAvailableLocations();

    res.status(200).json({
      status: "success",
      results: locations.length,
      data: {
        locations,
      },
    });
  }
);

export const searchProducts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { location, ...filters } = req.query;

    if (!location) {
      throw new ApiError("Location query parameter is required", 400);
    }

    const { products, total } = await productService.searchProductsByLocation(
      location as string,
      filters
    );

    res.status(200).json({
      status: "success",
      results: products.length,
      total,
      data: {
        products,
      },
    });
  }
);
