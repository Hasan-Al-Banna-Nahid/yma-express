// src/utils/objectId.ts
import mongoose, { Types } from "mongoose";
import ApiError from "../utils/apiError";

function diag(label: string, v: string) {
  if (process.env.DEBUG_ID === "1") {
    // Show length and char codes to catch invisible chars
    const codes = Array.from(v)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(" ");
    // eslint-disable-next-line no-console
    console.log(`[ID DEBUG] ${label}: "${v}" (len=${v.length}) [${codes}]`);
  }
}

/** Robust: ObjectId | 24-hex string | {_id: ...}. */
export function toObjectId(value: any, field: string): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;

  let s = "";
  if (typeof value === "string") s = value;
  else if (value && typeof value === "object" && value._id)
    s = String(value._id);
  else throw new ApiError(`${field} must be an ObjectId`, 400);

  try {
    s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  s = s.trim();

  // exact 24-hex?
  if (/^[0-9a-fA-F]{24}$/.test(s)) return new Types.ObjectId(s);

  // try to extract the first 24-hex run (handles stray characters/prefixes)
  const m = s.match(/[0-9a-fA-F]{24}/);
  if (m) return new Types.ObjectId(m[0]);

  diag(field, s);
  throw new ApiError(`${field} must be a valid 24-char ObjectId string`, 400);
}

/** Normalize any id (string/ObjectId) to a validated 24-hex string. */
export function normalizeIdOrThrow(
  id: string | Types.ObjectId,
  label = "id"
): string {
  if (id instanceof Types.ObjectId) return id.toString();

  let s = String(id ?? "");
  try {
    s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  s = s.trim();

  // exact?
  if (/^[0-9a-fA-F]{24}$/.test(s)) return s;

  // extract first 24-hex run if present
  const m = s.match(/[0-9a-fA-F]{24}/);
  if (m) return m[0];

  diag(label, s);
  throw new ApiError(`Invalid ${label}`, 400);
}
