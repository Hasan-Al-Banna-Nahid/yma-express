import express from "express";
import {
  register,
  loginUser,
  refreshTokenHandler,
  logout,
  forgotPasswordHandler,
  renderResetPage,
  resetPasswordHandler,
  updatePasswordHandler,
  getMe,
  updateMe,
  protectRoute,
  // NEW IMPORTS
  registerWithVerification,
  verifyEmail,
  resendVerification,
  checkVerificationStatus,
} from "./auth.controller";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Original registration (kept for backward compatibility)
router.post("/register", upload.single("photo"), register);

// NEW: Email verification registration
router.post(
  "/register-with-verification",
  upload.single("photo"),
  registerWithVerification
);

// Email verification routes
router.get("/verify-email/:token", verifyEmail); // Browser verification
router.post("/verify-email/:token", verifyEmail); // API verification
router.post("/resend-verification", resendVerification);
router.post("/check-verification", checkVerificationStatus);

// Other auth routes
router.post("/login", loginUser);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordHandler);

// Reset password routes
router.get("/reset-password/:token", renderResetPage);
router.post("/reset-password/:token", resetPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// ==================== PROTECTED ROUTES ====================
router.use(protectRoute);

router.get("/me", getMe);
router.patch("/update-me", upload.single("photo"), updateMe);
router.patch("/update-password", updatePasswordHandler);

export default router;
