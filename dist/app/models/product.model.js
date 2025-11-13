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
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/product.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const productSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "A product must have a name"],
        trim: true,
        maxlength: [
            100,
            "A product name must have less or equal than 100 characters",
        ],
        minlength: [
            10,
            "A product name must have more or equal than 10 characters",
        ],
    },
    slug: String,
    description: {
        type: String,
        required: [true, "A product must have a description"],
        trim: true,
    },
    summary: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
        required: [true, "A product must have a price"],
        min: [0, "Price must be above 0"],
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (value) {
                return !value || value < this.price;
            },
            message: "Discount price ({VALUE}) should be below the regular price",
        },
    },
    images: [String],
    imageCover: {
        type: String,
        required: [true, "A product must have a cover image"],
    },
    categories: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Category",
        },
    ],
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, "Rating must be above 1.0"],
        max: [5, "Rating must be below 5.0"],
        set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
    },
    duration: {
        type: Number,
        required: [true, "A product must have a duration"],
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A product must have a group size"],
    },
    difficulty: {
        type: String,
        required: [true, "A product must have a difficulty"],
        enum: {
            values: ["easy", "medium", "difficult"],
            message: "Difficulty is either: easy, medium, difficult",
        },
    },
    // Reference to Location model
    location: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Location",
        required: [true, "A product must have a location"],
    },
    // Date availability
    availableFrom: {
        type: Date,
        required: [true, "A product must have an available from date"],
    },
    availableUntil: {
        type: Date,
        required: [true, "A product must have an available until date"],
        validate: {
            validator: function (value) {
                return value > this.availableFrom;
            },
            message: "Available until date must be after available from date",
        },
    },
    isActive: {
        type: Boolean,
        default: true,
        select: false,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better query performance
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ location: 1 });
productSchema.index({ availableFrom: 1, availableUntil: 1 });
productSchema.index({ isActive: 1 });
// Virtual populate
productSchema.virtual("reviews", {
    ref: "Review",
    foreignField: "product",
    localField: "_id",
});
const Product = mongoose_1.default.model("Product", productSchema);
exports.default = Product;
