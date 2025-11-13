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
// src/models/location.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const locationSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "A location must have a name"],
        trim: true,
        maxlength: [
            100,
            "A location name must have less or equal than 100 characters",
        ],
    },
    type: {
        type: String,
        required: [true, "A location must have a type"],
        enum: {
            values: ["country", "state", "city", "landmark"],
            message: "Location type is either: country, state, city, or landmark",
        },
    },
    parent: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Location",
        default: null,
    },
    country: {
        type: String,
        required: [true, "A location must have a country"],
        default: "England",
    },
    state: {
        type: String,
        required: function () {
            return this.type === "city" || this.type === "landmark";
        },
    },
    city: {
        type: String,
        required: function () {
            return this.type === "landmark";
        },
    },
    fullAddress: {
        type: String,
        required: [true, "A location must have a full address"],
        trim: true,
    },
    coordinates: {
        lat: {
            type: Number,
            required: [true, "A location must have latitude coordinates"],
            min: -90,
            max: 90,
        },
        lng: {
            type: Number,
            required: [true, "A location must have longitude coordinates"],
            min: -180,
            max: 180,
        },
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better query performance
locationSchema.index({ type: 1 });
locationSchema.index({ country: 1, state: 1, city: 1 });
locationSchema.index({ coordinates: "2dsphere" });
locationSchema.index({ isActive: 1 });
locationSchema.index({ name: "text", fullAddress: "text" });
// Virtual for child locations
locationSchema.virtual("children", {
    ref: "Location",
    foreignField: "parent",
    localField: "_id",
});
// Virtual for getting hierarchy
locationSchema.virtual("hierarchy").get(function () {
    return {
        country: this.country,
        state: this.state,
        city: this.city,
        landmark: this.type === "landmark" ? this.name : null,
    };
});
const Location = mongoose_1.default.model("Location", locationSchema);
exports.default = Location;
