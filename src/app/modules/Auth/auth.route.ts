// In auth.routes.ts
import express from "express";
import {
  register,
  loginUser,
  refreshTokenHandler,
  logout,
  forgotPasswordHandler,
  renderResetPage, // ADD THIS
  resetPasswordHandler,
  updatePasswordHandler,
  getMe,
  updateMe,
  protectRoute,
} from "./auth.controller";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// Public routes
router.post("/register", upload.single("photo"), register);
router.post("/login", loginUser);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", protectRoute, logout);
router.post("/forgot-password", forgotPasswordHandler);

// Reset password routes
router.get("/reset-password/:token", renderResetPage); // SHOW HTML FORM
router.post("/reset-password/:token", resetPasswordHandler); // HANDLE FORM SUBMIT
router.post("/reset-password", resetPasswordHandler); // API RESET

// Protected routes
router.use(protectRoute);
router.get("/me", getMe);
router.patch("/update-me", upload.single("photo"), updateMe);
router.patch("/update-password", updatePasswordHandler);

export default router;
