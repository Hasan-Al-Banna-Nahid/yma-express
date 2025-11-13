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
exports.getAvailableLocations = exports.deleteProduct = exports.updateProduct = exports.getProduct = exports.getProducts = exports.createProduct = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const productService = __importStar(require("../services/product.service"));
const cloudinary_util_1 = require("../utils/cloudinary.util");
exports.createProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    let imageCoverUrl;
    let imagesUrls = [];
    // Handle cover image
    if (req.files && req.files.imageCover) {
        imageCoverUrl = await (0, cloudinary_util_1.uploadToCloudinary)(req.files.imageCover[0]);
    }
    // Handle multiple images
    if (req.files && req.files.images) {
        for (const file of req.files.images) {
            const imageUrl = await (0, cloudinary_util_1.uploadToCloudinary)(file);
            imagesUrls.push(imageUrl);
        }
    }
    // Parse request data
    const productData = {
        ...req.body,
        ...(imageCoverUrl && { imageCover: imageCoverUrl }),
        ...(imagesUrls.length > 0 && { images: imagesUrls }),
        categories: req.body.categories ? JSON.parse(req.body.categories) : [],
        location: req.body.location,
        availableFrom: new Date(req.body.availableFrom),
        availableUntil: new Date(req.body.availableUntil),
        price: parseFloat(req.body.price),
        priceDiscount: req.body.priceDiscount
            ? parseFloat(req.body.priceDiscount)
            : undefined,
        duration: parseInt(req.body.duration),
        maxGroupSize: parseInt(req.body.maxGroupSize),
    };
    const product = await productService.createProduct(productData);
    res.status(201).json({
        status: "success",
        data: {
            product,
        },
    });
});
exports.getProducts = (0, asyncHandler_1.default)(async (req, res, next) => {
    const { products, total } = await productService.getAllProducts(req.query);
    res.status(200).json({
        status: "success",
        results: products.length,
        total,
        data: {
            products,
        },
    });
});
exports.getProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({
        status: "success",
        data: {
            product,
        },
    });
});
exports.updateProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    let imageCoverUrl;
    let imagesUrls = [];
    if (req.files && req.files.imageCover) {
        imageCoverUrl = await (0, cloudinary_util_1.uploadToCloudinary)(req.files.imageCover[0]);
    }
    if (req.files && req.files.images) {
        for (const file of req.files.images) {
            const imageUrl = await (0, cloudinary_util_1.uploadToCloudinary)(file);
            imagesUrls.push(imageUrl);
        }
    }
    const updateData = {
        ...req.body,
        ...(imageCoverUrl && { imageCover: imageCoverUrl }),
    };
    // Parse specific fields if provided
    if (req.body.categories) {
        updateData.categories = JSON.parse(req.body.categories);
    }
    if (req.body.availableFrom) {
        updateData.availableFrom = new Date(req.body.availableFrom);
    }
    if (req.body.availableUntil) {
        updateData.availableUntil = new Date(req.body.availableUntil);
    }
    if (req.body.price) {
        updateData.price = parseFloat(req.body.price);
    }
    if (req.body.priceDiscount) {
        updateData.priceDiscount = parseFloat(req.body.priceDiscount);
    }
    if (req.body.duration) {
        updateData.duration = parseInt(req.body.duration);
    }
    if (req.body.maxGroupSize) {
        updateData.maxGroupSize = parseInt(req.body.maxGroupSize);
    }
    // If new images are uploaded, replace the existing ones
    if (imagesUrls.length > 0) {
        updateData.images = imagesUrls;
    }
    const product = await productService.updateProduct(req.params.id, updateData);
    res.status(200).json({
        status: "success",
        data: {
            product,
        },
    });
});
exports.deleteProduct = (0, asyncHandler_1.default)(async (req, res, next) => {
    await productService.deleteProduct(req.params.id);
    res.status(204).json({
        status: "success",
        data: null,
    });
});
exports.getAvailableLocations = (0, asyncHandler_1.default)(async (req, res, next) => {
    const locations = await productService.getAvailableLocations();
    res.status(200).json({
        status: "success",
        results: locations.length,
        data: {
            locations,
        },
    });
});
