"use strict";
// src/services/product.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsByCategory = exports.searchProducts = exports.getFeaturedProducts = exports.updateProductStock = exports.getAvailableStates = exports.getProductsByState = exports.deleteProduct = exports.getProductById = exports.getAllProducts = exports.updateProduct = exports.createProduct = void 0;
const category_model_1 = __importDefault(require("../models/category.model"));
const product_model_1 = __importDefault(require("../models/product.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const mongoose_1 = require("mongoose");
const createProduct = async (productData) => {
    console.log("🆕 [SERVICE] Creating new product with categories:", {
        name: productData.name,
        categories: productData.categories,
    });
    // Validate categories exist
    if (productData.categories && productData.categories.length > 0) {
        // Convert string IDs to ObjectId
        const categoryIds = productData.categories.map((id) => new mongoose_1.Types.ObjectId(id));
        // Check if all categories exist and are active
        const categories = await category_model_1.default.find({
            _id: { $in: categoryIds },
            isActive: true,
        });
        if (categories.length !== productData.categories.length) {
            throw new apiError_1.default("One or more categories are invalid or inactive", 400);
        }
        // Replace string IDs with ObjectId instances
        productData.categories = categoryIds;
    }
    else {
        throw new apiError_1.default("At least one category is required", 400);
    }
    // Auto-set country to England
    const productWithLocation = {
        ...productData,
        location: {
            country: "England",
            state: productData.location.state,
            city: productData.location.city || "",
        },
        dateAdded: new Date(),
    };
    const product = await product_model_1.default.create(productWithLocation);
    // Populate category details
    await product.populate({
        path: "categories",
        select: "name slug description image",
        match: { isActive: true },
    });
    console.log("✅ [SERVICE] Product created successfully:", product._id);
    return product;
};
exports.createProduct = createProduct;
const updateProduct = async (productId, updateData) => {
    console.log("🔄 [SERVICE] Updating product:", productId);
    if (!mongoose_1.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default("Invalid product ID", 400);
    }
    // Validate categories if being updated
    if (updateData.categories && updateData.categories.length > 0) {
        // Convert string IDs to ObjectId
        const categoryIds = updateData.categories.map((id) => new mongoose_1.Types.ObjectId(id));
        // Check if all categories exist and are active
        const categories = await category_model_1.default.find({
            _id: { $in: categoryIds },
            isActive: true,
        });
        if (categories.length !== updateData.categories.length) {
            throw new apiError_1.default("One or more categories are invalid or inactive", 400);
        }
        // Replace string IDs with ObjectId instances
        updateData.categories = categoryIds;
    }
    // Handle location update
    if (updateData.location) {
        updateData.location = {
            country: "England",
            state: updateData.location.state || "",
            city: updateData.location.city || "",
        };
    }
    const product = await product_model_1.default.findByIdAndUpdate(productId, updateData, {
        new: true,
        runValidators: true,
    }).populate({
        path: "categories",
        select: "name slug description image",
        match: { isActive: true },
    });
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    console.log("✅ [SERVICE] Product updated successfully");
    return product;
};
exports.updateProduct = updateProduct;
const getAllProducts = async (page = 1, limit = 10, state, category, minPrice, maxPrice) => {
    const skip = (page - 1) * limit;
    const filter = { active: true };
    // Filter by state
    if (state) {
        filter["location.state"] = { $regex: state, $options: "i" };
    }
    // Filter by category
    if (category && mongoose_1.Types.ObjectId.isValid(category)) {
        filter.categories = new mongoose_1.Types.ObjectId(category);
    }
    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined)
            filter.price.$gte = minPrice;
        if (maxPrice !== undefined)
            filter.price.$lte = maxPrice;
    }
    const products = await product_model_1.default.find(filter)
        .populate("categories", "name description")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await product_model_1.default.countDocuments(filter);
    return {
        products,
        total,
        pages: Math.ceil(total / limit),
    };
};
exports.getAllProducts = getAllProducts;
const getProductById = async (productId) => {
    if (!mongoose_1.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default("Invalid product ID", 400);
    }
    const product = await product_model_1.default.findById(productId).populate("categories", "name description");
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    return product;
};
exports.getProductById = getProductById;
const deleteProduct = async (productId) => {
    console.log("🗑️ [SERVICE] Deleting product:", productId);
    if (!mongoose_1.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default("Invalid product ID", 400);
    }
    const product = await product_model_1.default.findByIdAndUpdate(productId, { active: false }, { new: true });
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    console.log("✅ [SERVICE] Product deleted successfully");
};
exports.deleteProduct = deleteProduct;
const getProductsByState = async (state) => {
    console.log("🗺️ [SERVICE] Getting products by state:", state);
    const products = await product_model_1.default.find({
        "location.state": { $regex: state, $options: "i" },
        active: true,
    }).populate("categories", "name description");
    return products;
};
exports.getProductsByState = getProductsByState;
const getAvailableStates = async () => {
    const states = await product_model_1.default.distinct("location.state", { active: true });
    return states.sort();
};
exports.getAvailableStates = getAvailableStates;
const updateProductStock = async (productId, newStock) => {
    console.log("📦 [SERVICE] Updating product stock:", { productId, newStock });
    if (!mongoose_1.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default("Invalid product ID", 400);
    }
    if (newStock < 0) {
        throw new apiError_1.default("Stock cannot be negative", 400);
    }
    const product = await product_model_1.default.findByIdAndUpdate(productId, { stock: newStock }, { new: true, runValidators: true }).populate("categories", "name description");
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    console.log("✅ [SERVICE] Product stock updated successfully");
    return product;
};
exports.updateProductStock = updateProductStock;
// NEW: Get featured products
const getFeaturedProducts = async (limit = 8) => {
    console.log("⭐ [SERVICE] Getting featured products");
    const products = await product_model_1.default.find({
        active: true,
        stock: { $gt: 0 },
    })
        .populate("categories", "name description")
        .sort({ createdAt: -1 })
        .limit(limit);
    return products;
};
exports.getFeaturedProducts = getFeaturedProducts;
// NEW: Search products
const searchProducts = async (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const searchFilter = {
        active: true,
        $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { summary: { $regex: query, $options: "i" } },
            { "location.state": { $regex: query, $options: "i" } },
            { "location.city": { $regex: query, $options: "i" } },
        ],
    };
    const products = await product_model_1.default.find(searchFilter)
        .populate("categories", "name description")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await product_model_1.default.countDocuments(searchFilter);
    return {
        products,
        total,
        pages: Math.ceil(total / limit),
    };
};
exports.searchProducts = searchProducts;
// NEW: Get products by category
const getProductsByCategory = async (categoryId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    if (!mongoose_1.Types.ObjectId.isValid(categoryId)) {
        throw new apiError_1.default("Invalid category ID", 400);
    }
    const filter = {
        active: true,
        categories: new mongoose_1.Types.ObjectId(categoryId),
    };
    const products = await product_model_1.default.find(filter)
        .populate("categories", "name description")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await product_model_1.default.countDocuments(filter);
    return {
        products,
        total,
        pages: Math.ceil(total / limit),
    };
};
exports.getProductsByCategory = getProductsByCategory;
