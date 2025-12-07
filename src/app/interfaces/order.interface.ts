import mongoose from "mongoose";
import { Types } from "mongoose";

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
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
  differentBillingAddress?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCompanyName?: string;
}

export interface IOrder {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: "cash_on_delivery" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  orderNumber: string;
  estimatedDeliveryDate?: Date;
  deliveryDate?: Date;
  invoiceType?: "regular" | "corporate";
  bankDetails?: {
    bankInfo: string;
  };
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  adminNotes?: string;
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
