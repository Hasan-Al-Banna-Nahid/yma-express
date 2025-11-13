"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyLocations = exports.deleteLocation = exports.updateLocation = exports.getLocationsByParent = exports.getLocationsByType = exports.getLocationHierarchy = exports.getLocationById = exports.getAllLocations = exports.createLocation = void 0;
// src/services/location.service.ts
const location_model_1 = __importDefault(require("../models/location.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const createLocation = async (locationData) => {
    // Validate parent if provided
    if (locationData.parent) {
        const parentLocation = await location_model_1.default.findById(locationData.parent);
        if (!parentLocation) {
            throw new apiError_1.default("Parent location not found", 404);
        }
        // Ensure hierarchy makes sense
        if (parentLocation.type === "country" && locationData.type !== "state") {
            throw new apiError_1.default("A country can only have states as children", 400);
        }
        if (parentLocation.type === "state" && locationData.type !== "city") {
            throw new apiError_1.default("A state can only have cities as children", 400);
        }
        if (parentLocation.type === "city" && locationData.type !== "landmark") {
            throw new apiError_1.default("A city can only have landmarks as children", 400);
        }
    }
    const location = await location_model_1.default.create(locationData);
    return location;
};
exports.createLocation = createLocation;
const getAllLocations = async (query = {}) => {
    const { page = 1, limit = 10, sort = "name", type, country, state, city, search, isActive = true, ...otherFilters } = query;
    // Build filter object
    let filterObj = { isActive };
    // Type filtering
    if (type) {
        filterObj.type = Array.isArray(type) ? { $in: type } : type;
    }
    // Location hierarchy filtering
    if (country)
        filterObj.country = country;
    if (state)
        filterObj.state = state;
    if (city)
        filterObj.city = city;
    // Text search
    if (search) {
        filterObj.$or = [
            { name: { $regex: search, $options: "i" } },
            { fullAddress: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }
    // Field limiting
    const fields = query.fields
        ? query.fields.split(",").join(" ")
        : "";
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
    const locations = await location_model_1.default.find(filterObj)
        .populate("parent", "name type")
        .select(fields)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit));
    const total = await location_model_1.default.countDocuments(filterObj);
    return { locations, total };
};
exports.getAllLocations = getAllLocations;
const getLocationById = async (id) => {
    const location = await location_model_1.default.findById(id).populate("parent", "name type");
    if (!location) {
        throw new apiError_1.default("Location not found", 404);
    }
    return location;
};
exports.getLocationById = getLocationById;
const getLocationHierarchy = async () => {
    const hierarchy = await location_model_1.default.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: "$country",
                states: {
                    $addToSet: {
                        state: "$state",
                        cities: {
                            $cond: {
                                if: { $eq: ["$type", "city"] },
                                then: {
                                    city: "$city",
                                    landmarks: {
                                        $cond: {
                                            if: { $eq: ["$type", "landmark"] },
                                            then: ["$name"],
                                            else: [],
                                        },
                                    },
                                },
                                else: null,
                            },
                        },
                    },
                },
            },
        },
    ]);
    return hierarchy;
};
exports.getLocationHierarchy = getLocationHierarchy;
const getLocationsByType = async (type) => {
    const locations = await location_model_1.default.find({ type, isActive: true }).sort("name");
    return locations;
};
exports.getLocationsByType = getLocationsByType;
const getLocationsByParent = async (parentId) => {
    const locations = await location_model_1.default.find({ parent: parentId, isActive: true })
        .populate("parent", "name type")
        .sort("name");
    return locations;
};
exports.getLocationsByParent = getLocationsByParent;
const updateLocation = async (id, updateData) => {
    const location = await location_model_1.default.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    }).populate("parent", "name type");
    if (!location) {
        throw new apiError_1.default("Location not found", 404);
    }
    return location;
};
exports.updateLocation = updateLocation;
const deleteLocation = async (id) => {
    // Check if location has children
    const childCount = await location_model_1.default.countDocuments({
        parent: id,
        isActive: true,
    });
    if (childCount > 0) {
        throw new apiError_1.default("Cannot delete location that has child locations", 400);
    }
    const location = await location_model_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!location) {
        throw new apiError_1.default("Location not found", 404);
    }
};
exports.deleteLocation = deleteLocation;
const getNearbyLocations = async (lat, lng, maxDistance = 10000) => {
    const locations = await location_model_1.default.find({
        isActive: true,
        coordinates: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                $maxDistance: maxDistance, // in meters
            },
        },
    }).limit(50);
    return locations;
};
exports.getNearbyLocations = getNearbyLocations;
