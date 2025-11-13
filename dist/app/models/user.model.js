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
// src/models/user.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "Please tell us your name"],
        index: true,
    },
    email: {
        type: String,
        required: [true, "Please provide your email"],
        unique: true,
        lowercase: true,
        index: true,
        validate: {
            validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            message: "Please provide a valid email address",
        },
    },
    photo: { type: String, default: null },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
        required: true,
        index: true,
        // REMOVED: select: false - This was causing the issue!
    },
    password: { type: String, minlength: 8, select: false },
    passwordChangedAt: { type: Date, index: true },
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogoutAt: Date,
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },
    active: { type: Boolean, default: true, select: false, index: true },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            if (ret._id) {
                ret.id = ret._id.toString();
                delete ret._id;
            }
            delete ret.__v;
            // Also remove sensitive fields from JSON output
            delete ret.password;
            delete ret.refreshTokenHash;
            delete ret.refreshTokenExpiresAt;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
        },
    },
    toObject: { virtuals: true },
});
// Indexes
userSchema.index({ createdAt: -1 });
userSchema.index({ name: "text", email: "text" });
// Hash password if modified
userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password)
        return next();
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    this.password = await bcryptjs_1.default.hash(this.password, rounds);
    next();
});
// Set passwordChangedAt slightly in the past to avoid iat race
userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew)
        return next();
    this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
});
// Methods
userSchema.method("correctPassword", async function (candidate, hashed) {
    return bcryptjs_1.default.compare(candidate, hashed);
});
// Tolerant comparator (1s skew)
userSchema.method("changedPasswordAfter", function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTsSec = Math.floor(this.passwordChangedAt.getTime() / 1000) - 1;
        return JWTTimestamp < changedTsSec;
    }
    return false;
});
userSchema.method("signAccessToken", function () {
    const secret = process.env.JWT_SECRET;
    const options = {
        expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    };
    return jsonwebtoken_1.default.sign({ id: this._id.toString() }, secret, options);
});
userSchema.method("signRefreshToken", function () {
    const secret = process.env.JWT_REFRESH_SECRET;
    const options = {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
    };
    return jsonwebtoken_1.default.sign({ id: this._id.toString(), typ: "refresh" }, secret, options);
});
userSchema.method("setRefreshToken", async function (refreshToken) {
    const hash = crypto_1.default.createHash("sha256").update(refreshToken).digest("hex");
    this.refreshTokenHash = hash;
    const decoded = jsonwebtoken_1.default.decode(refreshToken);
    if (decoded?.exp)
        this.refreshTokenExpiresAt = new Date(decoded.exp * 1000);
    await this.save({ validateBeforeSave: false });
});
userSchema.method("createPasswordResetToken", function () {
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    this.passwordResetToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    return resetToken;
});
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
