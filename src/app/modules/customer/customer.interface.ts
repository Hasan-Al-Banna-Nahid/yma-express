import mongoose, { Types, Document } from "mongoose";

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postcode?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  isFavorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  fullAddress?: string;
  orders?: any[];
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersToday: number;
  customersWithOrders: number;
  averageOrdersPerCustomer: number;
  totalRevenue: number;
  topCustomers: Array<{
    customerId: Types.ObjectId;
    name: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

export interface CustomerFilterOptions {
  search?: string;
  phone?: string;
  name?: string;
  email?: string;
  city?: string;
  tags?: string[];
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  startDate?: Date;
  endDate?: Date;
  isFavorite?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CustomerOrderHistory {
  customer: ICustomer;
  orders: any[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    favoriteProducts: Array<{
      productId: Types.ObjectId;
      name: string;
      timesOrdered: number;
    }>;
  };
}

export interface CustomerEmailData {
  name: string;
  email: string;
  phone: string;
  orderNumber?: string;
  orderDate?: Date;
  totalAmount?: number;
  orderDetails?: any[];
  customerSince?: Date;
  totalOrders?: number;
  totalSpent?: number;
}
