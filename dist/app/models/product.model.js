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
const mongoose_1 = __importStar(require("mongoose"));
const productSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
        maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    description: {
        type: String,
        required: [true, "Product description is required"],
    },
    summary: {
        type: String,
        maxlength: [500, "Summary cannot exceed 500 characters"],
    },
    price: {
        type: Number,
        required: [true, "Product price is required"],
        min: [0, "Price cannot be negative"],
    },
    perDayPrice: {
        type: Number,
        min: [0, "Per day price cannot be negative"],
    },
    perWeekPrice: {
        type: Number,
        min: [0, "Per week price cannot be negative"],
    },
    deliveryAndCollection: {
        type: String,
        required: [true, "Delivery and collection information is required"],
        trim: true,
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (value) {
                return !value || value < this.price;
            },
            message: "Discount price must be below regular price",
        },
    },
    duration: {
        type: Number,
        required: [true, "Duration is required"],
        min: [1, "Duration must be at least 1 hour"],
    },
    maxGroupSize: {
        type: Number,
        required: [true, "Max group size is required"],
        min: [1, "Group size must be at least 1"],
    },
    difficulty: {
        type: String,
        required: [true, "Difficulty level is required"],
        enum: {
            values: ["easy", "medium", "difficult"],
            message: "Difficulty must be easy, medium, or difficult",
        },
    },
    categories: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Category",
        },
    ],
    images: [String],
    imageCover: {
        type: String,
        required: [true, "Image cover is required"],
    },
    location: {
        country: {
            type: String,
            default: "England",
            required: true,
        },
        state: {
            type: String,
            required: [true, "State is required"],
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
    },
    dimensions: {
        length: {
            type: Number,
            required: [true, "Length is required"],
            min: [1, "Length must be at least 1 foot"],
        },
        width: {
            type: Number,
            required: [true, "Width is required"],
            min: [1, "Width must be at least 1 foot"],
        },
        height: {
            type: Number,
            required: [true, "Height is required"],
            min: [1, "Height must be at least 1 foot"],
        },
    },
    availableFrom: {
        type: Date,
        required: [true, "Available from date is required"],
    },
    availableUntil: {
        type: Date,
        required: [true, "Available until date is required"],
    },
    size: {
        type: String,
        trim: true,
    },
    active: {
        type: Boolean,
        default: true,
    },
    stock: {
        type: Number,
        required: [true, "Stock quantity is required"],
        min: [0, "Stock cannot be negative"],
        default: 0,
    },
    isSensitive: {
        type: Boolean,
        required: [true, "Sensitive item status is required"],
        default: false,
    },
    // New fields
    dateAdded: {
        type: Date,
        default: Date.now,
    },
    material: {
        type: String,
        required: [true, "Material information is required"],
        trim: true,
    },
    design: {
        type: String,
        required: [true, "Design information is required"],
        trim: true,
    },
    ageRange: {
        min: {
            type: Number,
            required: [true, "Minimum age is required"],
            min: [0, "Minimum age cannot be negative"],
        },
        max: {
            type: Number,
            required: [true, "Maximum age is required"],
            validate: {
                validator: function (value) {
                    return value >= this.ageRange.min;
                },
                message: "Maximum age must be greater than or equal to minimum age",
            },
        },
        unit: {
            type: String,
            required: [true, "Age unit is required"],
            enum: {
                values: ["years", "months"],
                message: "Age unit must be years or months",
            },
        },
    },
    safetyFeatures: {
        type: [String],
        required: [true, "At least one safety feature is required"],
        validate: {
            validator: function (value) {
                return value.length > 0;
            },
            message: "At least one safety feature is required",
        },
    },
    qualityAssurance: {
        isCertified: {
            type: Boolean,
            required: [true, "Certification status is required"],
            default: false,
        },
        certification: {
            type: String,
            trim: true,
        },
        warrantyPeriod: {
            type: Number,
            min: [0, "Warranty period cannot be negative"],
        },
        warrantyDetails: {
            type: String,
            trim: true,
        },
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Virtual for total area (length * width)
productSchema.virtual("dimensions.area").get(function () {
    return this.dimensions.length * this.dimensions.width;
});
// Virtual for formatted dimensions
productSchema
    .virtual("formattedDimensions")
    .get(function () {
    return `${this.dimensions.length}ft x ${this.dimensions.width}ft x ${this.dimensions.height}ft`;
});
// Virtual for formatted age range
productSchema.virtual("formattedAgeRange").get(function () {
    return `${this.ageRange.min}-${this.ageRange.max} ${this.ageRange.unit}`;
});
// Virtual for isActive (alias for active)
productSchema.virtual("isActive").get(function () {
    return this.active;
});
// Virtual for available status
productSchema.virtual("isAvailable").get(function () {
    const now = new Date();
    return (this.active &&
        this.stock > 0 &&
        now >= this.availableFrom &&
        now <= this.availableUntil);
});
// Virtual for warranty status
productSchema.virtual("hasWarranty").get(function () {
    return (this.qualityAssurance.warrantyPeriod &&
        this.qualityAssurance.warrantyPeriod > 0);
});
// Index for better search performance
productSchema.index({ "location.country": 1, "location.state": 1 });
productSchema.index({ price: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ "dimensions.length": 1, "dimensions.width": 1 });
productSchema.index({ "ageRange.min": 1, "ageRange.max": 1 });
productSchema.index({ material: 1 });
productSchema.index({ isSensitive: 1 });
productSchema.index({ "qualityAssurance.isCertified": 1 });
const Product = mongoose_1.default.model("Product", productSchema);
exports.default = Product;
