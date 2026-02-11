import express from "express";
import {
  register,
  loginUser,
  googleOAuthCallback,
  refreshTokenHandler,
  logout,
  forgotPasswordHandler,
  renderResetPage,
  resetPasswordHandler,
  updatePasswordHandler,
  getMe,
  updateMe,
  // NEW IMPORTS
  registerWithVerification,
  verifyEmail,
  resendVerification,
  checkVerificationStatus,
} from "./auth.controller";
import passport from "../../config/passport";
import { upload } from "../../utils/cloudinary.util";
import { protectRoute } from "../../middlewares/auth.middleware";
const router = express.Router();

const resolveFrontendBase = (req: express.Request) => {
  const fromHeader = (req.headers["x-frontend-origin"] as string | undefined)?.trim();
  if (fromHeader) return fromHeader.replace(/\/$/, "");
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
};

// ==================== PUBLIC ROUTES ====================

// Original registration (kept for backward compatibility)
router.post("/register", upload.single("photo"), register);

// NEW: Email verification registration
router.post(
  "/register-with-verification",
  upload.single("photo"),
  registerWithVerification,
);

// Email verification routes
router.get("/verify-email/:token", verifyEmail); // Browser verification
router.post("/verify-email/:token", verifyEmail); // API verification
router.post("/resend-verification", resendVerification);
router.post("/check-verification", checkVerificationStatus);

// Other auth routes
router.get("/google", (req, res, next) => {
  const frontendBase = resolveFrontendBase(req);
  const callbackURL = `${frontendBase}/api/v1/auth/google/callback`;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    callbackURL,
  } as any)(req, res, next);
});
router.get(
  "/google/callback",
  (req, res, next) => {
    const frontendBase = resolveFrontendBase(req);
    const callbackURL = `${frontendBase}/api/v1/auth/google/callback`;

    passport.authenticate(
      "google",
      { session: false, callbackURL } as any,
      (err: any, user: any) => {
        if (err || !user) {
          const message = err?.message || "Google sign-in failed";
          const code =
            message === "This email is registered with a password. Use email login."
              ? "oauth_password_user"
              : "oauth_error";
          const redirectUrl = `${frontendBase}/login?oauth=error&code=${code}`;
          return res.redirect(redirectUrl);
        }
        req.user = user;
        return next();
      },
    )(req, res, next);
  },
  googleOAuthCallback,
);
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
