"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_order_controller_1 = require("../controllers/user.order.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// All user order routes require authentication
router.use(auth_middleware_1.protectRoute);
// GET /api/v1/orders/my-orders - Get user's orders
router.get("/my-orders", user_order_controller_1.getMyOrders);
// GET /api/v1/orders/:id - Get specific order by ID (user's own order)
router.get("/:id", user_order_controller_1.getMyOrder);
exports.default = router;
