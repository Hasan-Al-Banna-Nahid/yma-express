import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as productService from "./product.service";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import Category from "../Category/category.model";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import Product from "./product.model";
import sharp from "sharp"; // এটি ইনস্টল করে নিন: npm install sharp

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

const parseImageAltTexts = (body: Record<string, any>): string[] => {
  if (Array.isArray(body.imageAltTexts)) {
    return body.imageAltTexts.map((v) => String(v || "").trim());
  }

  if (typeof body.imageAltTexts === "string") {
    const value = body.imageAltTexts.trim();
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v || "").trim());
      }
    } catch {
      // Keep compatibility with repeated single string fallback
      return [value];
    }
  }

  const indexedEntries = Object.entries(body)
    .map(([key, value]) => {
      const match = key.match(/^imageAltTexts\[(\d+)\]$/);
      if (!match) return null;
      return { index: Number(match[1]), value: String(value || "").trim() };
    })
    .filter(
      (entry): entry is { index: number; value: string } => entry !== null,
    )
    .sort((a, b) => a.index - b.index);

  return indexedEntries.map((entry) => entry.value);
};

/* ---------------- CREATE PRODUCT ---------------- */
/* ---------------- CREATE PRODUCT ---------------- */

// ==========================================
// CREATE PRODUCT
// ==========================================
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const productData = { ...req.body };

    // ১. ইমেজ কভার প্রসেসিং (Cloudinary)
    if (files?.["imageCover"]?.[0]) {
      productData.imageCover = await uploadToCloudinary(
        files["imageCover"][0].buffer,
        "products/covers",
      );
    }

    // ২. সার্টিফিকেট প্রসেসিং (Direct MongoDB with Compression)
    const certFiles = files?.["certificates"] || files?.["certificates[]"];
    if (certFiles) {
      const processedCerts = await Promise.all(
        certFiles.map(async (file) => {
          // যদি PDF হয়, সরাসরি Base64 এ কনভার্ট
          if (file.mimetype === "application/pdf") {
            return `data:application/pdf;base64,${file.buffer.toString("base64")}`;
          }

          // যদি ইমেজ হয়, Sharp দিয়ে কম্প্রেস করে Base64
          try {
            const buffer = await sharp(file.buffer)
              .resize(800)
              .jpeg({ quality: 60 })
              .toBuffer();
            return `data:image/jpeg;base64,${buffer.toString("base64")}`;
          } catch (err) {
            // Sharp ফেইল করলে অরিজিনাল বাফারই বেস৬৪ করে দেওয়া হলো
            return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          }
        }),
      );
      productData.certificates = processedCerts;
    }

    // ৩. ডাটাবেজে সেভ করা
    const product = await productService.createProduct(productData);

    res.status(201).json({
      status: "success",
      data: product,
    });
  },
);

// ==========================================
// UPDATE PRODUCT
// ==========================================
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const productId = req.params.id;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const updateData = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, "imageCoverAltText")) {
      updateData.imageCoverAltText = String(
        req.body.imageCoverAltText || "",
      ).trim();
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, "imageAltTexts") ||
      Object.keys(req.body).some((key) => /^imageAltTexts\[\d+\]$/.test(key))
    ) {
      updateData.imageAltTexts = parseImageAltTexts(req.body);
    }

    // ১. ইমেজ কভার আপডেট (Cloudinary)
    if (files?.["imageCover"]?.[0]) {
      updateData.imageCover = await uploadToCloudinary(
        files["imageCover"][0].buffer,
        "products/covers",
      );
    }

    // ২. নতুন সার্টিফিকেট যুক্ত করা (Direct MongoDB)
    const certFiles = files?.["certificates"] || files?.["certificates[]"];
    if (certFiles) {
      const processedCerts = await Promise.all(
        certFiles.map(async (file) => {
          if (file.mimetype === "application/pdf") {
            return `data:application/pdf;base64,${file.buffer.toString("base64")}`;
          }
          try {
            const buffer = await sharp(file.buffer)
              .resize(800)
              .jpeg({ quality: 60 })
              .toBuffer();
            return `data:image/jpeg;base64,${buffer.toString("base64")}`;
          } catch (err) {
            return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          }
        }),
      );

      // আপনি চাইলে আগের সার্টিফিকেটের সাথে নতুনগুলো যোগ ($push) করতে পারেন
      // অথবা পুরোটা রিপ্লেস করতে পারেন। এখানে রিপ্লেস লজিক দেওয়া হলো:
      updateData.certificates = processedCerts;
    }

    // ৩. ডাটাবেজ আপডেট
    const updatedProduct = await productService.updateProductService(
      productId,
      updateData,
    );

    res.status(200).json({
      status: "success",
      data: updatedProduct,
    });
  },
);

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      state,
      city,
      category,
      minPrice,
      maxPrice,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      showAll,
      productId,
    } = req.query;

    const result = await productService.getAllProducts(
      Number(page) || 1,
      Number(limit) || 10,
      state as string,
      city as string,
      category as string,
      minPrice ? Number(minPrice) : undefined,
      maxPrice ? Number(maxPrice) : undefined,
      search as string,
      startDate as string,
      endDate as string,
      (sortBy as any) || "createdAt",
      (sortOrder as any) || "desc",
      showAll === "true",
      productId as string,
    );

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: result.products,
      meta: {
        total: result.total,
        pages: result.pages,
        currentPage: Number(page) || 1,
        limit: Number(limit) || 10,
      },
    });
  } catch (error: any) {
    console.error("Error in getProducts Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

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

export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const slug = req.params.slug;
    const product = await productService.getProductBySlug(slug);

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
              return await uploadToCloudinary(file.buffer);
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
