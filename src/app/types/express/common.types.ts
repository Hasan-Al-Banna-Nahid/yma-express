// src/types/common.types.ts
import { Types, Document } from "mongoose";

export interface Timestamps {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
  results?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}
