"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectRoute = void 0;
exports.restrictTo = restrictTo;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const auth_service_1 = require("../services/auth.service");
exports.protectRoute = (0, asyncHandler_1.default)(async (req, _res, next) => {
    const cookieToken = req.cookies?.accessToken;
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined;
    let tokenToUse = cookieToken || headerToken;
    // Debug logging
    console.log("🔐 Auth Debug:", {
        hasCookieToken: !!cookieToken,
        hasHeaderToken: !!headerToken,
        tokenToUse: tokenToUse ? "Present" : "Missing",
    });
    if (!tokenToUse)
        throw new apiError_1.default("No token provided", 401);
    const currentUser = await (0, auth_service_1.protect)(tokenToUse);
    // Debug user info - check if role is present
    console.log("👤 User Debug:", {
        userId: currentUser._id,
        email: currentUser.email,
        role: currentUser.role,
        hasRole: !!currentUser.role,
        isActive: currentUser.active,
    });
    // Ensure role exists
    if (!currentUser.role) {
        console.error("❌ User role is missing!");
        throw new apiError_1.default("User role not found", 401);
    }
    req.user = currentUser;
    next();
});
function restrictTo(...roles) {
    return (req, _res, next) => {
        const aReq = req;
        // Debug role check
        console.log("🔒 Role Check Debug:", {
            userRole: aReq.user?.role,
            requiredRoles: roles,
            hasUser: !!aReq.user,
            userAuthorized: aReq.user && roles.includes(aReq.user.role),
        });
        if (!aReq.user) {
            throw new apiError_1.default("Authentication required", 401);
        }
        if (!roles.includes(aReq.user.role)) {
            throw new apiError_1.default(`Unauthorized - Required roles: ${roles.join(", ")}, Your role: ${aReq.user.role}`, 403);
        }
        next();
    };
}
