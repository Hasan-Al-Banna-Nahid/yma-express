"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inventory_controller_1 = require("../controllers/inventory.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// Protect all routes after this middleware
router.use(auth_middleware_1.protectRoute);
// Admin only routes
router.use((0, auth_middleware_1.restrictTo)('admin'));
router.post("/", inventory_controller_1.createInventoryItemHandler);
router.get("/", inventory_controller_1.getInventoryItemsHandler);
router.get("/available", inventory_controller_1.getAvailableInventoryHandler);
router.get("/booked", inventory_controller_1.getBookedInventoryHandler);
router.get("/check-availability", inventory_controller_1.checkInventoryAvailabilityHandler);
router.get("/release-expired", inventory_controller_1.releaseExpiredCartItemsHandler);
router.get("/:id", inventory_controller_1.getInventoryItemHandler);
router.patch("/:id", inventory_controller_1.updateInventoryItemHandler);
router.delete("/:id", inventory_controller_1.deleteInventoryItemHandler);
exports.default = router;
