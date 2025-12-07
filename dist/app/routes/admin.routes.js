"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController = __importStar(require("../controllers/admin/admin.controller"));
const authController = __importStar(require("../controllers/auth/auth.controller"));
const authorization_middleware_1 = require("../middlewares/authorization.middleware");
const cloudinary_util_1 = require("../utils/cloudinary.util");
const router = express_1.default.Router();
// Protect all admin routes
router.use(authController.protectRoute);
// Get system stats - superadmin & admin only
router.get("/stats", (0, authorization_middleware_1.restrictTo)("superadmin", "admin"), adminController.getSystemStats);
// User management routes
router.get("/users", (0, authorization_middleware_1.restrictTo)("superadmin", "admin"), adminController.getAllUsers);
router.get("/users/:id", (0, authorization_middleware_1.restrictTo)("superadmin", "admin"), authorization_middleware_1.canManageUser, adminController.getUserById);
router.post("/users", (0, authorization_middleware_1.restrictTo)("superadmin", "admin"), cloudinary_util_1.upload.single("photo"), adminController.createUser);
router.patch("/users/:id", (0, authorization_middleware_1.restrictTo)("superadmin", "admin"), authorization_middleware_1.canManageUser, cloudinary_util_1.upload.single("photo"), adminController.updateUser);
router.delete("/users/:id", (0, authorization_middleware_1.restrictTo)("superadmin", "admin"), authorization_middleware_1.canManageUser, adminController.deleteUser);
router.post("/users/change-role", (0, authorization_middleware_1.restrictTo)("superadmin"), adminController.changeUserRole);
exports.default = router;
