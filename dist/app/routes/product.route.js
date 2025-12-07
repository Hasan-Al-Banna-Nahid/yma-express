"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/product.route.ts
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("../controllers/product.controller");
const authorization_middleware_1 = require("../middlewares/authorization.middleware");
const router = express_1.default.Router();
// Public routes
router.get("/", product_controller_1.getAllProducts);
router.get("/states", product_controller_1.getAvailableStates);
router.get("/state/:state", product_controller_1.getProductsByState);
router.get("/featured", product_controller_1.getFeaturedProducts);
router.get("/search", product_controller_1.searchProducts);
router.get("/category/:categoryId", product_controller_1.getProductsByCategory);
router.get("/:id", product_controller_1.getProduct);
// Protected routes (Admin only)
router.post("/", (0, authorization_middleware_1.restrictTo)("superadmin", "admin", "editor"), product_controller_1.createProduct);
router.patch("/:id", (0, authorization_middleware_1.restrictTo)("superadmin", "admin", "editor"), product_controller_1.updateProduct);
router.delete("/:id", (0, authorization_middleware_1.restrictTo)("superadmin", "admin", "editor"), product_controller_1.deleteProduct);
router.patch("/:id/stock", (0, authorization_middleware_1.restrictTo)("superadmin", "admin", "editor"), product_controller_1.updateProductStock);
exports.default = router;
