"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsByCategory = exports.searchProducts = exports.getFeaturedProducts = exports.updateProductStock = exports.getAvailableStates = exports.getProductsByState = exports.deleteProduct = exports.updateProduct = exports.getProduct = exports.getAllProducts = exports.createProduct = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const productService = __importStar(require("../services/product.service"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const mongoose_1 = require("mongoose");
exports.createProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    const { name, description, summary, price, perDayPrice, perWeekPrice, deliveryAndCollection, priceDiscount, duration, maxGroupSize, difficulty, categories, // Expecting array of category IDs
    images, imageCover, location, dimensions, availableFrom, availableUntil, size, active = true, stock, isSensitive, material, design, ageRange, safetyFeatures, qualityAssurance, } = req.body;
    console.log("🆕 [CONTROLLER] Creating product with categories:", categories);
    // Validate required fields
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
        "isSensitive",
        "material",
        "design",
        "ageRange",
        "safetyFeatures",
        "qualityAssurance",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
        throw new apiError_1.default(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }
    // Validate categories is an array
    if (!Array.isArray(categories) || categories.length === 0) {
        throw new apiError_1.default("Categories must be a non-empty array", 400);
    }
    // Validate each category ID format
    for (const categoryId of categories) {
        if (!mongoose_1.Types.ObjectId.isValid(categoryId)) {
            throw new apiError_1.default(`Invalid category ID: ${categoryId}`, 400);
        }
    }
    // Validate location
    if (!location || !location.state) {
        throw new apiError_1.default("Location state is required", 400);
    }
    // Validate dimensions
    if (!dimensions ||
        !dimensions.length ||
        !dimensions.width ||
        !dimensions.height) {
        throw new apiError_1.default("Dimensions (length, width, height) are required", 400);
    }
    if (dimensions.length < 1 ||
        dimensions.width < 1 ||
        dimensions.height < 1) {
        throw new apiError_1.default("Dimensions must be at least 1 foot", 400);
    }
    // Validate age range
    if (!ageRange || !ageRange.min || !ageRange.max || !ageRange.unit) {
        throw new apiError_1.default("Age range (min, max, unit) is required", 400);
    }
    if (ageRange.min < 0 || ageRange.max < 0) {
        throw new apiError_1.default("Age values cannot be negative", 400);
    }
    if (ageRange.max < ageRange.min) {
        throw new apiError_1.default("Maximum age must be greater than minimum age", 400);
    }
    if (!["years", "months"].includes(ageRange.unit)) {
        throw new apiError_1.default("Age unit must be 'years' or 'months'", 400);
    }
    // Validate safety features
    if (!Array.isArray(safetyFeatures) || safetyFeatures.length === 0) {
        throw new apiError_1.default("At least one safety feature is required", 400);
    }
    // Validate quality assurance
    if (!qualityAssurance ||
        typeof qualityAssurance.isCertified !== "boolean") {
        throw new apiError_1.default("Quality assurance certification status is required", 400);
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
        categories, // Array of category IDs
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
        isSensitive,
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
});
exports.getAllProducts = (0, asyncHandler_1.default)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const state = req.query.state;
    const category = req.query.category;
    const minPrice = req.query.minPrice
        ? parseFloat(req.query.minPrice)
        : undefined;
    const maxPrice = req.query.maxPrice
        ? parseFloat(req.query.maxPrice)
        : undefined;
    console.log("📋 [CONTROLLER] Getting all products:", {
        page,
        limit,
        state,
        category,
        minPrice,
        maxPrice,
    });
    const result = await productService.getAllProducts(page, limit, state, category, minPrice, maxPrice);
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
});
exports.getProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    const productId = req.params.id;
    console.log("🔍 [CONTROLLER] Getting product:", productId);
    const product = await productService.getProductById(productId);
    res.status(200).json({
        status: "success",
        data: {
            product,
        },
    });
});
exports.updateProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    const productId = req.params.id;
    const updateData = req.body;
    console.log("🔄 [CONTROLLER] Updating product:", productId);
    // Validate age range if provided
    if (updateData.ageRange) {
        const { min, max, unit } = updateData.ageRange;
        if (min !== undefined && min < 0) {
            throw new apiError_1.default("Minimum age cannot be negative", 400);
        }
        if (max !== undefined && max < 0) {
            throw new apiError_1.default("Maximum age cannot be negative", 400);
        }
        if (unit !== undefined && !["years", "months"].includes(unit)) {
            throw new apiError_1.default("Age unit must be 'years' or 'months'", 400);
        }
    }
    // Validate safety features if provided
    if (updateData.safetyFeatures !== undefined) {
        if (!Array.isArray(updateData.safetyFeatures)) {
            throw new apiError_1.default("Safety features must be an array", 400);
        }
        if (updateData.safetyFeatures.length === 0) {
            throw new apiError_1.default("At least one safety feature is required", 400);
        }
    }
    // Validate quality assurance if provided
    if (updateData.qualityAssurance) {
        if (updateData.qualityAssurance.isCertified !== undefined &&
            typeof updateData.qualityAssurance.isCertified !== "boolean") {
            throw new apiError_1.default("Certification status must be boolean", 400);
        }
    }
    // If location is provided in update, ensure it has the right structure
    if (updateData.location) {
        updateData.location = {
            country: "England", // Always England
            state: updateData.location.state || "",
            city: updateData.location.city || "",
        };
    }
    const product = await productService.updateProduct(productId, updateData);
    res.status(200).json({
        status: "success",
        message: "Product updated successfully",
        data: {
            product,
        },
    });
});
exports.deleteProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    const productId = req.params.id;
    console.log("🗑️ [CONTROLLER] Deleting product:", productId);
    await productService.deleteProduct(productId);
    res.status(200).json({
        status: "success",
        message: "Product deleted successfully",
    });
});
exports.getProductsByState = (0, asyncHandler_1.default)(async (req, res, next) => {
    const state = req.params.state;
    console.log("🗺️ [CONTROLLER] Getting products by state:", state);
    const products = await productService.getProductsByState(state);
    res.status(200).json({
        status: "success",
        results: products.length,
        data: {
            products,
        },
    });
});
exports.getAvailableStates = (0, asyncHandler_1.default)(async (req, res, next) => {
    console.log("🌍 [CONTROLLER] Getting available states");
    const states = await productService.getAvailableStates();
    res.status(200).json({
        status: "success",
        results: states.length,
        data: {
            states,
        },
    });
});
exports.updateProductStock = (0, asyncHandler_1.default)(async (req, res, next) => {
    const productId = req.params.id;
    const { stock } = req.body;
    console.log("📦 [CONTROLLER] Updating product stock:", {
        productId,
        stock,
    });
    if (stock === undefined || stock < 0) {
        throw new apiError_1.default("Valid stock quantity is required", 400);
    }
    const product = await productService.updateProductStock(productId, stock);
    res.status(200).json({
        status: "success",
        message: "Product stock updated successfully",
        data: {
            product,
        },
    });
});
// NEW: Get featured products
exports.getFeaturedProducts = (0, asyncHandler_1.default)(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 8;
    console.log("⭐ [CONTROLLER] Getting featured products");
    const products = await productService.getFeaturedProducts(limit);
    res.status(200).json({
        status: "success",
        results: products.length,
        data: {
            products,
        },
    });
});
// NEW: Search products
exports.searchProducts = (0, asyncHandler_1.default)(async (req, res, next) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    console.log("🔍 [CONTROLLER] Searching products:", { query, page, limit });
    if (!query || query.trim().length < 2) {
        throw new apiError_1.default("Search query must be at least 2 characters long", 400);
    }
    const result = await productService.searchProducts(query.trim(), page, limit);
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
});
// NEW: Get products by category
exports.getProductsByCategory = (0, asyncHandler_1.default)(async (req, res, next) => {
    const categoryId = req.params.categoryId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    console.log("📁 [CONTROLLER] Getting products by category:", {
        categoryId,
        page,
        limit,
    });
    const result = await productService.getProductsByCategory(categoryId, page, limit);
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
});
