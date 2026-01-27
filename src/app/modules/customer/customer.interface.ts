import { Document, Types } from "mongoose";

// ───────────────────────────────────────────────
// MAIN CUSTOMER DOCUMENT
// ───────────────────────────────────────────────

export interface ICustomer extends Document {
  customerId: string; // CUST-XXXXXX
  email: string;
  phone?: string;
  name: string;
  user?: Types.ObjectId; // link to authenticated user (optional)
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;

  orders: Types.ObjectId[]; // array of order _ids
  totalOrders: number;
  totalSpent: number;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  averageOrderValue?: number;

  customerType: "retail" | "corporate" | "guest";
  isFavorite: boolean;
  tags: string[];
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ───────────────────────────────────────────────
// API RESPONSE SHAPES
// ───────────────────────────────────────────────

export interface CustomerListItem {
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  customerType: string;
  isFavorite: boolean;
  orders?: Array<{
    orderNumber: string;
    totalAmount: number;
    createdAt: Date;
    status: string;
  }>;
}

export interface CustomerListResponse {
  data: CustomerListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  appliedFilters?: Record<string, any>;
}

export interface CustomerDetailResponse {
  customer: {
    customerId: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
    customerType: string;
    isFavorite: boolean;
    tags: string[];
    notes?: string;
    totalOrders: number;
    totalSpent: number;
    firstOrderDate?: Date;
    lastOrderDate?: Date;
    averageOrderValue?: number;
    createdAt: Date;
    updatedAt: Date;
  };
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    deliveryDate?: Date;
    itemsCount: number;
    mainProduct?: string;
  }>;
  stats: {
    favoriteProduct?: string;
  };
}

// ───────────────────────────────────────────────
// QUERY DTO for list endpoint
// ───────────────────────────────────────────────

export interface CustomerListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  fromDate?: string | Date;
  toDate?: string | Date;
  customerType?: "retail" | "corporate" | "guest";
  isFavorite?: boolean;
  hasOrders?: boolean;
  sortBy?:
    | "totalSpent"
    | "totalOrders"
    | "createdAt"
    | "name"
    | "lastOrderDate";
  sortOrder?: "asc" | "desc";
  includeOrders?: boolean; // embed last 5 orders
}

// ───────────────────────────────────────────────
// REORDER HELPER RESPONSE
// ───────────────────────────────────────────────

export interface ReorderResponse {
  originalOrderId: string;
  items: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    startDate?: Date;
    endDate?: Date;
    hireOccasion?: string;
    keepOvernight?: boolean;
  }>;
  suggestedAddress?: any; // IShippingAddress
}
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
