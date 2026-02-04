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
  imageCover: string; // Ensure this field exists here
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;

  // Main address
  street: string; // line 1
  apartment?: string; // line 2 / flat / suite
  city: string;
  state?: string; // ← NEW: province / region / state
  zipCode: string;
  country: string;

  // Extra location info
  companyName?: string;
  location?: string; // e.g. "back garden", "front porch"
  floorType?: string; // grass / concrete / tiles / wood
  locationAccessibility?: string; // "easy access", "stairs", "lift required"

  // Delivery & usage preferences
  deliveryTime?: string;
  collectionTime?: string;
  userType?: string; // "private" | "business" | "school" | ...
  keepOvernight?: boolean;
  hireOccasion?: string;

  // Notes & billing
  notes?: string;
  differentBillingAddress?: boolean;

  // Billing address (if different)
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingEmail?: string;
  billingStreet?: string;
  billingStreet2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  billingCompanyName?: string;
  billingNotes?: string;
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
  customerName?: string;
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
// Add to your existing checkout.interface.ts
export interface DateAvailabilityRequest {
  productId: string;
  startDate: Date;
  endDate: Date;
  quantity?: number;
}

export interface DateAvailabilityResponse {
  isAvailable: boolean;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  message?: string;
}

export interface AvailableDatesResponse {
  productId: string;
  productName: string;
  availableDates: string[]; // ISO date strings (YYYY-MM-DD)
  unavailableDates: string[];
  range: {
    start: Date;
    end: Date;
  };
}
export interface IOrderItemDocument extends IOrderItem, Document {}
export interface IOrderDocument extends IOrder, Document {}
