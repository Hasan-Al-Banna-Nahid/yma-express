// src/interfaces/checkout.interface.ts
import { Types, Document } from "mongoose";

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
  startDate?: Date;
  endDate?: Date;
  hireOccasion?: string;
  keepOvernight?: boolean;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  street: string;
  zipCode: string;
  apartment?: string;
  location?: string;
  companyName?: string;
  locationAccessibility?: string;
  deliveryTime?: string;
  collectionTime?: string;
  floorType?: string;
  userType?: string;
  keepOvernight?: boolean;
  hireOccasion?: string;
  notes?: string;
  differentBillingAddress?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingStreet?: string;
  billingCity?: string;
  billingZipCode?: string;
  billingCompanyName?: string;
}

export interface IOrder {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  subtotalAmount: number;
  deliveryFee: number;
  overnightFee: number;
  paymentMethod: "cash_on_delivery" | "credit_card" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  invoiceType: "regular" | "corporate";
  bankDetails?: string;
  createdAt?: Date;
  updatedAt?: Date;
  orderNumber?: string;
  estimatedDeliveryDate?: Date;
}
export interface StockCheckItem {
  productId: Types.ObjectId;
  name: string;
  requested: number;
  available: number;
  inStock: boolean;
}

export interface StockCheckResponse {
  allInStock: boolean;
  items: StockCheckItem[];
  summary?: {
    totalItems: number;
    inStock: number;
    outOfStock: number;
  };
}
export interface IOrderItemDocument extends IOrderItem, Document {}
export interface IOrderDocument extends IOrder, Document {}
