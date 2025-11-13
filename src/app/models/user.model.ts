// src/models/user.model.ts
import mongoose, { Schema } from "mongoose";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { IUser, IUserMethods, IUserModel } from "../interfaces/user.interface";

const userSchema = new Schema<IUser, IUserModel, IUserMethods>(
  {
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
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
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
  }
);

// Indexes
userSchema.index({ createdAt: -1 });
userSchema.index({ name: "text", email: "text" });

// Hash password if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// Set passwordChangedAt slightly in the past to avoid iat race
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Methods
userSchema.method(
  "correctPassword",
  async function (candidate: string, hashed: string) {
    return bcrypt.compare(candidate, hashed);
  }
);

// Tolerant comparator (1s skew)
userSchema.method("changedPasswordAfter", function (JWTTimestamp: number) {
  if (this.passwordChangedAt) {
    const changedTsSec =
      Math.floor(this.passwordChangedAt.getTime() / 1000) - 1;
    return JWTTimestamp < changedTsSec;
  }
  return false;
});

userSchema.method("signAccessToken", function (): string {
  const secret: Secret = process.env.JWT_SECRET!;
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) ?? "15m",
  };
  return jwt.sign({ id: this._id.toString() }, secret, options);
});

userSchema.method("signRefreshToken", function (): string {
  const secret: Secret = process.env.JWT_REFRESH_SECRET!;
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) ?? "30d",
  };
  return jwt.sign({ id: this._id.toString(), typ: "refresh" }, secret, options);
});

userSchema.method("setRefreshToken", async function (refreshToken: string) {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  this.refreshTokenHash = hash;
  const decoded: any = jwt.decode(refreshToken);
  if (decoded?.exp) this.refreshTokenExpiresAt = new Date(decoded.exp * 1000);
  await this.save({ validateBeforeSave: false });
});

userSchema.method("createPasswordResetToken", function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
});

const User = mongoose.model<IUser, IUserModel>("User", userSchema);
export default User;
