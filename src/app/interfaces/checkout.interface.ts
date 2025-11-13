import mongoose from "mongoose";

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
}

export interface IOrder {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: "cash_on_delivery" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: {
    // Personal Information
    firstName: string;
    lastName: string;
    email: string;
    phone: string;

    // Delivery Information
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    apartment?: string;

    // Additional Fields
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
  };
  termsAccepted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
