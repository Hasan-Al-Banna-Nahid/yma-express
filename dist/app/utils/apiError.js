"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = globalErrorHandler;
// ApiError class
class ApiError extends Error {
    statusCode;
    isOperational;
    errors;
    constructor(message, statusCode, errors, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = ApiError;
// Global error handler middleware
function globalErrorHandler(err, _req, res, _next) {
    const isApiError = err instanceof ApiError;
    const statusCode = isApiError
        ? err.statusCode
        : err?.statusCode || 500;
    const status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    res.status(statusCode).json({
        status,
        message: err?.message || "Something went wrong",
        // Include errors array if it exists (from ApiError)
        ...(isApiError && err.errors ? { errors: err.errors } : {}),
        // Include stack trace in non-production environments
        ...(process.env.NODE_ENV !== "production" ? { stack: err?.stack } : {}),
    });
}
