import express from "express";
import {
  register,
  loginUser,
  refreshTokenHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  updatePasswordHandler,
  renderResetPasswordPage,
  getMe,
  updateMe,
  logout,
} from "./auth.controller";
import { protectRoute, restrictTo } from "../../middlewares/auth.middleware";
import { upload } from "../../utils/cloudinary.util";
import { protect } from "../../middlewares/authorization.middleware";

const router = express.Router();

// Public routes
router.post("/register", upload.single("photo"), register);
router.post("/login", loginUser);
router.post("/logout", logout);
router.post("/refresh-token", refreshTokenHandler);
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

// (add admin-only routes here)

export default router;
