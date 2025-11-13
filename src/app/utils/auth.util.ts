import dotenv from "dotenv";
dotenv.config();

import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces/user.interface";

// ----- Env + types -----
const ACCESS_SECRET_ENV = process.env.JWT_SECRET!;
if (!ACCESS_SECRET_ENV) new Error("JWT_SECRET is not defined");
const ACCESS_SECRET: Secret = ACCESS_SECRET_ENV;

const REFRESH_SECRET_ENV = process.env.JWT_REFRESH_SECRET!;
if (!REFRESH_SECRET_ENV) new Error("JWT_REFRESH_SECRET is not defined");
const REFRESH_SECRET: Secret = REFRESH_SECRET_ENV;

const ACCESS_TTL: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"]) ?? "15m";

const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 30);

// ----- helpers -----
export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const sanitizeUser = (user: any) => {
  if (!user) return user;
  const obj = typeof user.toObject === "function" ? user.toObject() : user;
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ----- main -----
export const issueTokens = async (
  userDoc: HydratedDocument<IUser>
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Access token MUST include { id } to match protect()
  const accessToken = jwt.sign({ id: userDoc._id.toString() }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });

  const refreshToken = jwt.sign(
    { id: userDoc._id.toString() },
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_TTL_DAYS}d` }
  );

  // persist hashed refresh token
  userDoc.refreshTokenHash = hashToken(refreshToken);
  userDoc.refreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await userDoc.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};
