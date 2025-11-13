import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";

const validate =
  (schema: any) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      throw new ApiError("Validation failed", 400, (error as any).errors);
    }
  };
// src/middleware/validators.ts

export const validateAddressBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { fullName, line1, city, postalCode, country } = req.body || {};
  const missing = [];
  if (!fullName) missing.push("fullName");
  if (!line1) missing.push("line1");
  if (!city) missing.push("city");
  if (!postalCode) missing.push("postalCode");
  if (!country) missing.push("country");

  if (missing.length) {
    return res.status(400).json({
      status: "fail",
      message: `Missing required address fields: ${missing.join(", ")}`,
    });
  }
  next();
};

export default validate;
