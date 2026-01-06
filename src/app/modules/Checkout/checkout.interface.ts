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
  // Basic required fields
  firstName: string;
  lastName: string;
  phone: string;
  email: string;

  // Address fields
  country: string;
  city: string;
  street: string;
  zipCode: string;
  apartment?: string;

  // Additional optional fields
  location?: string;
  companyName?: string;
  locationAccessibility?: string;
  deliveryTime?: string;
  floorType?: string;
  collectionTime?: string;
  userType?: string;
  keepOvernight?: boolean;
  hireOccasion?: string;
  notes?: string;

  // Billing address fields
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
  paymentMethod: "cash_on_delivery" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  invoiceType: "regular" | "corporate";
  bankDetails?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
