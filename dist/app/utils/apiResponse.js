"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
const ApiResponse = (res, statusCode, message, data = null) => {
    const response = {
        status: statusCode,
        message,
    };
    if (data) {
        response.data = data;
    }
    res.status(statusCode).json(response);
};
exports.ApiResponse = ApiResponse;
