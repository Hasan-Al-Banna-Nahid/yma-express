import mongoose, { Types, Document } from "mongoose";

// User/Customer Interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "user" | "admin";
  photo?: string;
  active: boolean;

  // Customer fields (will be populated when user places order)
  customerId?: string;
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

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  createJWT(): string;
  changedPasswordAfter(JWTTimestamp: number): boolean;

  // Virtual
  fullAddress?: string;
}

// Customer Interface (for customer-specific operations)
export interface ICustomer extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  customerId?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  photo?: string;
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
  fullAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Order Item Interface
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

// Shipping Address Interface
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

// Order Interface
export interface IOrder {
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotalAmount: number;
  deliveryFee: number;
  overnightFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: "cash_on_delivery" | "credit_card" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  invoiceType: "regular" | "corporate";
  bankDetails?: string;
  promoCode?: string;
  promoDiscount?: number;
  createdAt: Date;
  updatedAt: Date;
  orderNumber?: string;
  estimatedDeliveryDate?: Date;
  deliveryDate?: Date;
  adminNotes?: string;
  startDate?: Date;
  endDate?: Date;
}

// Document Interfaces
export interface IOrderItemDocument extends IOrderItem, Document {}
export interface IOrderDocument extends IOrder, Document {}

// Service Interfaces
export interface CreateOrderInput {
  user: mongoose.Types.ObjectId;
  items: Array<{
    product: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    startDate?: Date;
    endDate?: Date;
    hireOccasion?: string;
    keepOvernight?: boolean;
  }>;
  subtotalAmount: number;
  deliveryFee?: number;
  overnightFee?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: "cash_on_delivery" | "credit_card" | "online";
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  invoiceType?: "regular" | "corporate";
  bankDetails?: string;
  estimatedDeliveryDate?: Date;
  promoCode?: string;
  promoDiscount?: number;
}

export interface UpdateOrderInput {
  status?: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  adminNotes?: string;
  deliveryDate?: Date;
  estimatedDeliveryDate?: Date;
  items?: Array<{
    product: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount?: number;
  paymentMethod?: "cash_on_delivery" | "credit_card" | "online";
  shippingAddress?: Partial<IShippingAddress>;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
}

export interface FilterOptions {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  userId?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ==================== CUSTOMER INTERFACES ====================
export interface CreateUserOrderInput {
  productId: string;
  quantity: number;
  paymentMethod: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    street: string;
    city: string;
    country?: string;
    zipCode?: string;
  };
}

export interface ICustomerStats {
  totalCustomers: number;
  newCustomersToday: number;
  topCustomers: Array<{
    customerId: Types.ObjectId;
    name: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

export interface CustomerSearchFilters {
  searchTerm?: string;
  phone?: string;
  email?: string;
  name?: string;
  city?: string;
  tags?: string[];
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  startDate?: Date;
  endDate?: Date;
  isFavorite?: boolean;
  role?: string;
  onlyWithOrders?: boolean;
}

export interface CustomerOrderHistory {
  customer: ICustomer;
  orders: any[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteProducts: Array<{
      productId: Types.ObjectId;
      name: string;
      timesOrdered: number;
    }>;
  };
}

// ==================== DELIVERY TIME SYSTEM ====================
export type DeliveryTimeOption = {
  value: string;
  label: string;
  fee: number;
  isFree?: boolean;
};

// Default delivery time options
export const DELIVERY_TIME_OPTIONS: DeliveryTimeOption[] = [
  { value: "8am-12pm", label: "8 AM - 12 PM", fee: 0, isFree: true },
  { value: "12pm-4pm", label: "12 PM - 4 PM", fee: 10 },
  { value: "4pm-8pm", label: "4 PM - 8 PM", fee: 10 },
  { value: "after_8pm", label: "After 8 PM", fee: 10 },
];

// Get values for Mongoose enum
export const DELIVERY_TIME_VALUES = DELIVERY_TIME_OPTIONS.map(
  (opt) => opt.value
);

// SIMPLE Delivery Time Manager
export class DeliveryTimeManager {
  static normalizeForDatabase(input: string): string {
    if (!input) return "8am-12pm";

    const cleaned = input.toLowerCase().trim();

    const mappings: Record<string, string> = {
      "8 am - 12 pm (free)": "8am-12pm",
      "8-12": "8am-12pm",
      "8am-12pm": "8am-12pm",
      "8:00-12:00": "8am-12pm",
      "8-12pm": "8am-12pm",
      "12-4": "12pm-4pm",
      "12pm-4pm": "12pm-4pm",
      "12:00-16:00": "12pm-4pm",
      "4-8": "4pm-8pm",
      "4pm-8pm": "4pm-8pm",
      "16:00-20:00": "4pm-8pm",
      "after 8pm": "after_8pm",
      after_8pm: "after_8pm",
      "20:00+": "after_8pm",
    };

    return mappings[cleaned] || "8am-12pm";
  }

  static getDisplayLabel(value: string): string {
    const option = DELIVERY_TIME_OPTIONS.find((opt) => opt.value === value);
    if (!option) return "8 AM - 12 PM (Free)";

    return `${option.label}${option.isFree ? " (Free)" : ` (£${option.fee})`}`;
  }

  static getFee(value: string): number {
    const option = DELIVERY_TIME_OPTIONS.find((opt) => opt.value === value);
    return option?.fee || 0;
  }

  static isValid(value: string): boolean {
    return DELIVERY_TIME_VALUES.includes(value);
  }
}

// Other constants
export const COLLECTION_TIME_OPTIONS = [
  { value: "before_5pm", label: "Before 5 PM (Free)", fee: 0 },
  { value: "after_5pm", label: "After 5 PM (£10)", fee: 10 },
  { value: "next_day", label: "Next Day (£10)", fee: 10 },
] as const;

export const HIRE_OCCASION_OPTIONS = [
  "birthday",
  "wedding",
  "corporate_event",
  "school_event",
  "community_event",
  "private_party",
  "other",
] as const;

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const PAYMENT_METHODS = {
  CASH_ON_DELIVERY: "cash_on_delivery",
  CREDIT_CARD: "credit_card",
  ONLINE: "online",
} as const;

export const INVOICE_TYPES = {
  REGULAR: "regular",
  CORPORATE: "corporate",
} as const;
