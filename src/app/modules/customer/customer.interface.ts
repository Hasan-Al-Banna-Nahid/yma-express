// src/modules/Customer/customer.interface.ts
import { Document, Types } from "mongoose";
import { IOrder } from "../Checkout/checkout.interface"; // Adjust path if needed

/**
 * Main Customer Document Interface (what is stored in MongoDB)
 */
export interface ICustomer extends Document {
  /** Auto-generated unique identifier for the customer (e.g. CUST-ABC123XYZ) */
  customerId: string;

  /** Email address (normalized to lowercase) - primary lookup key */
  email: string;

  /** Phone number (optional - not all customers provide it) */
  phone?: string;

  /** Full name of the customer (e.g. "John Doe") */
  name: string;

  /** Reference to User document (optional - null for guest checkouts) */
  user?: Types.ObjectId;

  // Address snapshot (from most recent or checkout data)
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;

  // Order references & aggregates (maintained by hooks or service logic)
  /** Array of Order ObjectIds - pure references, not populated */
  orders: Types.ObjectId[];

  totalOrders: number;
  totalSpent: number;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  averageOrderValue?: number;

  // Customer classification & marketing fields
  customerType: "retail" | "corporate" | "guest";

  isFavorite: boolean;
  tags: string[];

  /** Internal/admin notes about this customer */
  notes?: string;

  // Auto-managed timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregated statistics for admin dashboard / reports
 */
export interface ICustomerStats {
  totalCustomers: number;
  newCustomersToday: number;
  repeatCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

/**
 * Query filters for searching/listing customers (admin panel)
 */
export interface CustomerSearchFilters {
  search?: string; // fuzzy match on name/email/phone
  email?: string;
  phone?: string;
  name?: string;
  city?: string;
  postcode?: string;
  customerType?: "retail" | "corporate" | "guest";
  tags?: string[];
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  isFavorite?: boolean;
  hasNotes?: boolean;
}

/**
 * Simplified order summary for customer profile/history views
 */
export interface CustomerOrder {
  orderId: string; // string for safe frontend usage
  orderNumber?: string;
  totalAmount: number;
  status: string;
  orderDate: Date;
  deliveryDate?: Date;
  itemsCount: number;
  mainProductName?: string; // e.g. name of first/most important product
}

/**
 * Full enriched customer profile response (for GET /customers/:id or similar)
 */
export interface CustomerOrderHistory {
  customer: {
    customerId: string;
    name: string;
    email: string;
    phone?: string;
    customerType: string;
    totalOrders: number;
    totalSpent: number;
  };

  /** Enriched/populated order details (display-ready) */
  orderHistory: CustomerOrder[];

  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    firstOrderDate?: Date;
    lastOrderDate?: Date;
    favoriteProduct?: string; // most frequently ordered product name (optional)
  };
}

/**
 * Standard paginated API response shape
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  filters?: CustomerSearchFilters; // optional - return what filters were applied
}

/**
 * DTO for creating/updating customer from checkout flow
 */
export interface CreateCustomerFromCheckoutDto {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  customerType?: "retail" | "corporate" | "guest";
  orderId: Types.ObjectId;
  userId?: Types.ObjectId; // only if authenticated user exists
}
