import { Request, Response, NextFunction } from "express";

// ApiError class
export default class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any[];

  constructor(
    message: string,
    statusCode: number,
    errors?: any[],
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export function globalErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const isApiError = err instanceof ApiError;
  const statusCode: number = isApiError
    ? err.statusCode
    : err?.statusCode || 500;
  const status: string = `${statusCode}`.startsWith("4") ? "fail" : "error";

  // Ensure JSON content type
  res.setHeader("Content-Type", "application/json");

  res.status(statusCode).json({
    status,
    message: err?.message || "Something went wrong",
    ...(isApiError && err.errors ? { errors: err.errors } : {}),
    ...(process.env.NODE_ENV !== "production" ? { stack: err?.stack } : {}),
  });
}
