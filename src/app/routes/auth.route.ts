import express from "express";
import {
  register,
  loginUser,
  refreshToken,
  forgotPasswordHandler,
  resetPasswordHandler,
  updatePasswordHandler,
  renderResetPasswordPage,
  getMe,
  updateMe,
  logout,
} from "../controllers/auth.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";
import { upload } from "../utils/cloudinary.util";

const router = express.Router();

// Public routes
router.post("/register", upload.single("photo"), register);
router.post("/login", loginUser);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPasswordHandler);

// Reset password routes:
// GET = render the reset form page
router.get("/reset-password/:token", renderResetPasswordPage);

// POST = submit the form/body { token, password, passwordConfirm }
router.post("/reset-password", resetPasswordHandler);

// Protected routes (require authentication)
router.use(protectRoute);

// router.patch("/update-password", updatePasswordHandler);
router.get("/me", getMe);
router.patch("/update-me", upload.single("photo"), updateMe);

// Admin only routes
router.use(restrictTo("admin"));
// (add admin-only routes here)

export default router;
