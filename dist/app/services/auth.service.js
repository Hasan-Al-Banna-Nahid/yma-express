"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.updatePassword = exports.resetPassword = exports.forgotPassword = exports.login = exports.signup = exports.createSendToken = exports.signToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const user_model_1 = __importDefault(require("../models/user.model"));
const cloudinary_util_1 = require("../utils/cloudinary.util");
const email_service_1 = require("./email.service");
// ----- JWT config (typed) -----
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
    throw new Error("JWT_SECRET is not defined");
}
const JWT_SECRET = JWT_SECRET_ENV; // TypeScript now knows JWT_SECRET_ENV is string
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
// Helper to build backend link (no FRONTEND_URL)
const BASE_URL = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
// ----- helpers -----
const signToken = (id) => jsonwebtoken_1.default.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
exports.signToken = signToken;
const createSendToken = (user, statusCode, _req, res) => {
    const token = (0, exports.signToken)(user._id.toString());
    res.status(statusCode).json({
        status: "success",
        token,
        data: { user },
    });
};
exports.createSendToken = createSendToken;
// ----- auth flows -----
const signup = async (name, email, password, passwordConfirm, photo) => {
    if (password !== passwordConfirm)
        throw new apiError_1.default("Passwords do not match", 400);
    const existingUser = await user_model_1.default.findOne({ email });
    if (existingUser)
        throw new apiError_1.default("Email already in use", 400);
    let photoUrl;
    if (photo) {
        photoUrl = await (0, cloudinary_util_1.uploadToCloudinary)(photo);
    }
    const newUser = await user_model_1.default.create({
        name,
        email,
        password,
        role: "user",
        photo: photoUrl,
    });
    return newUser;
};
exports.signup = signup;
const login = async (email, password) => {
    if (!email || !password)
        throw new apiError_1.default("Please provide email and password", 400);
    const user = await user_model_1.default.findOne({ email }).select("+password +refreshTokenHash +refreshTokenExpiresAt");
    if (!user || !user.password)
        throw new apiError_1.default("Incorrect email or password", 401);
    const ok = await user.correctPassword(password, user.password);
    if (!ok)
        throw new apiError_1.default("Incorrect email or password", 401);
    return user;
};
exports.login = login;
// --- FORGOT PASSWORD ---
const forgotPassword = async (email) => {
    const user = await user_model_1.default.findOne({ email });
    if (!user) {
        throw new apiError_1.default("There is no user with that email address.", 404);
    }
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetURL = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
    try {
        await (0, email_service_1.sendPasswordResetEmail)(user.email, user.name || "there", resetURL);
        return resetToken;
    }
    catch (err) {
        console.error("Email send error:", err.message); // Log for debugging
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new apiError_1.default("There was an error sending the email. Try again later!", 500);
    }
};
exports.forgotPassword = forgotPassword;
// --- RESET PASSWORD ---
const resetPassword = async (token, password, passwordConfirm) => {
    const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
    const user = await user_model_1.default.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user)
        throw new apiError_1.default("Token is invalid or has expired", 400);
    if (password !== passwordConfirm)
        throw new apiError_1.default("Passwords do not match", 400);
    // Set new password
    user.password = password;
    // Invalidate refresh and bump passwordChangedAt (avoid iat race)
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    user.passwordChangedAt = new Date(Date.now() - 1000);
    // Clear reset fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // Fire-and-forget confirmation
    (0, email_service_1.sendResetSuccessEmail)(user.email, user.name || "there").catch(() => { });
    return user;
};
exports.resetPassword = resetPassword;
// --- UPDATE PASSWORD (while logged in) ---
const updatePassword = async (userId, currentPassword, newPassword, newPasswordConfirm) => {
    const user = await user_model_1.default.findById(userId).select("+password +refreshTokenHash +refreshTokenExpiresAt");
    if (!user)
        throw new apiError_1.default("User not found", 404);
    if (!user.password)
        throw new apiError_1.default("User has no password set", 400);
    const ok = await user.correctPassword(currentPassword, user.password);
    if (!ok)
        throw new apiError_1.default("Your current password is wrong.", 401);
    if (newPassword !== newPasswordConfirm)
        throw new apiError_1.default("Passwords do not match", 400);
    user.password = newPassword;
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    user.passwordChangedAt = new Date(Date.now() - 1000);
    await user.save();
    return user;
};
exports.updatePassword = updatePassword;
// --- PROTECT ---
const protect = async (token) => {
    if (!token)
        throw new apiError_1.default("You are not logged in! Please log in to get access.", 401);
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        throw new apiError_1.default("Invalid token. Please log in again!", 401);
    }
    if (!decoded ||
        typeof decoded !== "object" ||
        !decoded.id ||
        typeof decoded.iat !== "number") {
        throw new apiError_1.default("Invalid token payload.", 401);
    }
    const currentUser = await user_model_1.default.findById(decoded.id).select("+role");
    if (!currentUser)
        throw new apiError_1.default("The user belonging to this token does no longer exist.", 401);
    if (currentUser.active === false) {
        throw new apiError_1.default("Account is deactivated.", 401);
    }
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        throw new apiError_1.default(" Please log in again.", 401);
    }
    // (Optional) If you added lastLogoutAt: reject tokens issued before logout
    // if ((currentUser as any).lastLogoutAt) {
    //   const lastOutMs = new Date((currentUser as any).lastLogoutAt).getTime();
    //   if (decoded.iat * 1000 < lastOutMs) {
    //      new throw new ApiError("Session ended. Please log in again.", 401);
    //   }
    // }
    return currentUser;
};
exports.protect = protect;
