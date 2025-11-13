"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectRoute = exports.updateMe = exports.getMe = exports.updatePasswordHandler = exports.resetPasswordHandler = exports.forgotPasswordHandler = exports.logout = exports.refreshToken = exports.loginUser = exports.register = exports.clearAuthCookies = exports.setAuthCookies = void 0;
exports.renderResetPasswordPage = renderResetPasswordPage;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_service_1 = require("../services/auth.service");
const apiError_1 = __importDefault(require("../utils/apiError"));
const apiResponse_1 = require("../utils/apiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const auth_util_1 = require("../utils/auth.util");
const cloudinary_util_1 = require("../utils/cloudinary.util");
// ---------------- cookies helpers ----------------
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 60 * 60 * 1000, // 1h
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
    });
};
exports.setAuthCookies = setAuthCookies;
const clearAuthCookies = (res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });
};
exports.clearAuthCookies = clearAuthCookies;
// ---------------- public: register ----------------
exports.register = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, password, passwordConfirm } = req.body;
    const photo = req.file;
    const user = await (0, auth_service_1.signup)(name, email, password, passwordConfirm, photo);
    const { accessToken, refreshToken } = await (0, auth_util_1.issueTokens)(user);
    (0, exports.setAuthCookies)(res, accessToken, refreshToken);
    (0, apiResponse_1.ApiResponse)(res, 201, "User registered successfully", {
        user: (0, auth_util_1.sanitizeUser)(user),
        tokens: { accessToken, refreshToken },
    });
});
// ---------------- public: login ----------------
exports.loginUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    // Always validate credentials on /login (no refresh-rotate here)
    const user = await (0, auth_service_1.login)(email, password);
    const { accessToken, refreshToken } = await (0, auth_util_1.issueTokens)(user);
    (0, exports.setAuthCookies)(res, accessToken, refreshToken);
    (0, apiResponse_1.ApiResponse)(res, 200, "Logged in successfully", {
        user: (0, auth_util_1.sanitizeUser)(user),
        tokens: { accessToken, refreshToken },
    });
});
// ---------------- public: refresh ----------------
exports.refreshToken = (0, asyncHandler_1.default)(async (req, res) => {
    const token = req.cookies?.refreshToken ||
        req.body?.refreshToken;
    if (!token)
        throw new apiError_1.default("Refresh token required", 401);
    const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await user_model_1.default.findById(payload.id).select("+refreshTokenHash +refreshTokenExpiresAt");
    if (!user)
        throw new apiError_1.default("Invalid refresh token", 401);
    const matches = user.refreshTokenHash === (0, auth_util_1.hashToken)(token);
    const notExpired = !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt > new Date();
    if (!matches || !notExpired)
        throw new apiError_1.default("Invalid/expired refresh token", 401);
    const rotated = await (0, auth_util_1.issueTokens)(user);
    (0, exports.setAuthCookies)(res, rotated.accessToken, rotated.refreshToken);
    (0, apiResponse_1.ApiResponse)(res, 200, "Token refreshed", {
        user: (0, auth_util_1.sanitizeUser)(user),
        tokens: rotated,
    });
});
// ---------------- public: logout ----------------
exports.logout = (0, asyncHandler_1.default)(async (_req, res) => {
    const aReq = _req;
    if (aReq.user?.id) {
        // Update lastLogoutAt to invalidate existing tokens
        await user_model_1.default.findByIdAndUpdate(aReq.user.id, {
            lastLogoutAt: new Date(),
            refreshTokenHash: null,
            refreshTokenExpiresAt: null,
        });
    }
    (0, exports.clearAuthCookies)(res);
    (0, apiResponse_1.ApiResponse)(res, 200, "Logged out", {});
});
// ---------------- public: forgot password ----------------
exports.forgotPasswordHandler = (0, asyncHandler_1.default)(async (req, res) => {
    const { email } = req.body;
    await (0, auth_service_1.forgotPassword)(email);
    (0, apiResponse_1.ApiResponse)(res, 200, "Token sent to email!");
});
// ---------------- public: render reset page ----------------
async function renderResetPasswordPage(req, res) {
    const { token } = req.params;
    if (!token)
        return res.status(400).send("Missing token.");
    const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
    const user = await user_model_1.default.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
        return res.status(400).render("auth/resetForm.ejs", {
            title: "Password reset",
            token: null,
            error: "This reset link is invalid or has expired.",
        });
    }
    return res.status(200).render("auth/resetForm", {
        title: "Password reset",
        token,
        error: null,
    });
}
// ---------------- public: handle reset submit ----------------
exports.resetPasswordHandler = (0, asyncHandler_1.default)(async (req, res) => {
    const token = (req.body?.token || req.params?.token);
    const { password, passwordConfirm } = req.body;
    if (!token)
        throw new apiError_1.default("Missing token", 400);
    const user = await (0, auth_service_1.resetPassword)(token, password, passwordConfirm);
    // Logout this browser after reset: clear cookies (no auto-login)
    (0, exports.clearAuthCookies)(res);
    const isFormPost = req.is("application/x-www-form-urlencoded") ||
        req.headers.accept?.includes("text/html");
    if (isFormPost) {
        return res.status(200).render("auth/resetSuccess", {
            title: "Password updated",
            email: user.email,
            preheader: "Your password has been changed successfully.",
        });
    }
    return (0, apiResponse_1.ApiResponse)(res, 200, "Password reset successfully — please log in again", { user: (0, auth_util_1.sanitizeUser)(user), requireLogin: true });
});
// ---------------- protected: update password ----------------
exports.updatePasswordHandler = (0, asyncHandler_1.default)(async (req, res) => {
    const aReq = req;
    if (!aReq.user?.id)
        throw new apiError_1.default("User not authenticated", 401);
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;
    const user = await (0, auth_service_1.updatePassword)(aReq.user.id, currentPassword, newPassword, newPasswordConfirm);
    // Invalidate old refresh and rotate
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    const rotated = await (0, auth_util_1.issueTokens)(user);
    (0, exports.setAuthCookies)(res, rotated.accessToken, rotated.refreshToken);
    (0, apiResponse_1.ApiResponse)(res, 200, "Password updated successfully", {
        user: (0, auth_util_1.sanitizeUser)(user),
        tokens: rotated,
    });
});
// ---------------- protected: me ----------------
exports.getMe = (0, asyncHandler_1.default)(async (req, res) => {
    const aReq = req;
    if (!aReq.user)
        throw new apiError_1.default("User not authenticated", 401);
    const user = await user_model_1.default.findById(aReq.user.id);
    (0, apiResponse_1.ApiResponse)(res, 200, "User retrieved successfully", {
        user: (0, auth_util_1.sanitizeUser)(user),
    });
});
// ---------------- protected: update me ----------------
exports.updateMe = (0, asyncHandler_1.default)(async (req, res) => {
    const aReq = req;
    if (!aReq.user)
        throw new apiError_1.default("User not authenticated", 401);
    const { name, email, currentPassword, newPassword, newPasswordConfirm } = req.body;
    const file = req.file;
    let photoUrl;
    if (file) {
        photoUrl = await (0, cloudinary_util_1.uploadToCloudinary)(file);
        const ts = Date.now();
        photoUrl = `${photoUrl}${photoUrl?.includes("?") ? "&" : "?"}t=${ts}`;
    }
    const profileUpdate = {};
    if (typeof name !== "undefined")
        profileUpdate.name = name;
    if (typeof email !== "undefined") {
        const normalizedEmail = String(email).trim().toLowerCase();
        const exists = await user_model_1.default.findOne({
            email: normalizedEmail,
            _id: { $ne: aReq.user.id },
        });
        if (exists)
            throw new apiError_1.default("Email already in use", 400);
        profileUpdate.email = normalizedEmail;
    }
    if (typeof photoUrl !== "undefined") {
        profileUpdate.photo = photoUrl;
    }
    let userDoc = await user_model_1.default.findById(aReq.user.id).select("+password +refreshTokenHash +refreshTokenExpiresAt");
    if (!userDoc)
        throw new apiError_1.default("User not found", 404);
    Object.assign(userDoc, profileUpdate);
    let rotatedTokens;
    const wantsPasswordChange = typeof currentPassword !== "undefined" ||
        typeof newPassword !== "undefined" ||
        typeof newPasswordConfirm !== "undefined";
    if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !newPasswordConfirm) {
            throw new apiError_1.default("To change password, provide currentPassword, newPassword and newPasswordConfirm.", 400);
        }
        if (!userDoc.password)
            throw new apiError_1.default("User has no password set", 400);
        const ok = await userDoc.correctPassword(currentPassword, userDoc.password);
        if (!ok)
            throw new apiError_1.default("Your current password is wrong.", 401);
        if (newPassword !== newPasswordConfirm)
            throw new apiError_1.default("Passwords do not match", 400);
        userDoc.password = newPassword;
        userDoc.refreshTokenHash = undefined;
        userDoc.refreshTokenExpiresAt = undefined;
        userDoc.passwordChangedAt = new Date(Date.now() - 1000);
        await userDoc.save();
        rotatedTokens = await (0, auth_util_1.issueTokens)(userDoc);
        (0, exports.setAuthCookies)(res, rotatedTokens.accessToken, rotatedTokens.refreshToken);
    }
    else {
        if (Object.keys(profileUpdate).length > 0) {
            await userDoc.save({ validateModifiedOnly: true });
        }
    }
    const safe = (0, auth_util_1.sanitizeUser)(userDoc);
    (0, apiResponse_1.ApiResponse)(res, 200, "User updated successfully", {
        user: safe,
        ...(rotatedTokens ? { tokens: rotatedTokens } : {}),
    });
});
exports.protectRoute = (0, asyncHandler_1.default)(async (req, _res, next) => {
    const cookieToken = req.cookies?.accessToken;
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined;
    let tokenToUse = cookieToken || headerToken;
    // If both exist (common when the client sends an old header token), choose the newer by iat
    if (cookieToken && headerToken && headerToken !== cookieToken) {
        const ciat = jsonwebtoken_1.default.decode(cookieToken)?.iat ?? 0;
        const hiat = jsonwebtoken_1.default.decode(headerToken)?.iat ?? 0;
        tokenToUse = ciat >= hiat ? cookieToken : headerToken;
    }
    if (!tokenToUse)
        throw new apiError_1.default("No token provided", 401);
    const currentUser = await (0, auth_service_1.protect)(tokenToUse);
    req.user = currentUser;
    next();
});
