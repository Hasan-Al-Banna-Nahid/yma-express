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
exports.deleteLocation = exports.updateLocation = exports.getNearbyLocations = exports.getLocationsByParent = exports.getLocationsByType = exports.getLocationHierarchy = exports.getLocation = exports.getLocations = exports.createLocation = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const locationService = __importStar(require("../services/location.service"));
exports.createLocation = (0, asyncHandler_1.default)(async (req, res, next) => {
    const location = await locationService.createLocation(req.body);
    res.status(201).json({
        status: "success",
        data: {
            location,
        },
    });
});
exports.getLocations = (0, asyncHandler_1.default)(async (req, res, next) => {
    const { locations, total } = await locationService.getAllLocations(req.query);
    res.status(200).json({
        status: "success",
        results: locations.length,
        total,
        data: {
            locations,
        },
    });
});
exports.getLocation = (0, asyncHandler_1.default)(async (req, res, next) => {
    const location = await locationService.getLocationById(req.params.id);
    res.status(200).json({
        status: "success",
        data: {
            location,
        },
    });
});
exports.getLocationHierarchy = (0, asyncHandler_1.default)(async (req, res, next) => {
    const hierarchy = await locationService.getLocationHierarchy();
    res.status(200).json({
        status: "success",
        data: {
            hierarchy,
        },
    });
});
exports.getLocationsByType = (0, asyncHandler_1.default)(async (req, res, next) => {
    const { type } = req.params;
    const locations = await locationService.getLocationsByType(type);
    res.status(200).json({
        status: "success",
        results: locations.length,
        data: {
            locations,
        },
    });
});
exports.getLocationsByParent = (0, asyncHandler_1.default)(async (req, res, next) => {
    const { parentId } = req.params;
    const locations = await locationService.getLocationsByParent(parentId);
    res.status(200).json({
        status: "success",
        results: locations.length,
        data: {
            locations,
        },
    });
});
exports.getNearbyLocations = (0, asyncHandler_1.default)(async (req, res, next) => {
    const { lat, lng, maxDistance } = req.query;
    const locations = await locationService.getNearbyLocations(Number(lat), Number(lng), maxDistance ? Number(maxDistance) : 10000);
    res.status(200).json({
        status: "success",
        results: locations.length,
        data: {
            locations,
        },
    });
});
exports.updateLocation = (0, asyncHandler_1.default)(async (req, res, next) => {
    const location = await locationService.updateLocation(req.params.id, req.body);
    res.status(200).json({
        status: "success",
        data: {
            location,
        },
    });
});
exports.deleteLocation = (0, asyncHandler_1.default)(async (req, res, next) => {
    await locationService.deleteLocation(req.params.id);
    res.status(204).json({
        status: "success",
        data: null,
    });
});
