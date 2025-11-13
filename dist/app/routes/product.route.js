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
// src/routes/product.routes.ts
const express_1 = __importDefault(require("express"));
const productController = __importStar(require("../controllers/product.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const cloudinary_util_1 = require("../utils/cloudinary.util");
const router = express_1.default.Router();
// Configure multer for multiple file uploads
const uploadProductImages = cloudinary_util_1.upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "images", maxCount: 10 },
]);
// Public routes
router.get("/locations/filters", productController.getAvailableLocations);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);
// Protected routes (Admin only)
router.use(auth_middleware_1.protectRoute, (0, auth_middleware_1.restrictTo)("admin"));
router.post("/", uploadProductImages, productController.createProduct);
router.patch("/:id", uploadProductImages, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
exports.default = router;
