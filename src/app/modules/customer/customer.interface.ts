import { Document, Types } from "mongoose";

export interface ICustomer extends Document {
  user: Types.ObjectId;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  notes?: string;
  customerType: "retail" | "corporate";
  totalOrders: number;
  totalSpent: number;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  isFavorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerStats {
  totalCustomers: number;
  newCustomersToday: number;
  repeatCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: Array<{
    customerId: string; // 🔹 Change ObjectId -> string
    name: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

export interface CustomerSearchFilters {
  search?: string;
  phone?: string;
  email?: string;
  name?: string;
  city?: string;
  postcode?: string;
  customerType?: "retail" | "corporate";
  tags?: string[];
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  startDate?: Date;
  endDate?: Date;
  isFavorite?: boolean;
  hasNotes?: boolean;
}

export interface CustomerOrder {
  orderId: Types.ObjectId;
  orderNumber: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: string;
  orderDate: Date;
  deliveryDate?: Date;
}

export interface CustomerOrderHistory {
  customer: Partial<ICustomer>;
  orders: CustomerOrder[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteProduct?: string;
    lastOrderDate?: Date;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
