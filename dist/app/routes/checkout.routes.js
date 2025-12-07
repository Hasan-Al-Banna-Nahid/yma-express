"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const checkout_controller_1 = require("../controllers/checkout.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// All checkout routes require authentication
router.use(auth_middleware_1.protectRoute);
// POST /api/v1/checkout - Create new order
router.post("/", checkout_controller_1.createOrder);
exports.default = router;
