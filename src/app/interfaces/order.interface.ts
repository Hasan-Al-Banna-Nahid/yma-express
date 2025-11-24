// src/interfaces/order.interface.ts
import { Document, Types } from "mongoose";

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IShippingAddress {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Location Information
  country: string;
  state: string;
  city: string;
  street: string;
  zipCode: string;

  // Additional Fields
  apartment?: string;
  companyName?: string;
  locationAccessibility?: string;
  deliveryTime?: string;
  collectionTime?: string;
  floorType?: string;
  userType?: string;
  keepOvernight?: boolean;
  hireOccasion?: string;
  notes?: string;

  // Billing Address (if different)
  differentBillingAddress?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCompanyName?: string;
}

// Simplified Bank Details - Single field
export interface IBankDetails {
  bankInfo: string; // Single field containing all bank details
}

export interface IOrder {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: "cash_on_delivery" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  orderNumber: string;
  estimatedDeliveryDate: Date;
  deliveryDate?: Date;
  invoiceType: "regular" | "corporate";
  bankDetails?: IBankDetails; // Simplified bank details
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cash_on_delivery" | "online";
export type InvoiceType = "regular" | "corporate";
