"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableLocations = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
// src/services/product.service.ts
const product_model_1 = __importDefault(require("../models/product.model"));
const location_model_1 = __importDefault(require("../models/location.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const getAllProducts = async (query = {}) => {
    const { page = 1, limit = 10, sort = "-createdAt", fields, search, 
    // Location filters
    location, country, state, city, locationType, 
    // Date filters
    availableFrom, availableUntil, travelDate, 
    // Other filters
    category, difficulty, minPrice, maxPrice, minDuration, maxDuration, minGroupSize, maxGroupSize, ...otherFilters } = query;
    // Build filter object
    let filterObj = { isActive: true };
    // Text search across name, description, and summary
    if (search) {
        filterObj.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { summary: { $regex: search, $options: "i" } },
        ];
    }
    // Location filtering - multiple approaches
    if (location) {
        // Direct location ID
        filterObj.location = location;
    }
    else if (country || state || city || locationType) {
        // Find locations that match the criteria first
        const locationFilter = {};
        if (country)
            locationFilter.country = country;
        if (state)
            locationFilter.state = state;
        if (city)
            locationFilter.city = city;
        if (locationType)
            locationFilter.type = locationType;
        const matchingLocations = await location_model_1.default.find(locationFilter).select("_id");
        const locationIds = matchingLocations.map((loc) => loc._id);
        if (locationIds.length > 0) {
            filterObj.location = { $in: locationIds };
        }
        else {
            // If no locations match, return empty results
            filterObj.location = { $in: [] };
        }
    }
    // Date filtering
    if (travelDate) {
        const targetDate = new Date(travelDate);
        filterObj.availableFrom = { $lte: targetDate };
        filterObj.availableUntil = { $gte: targetDate };
    }
    else {
        if (availableFrom) {
            filterObj.availableUntil = { $gte: new Date(availableFrom) };
        }
        if (availableUntil) {
            filterObj.availableFrom = { $lte: new Date(availableUntil) };
        }
    }
    // Category filtering
    if (category) {
        filterObj.categories = Array.isArray(category)
            ? { $in: category }
            : category;
    }
    // Difficulty filtering
    if (difficulty) {
        filterObj.difficulty = Array.isArray(difficulty)
            ? { $in: difficulty }
            : difficulty;
    }
    // Price range filtering
    if (minPrice || maxPrice) {
        filterObj.price = {};
        if (minPrice)
            filterObj.price.$gte = Number(minPrice);
        if (maxPrice)
            filterObj.price.$lte = Number(maxPrice);
    }
    // Duration range filtering
    if (minDuration || maxDuration) {
        filterObj.duration = {};
        if (minDuration)
            filterObj.duration.$gte = Number(minDuration);
        if (maxDuration)
            filterObj.duration.$lte = Number(maxDuration);
    }
    // Group size range filtering
    if (minGroupSize || maxGroupSize) {
        filterObj.maxGroupSize = {};
        if (minGroupSize)
            filterObj.maxGroupSize.$gte = Number(minGroupSize);
        if (maxGroupSize)
            filterObj.maxGroupSize.$lte = Number(maxGroupSize);
    }
    // Field limiting
    const fieldsStr = fields ? fields.split(",").join(" ") : "";
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    // Build sort object
    let sortObj = {};
    if (sort) {
        const sortFields = sort.split(",");
        sortFields.forEach((field) => {
            const sortOrder = field.startsWith("-") ? -1 : 1;
            const fieldName = field.replace("-", "");
            sortObj[fieldName] = sortOrder;
        });
    }
    // Execute query with population
    const products = await product_model_1.default.find(filterObj)
        .populate("categories")
        .populate({
        path: "location",
        select: "name type country state city fullAddress coordinates",
    })
        .select(fieldsStr)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit));
    const total = await product_model_1.default.countDocuments(filterObj);
    return { products, total };
};
exports.getAllProducts = getAllProducts;
const getProductById = async (id) => {
    const product = await product_model_1.default.findById(id).populate("categories").populate({
        path: "location",
        select: "name type country state city fullAddress coordinates description",
    });
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    return product;
};
exports.getProductById = getProductById;
const createProduct = async (productData) => {
    // Validate location exists
    if (productData.location) {
        const location = await location_model_1.default.findById(productData.location);
        if (!location) {
            throw new apiError_1.default("Location not found", 404);
        }
    }
    // Validate dates
    if (productData.availableFrom && productData.availableUntil) {
        if (new Date(productData.availableUntil) <=
            new Date(productData.availableFrom)) {
            throw new apiError_1.default("Available until date must be after available from date", 400);
        }
    }
    const product = await product_model_1.default.create(productData);
    // Populate the location before returning
    await product.populate({
        path: "location",
        select: "name type country state city fullAddress coordinates",
    });
    return product;
};
exports.createProduct = createProduct;
const updateProduct = async (id, updateData) => {
    // Validate location if provided
    if (updateData.location) {
        const location = await location_model_1.default.findById(updateData.location);
        if (!location) {
            throw new apiError_1.default("Location not found", 404);
        }
    }
    const product = await product_model_1.default.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate("categories")
        .populate({
        path: "location",
        select: "name type country state city fullAddress coordinates",
    });
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    return product;
};
exports.updateProduct = updateProduct;
const deleteProduct = async (id) => {
    const product = await product_model_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
};
exports.deleteProduct = deleteProduct;
// Helper function to get available locations for products
const getAvailableLocations = async () => {
    const locations = await product_model_1.default.aggregate([
        { $match: { isActive: true } },
        {
            $lookup: {
                from: "locations",
                localField: "location",
                foreignField: "_id",
                as: "locationData",
            },
        },
        { $unwind: "$locationData" },
        {
            $group: {
                _id: "$locationData._id",
                name: { $first: "$locationData.name" },
                type: { $first: "$locationData.type" },
                country: { $first: "$locationData.country" },
                state: { $first: "$locationData.state" },
                city: { $first: "$locationData.city" },
                productCount: { $sum: 1 },
            },
        },
        { $sort: { productCount: -1, name: 1 } },
    ]);
    return locations;
};
exports.getAvailableLocations = getAvailableLocations;
