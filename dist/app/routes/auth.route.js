"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const cloudinary_util_1 = require("../utils/cloudinary.util");
const router = express_1.default.Router();
// Public routes
router.post("/register", cloudinary_util_1.upload.single("photo"), auth_controller_1.register);
router.post("/login", auth_controller_1.loginUser);
router.post("/logout", auth_controller_1.logout);
router.post("/refresh-token", auth_controller_1.refreshToken);
router.post("/forgot-password", auth_controller_1.forgotPasswordHandler);
// Reset password routes:
// GET = render the reset form page
router.get("/reset-password/:token", auth_controller_1.renderResetPasswordPage);
// POST = submit the form/body { token, password, passwordConfirm }
router.post("/reset-password", auth_controller_1.resetPasswordHandler);
// Protected routes (require authentication)
router.use(auth_middleware_1.protectRoute);
// router.patch("/update-password", updatePasswordHandler);
router.get("/me", auth_controller_1.getMe);
router.patch("/update-me", cloudinary_util_1.upload.single("photo"), auth_controller_1.updateMe);
// Admin only routes
router.use((0, auth_middleware_1.restrictTo)("admin"));
// (add admin-only routes here)
exports.default = router;
