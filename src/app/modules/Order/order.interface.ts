import mongoose, { Types, Document } from "mongoose";

// ───────────────────────────────────────────────
// USER / CUSTOMER INTERFACES
// ───────────────────────────────────────────────

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "user" | "admin";
  photo?: string;
  active: boolean;
  promoId?: Types.ObjectId;

  // Customer-related fields (populated / updated on orders)
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

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  createJWT(): string;
  changedPasswordAfter(JWTTimestamp: number): boolean;

  // Virtuals (optional)
  fullAddress?: string;
}

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

// ───────────────────────────────────────────────
// ORDER ITEM
// ───────────────────────────────────────────────

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number; // unit price at time of order
  name: string; // snapshot of product name
  startDate?: Date;
  endDate?: Date;
  hireOccasion?: string;
  keepOvernight?: boolean;
  promoId?: Types.ObjectId;
}

export interface IOrderItemDocument extends IOrderItem, Document {}

// ───────────────────────────────────────────────
// SHIPPING ADDRESS (detailed)
// ───────────────────────────────────────────────

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
  location?: string; // e.g. "front gate", "white building"
  companyName?: string;
  locationAccessibility?: string; // e.g. "lift available", "stairs only"
  deliveryTime?: string; // now using 30-min slot format "09:30"
  collectionTime?: string; // "17:00", "20:30" etc.
  floorType?: string;
  userType?: "residential" | "office" | "shop" | string;
  keepOvernight?: boolean;
  hireOccasion?: string;
  notes?: string;
  differentBillingAddress?: boolean;

  // Billing address if different
  billingFirstName?: string;
  billingLastName?: string;
  billingStreet?: string;
  billingCity?: string;
  billingZipCode?: string;
  billingCompanyName?: string;
}

// ───────────────────────────────────────────────
// ORDER
// ───────────────────────────────────────────────

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

  // Timestamps & tracking
  createdAt: Date;
  updatedAt: Date;
  orderNumber?: string;
  estimatedDeliveryDate?: Date;
  deliveryDate?: Date;
  adminNotes?: string;

  // Optional event/hire period (can override item-level if whole order same)
  startDate?: Date;
  endDate?: Date;
}

export interface IOrderDocument extends IOrder, Document {}

// ───────────────────────────────────────────────
// SERVICE / INPUT DTOs
// ───────────────────────────────────────────────

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
  bankDetails?: string;
  invoiceType?: "regular" | "corporate";
}

// ───────────────────────────────────────────────
// STATS & FILTERS
// ───────────────────────────────────────────────

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
  sortBy?: "createdAt" | "totalAmount" | "startDate" | "deliveryDate";
  sortOrder?: "asc" | "desc";
  rentalFrom?: string; // ISO date e.g. "2026-03-10T00:00:00.000Z"
  rentalTo?: string;
  createdFrom?: string;
  createdTo?: string;
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
  orders: IOrderDocument[];
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

// ───────────────────────────────────────────────
// DELIVERY & COLLECTION TIME SYSTEM (30-minute slots)
// ───────────────────────────────────────────────

export type DeliveryTimeOption = {
  value: string; // "09:00", "09:30", "10:00", ...
  label: string; // "9:00 AM", "9:30 AM", ...
  fee: number;
  isFree: boolean;
};

// Delivery: 9:00 AM – 7:00 PM every 30 min
export const DELIVERY_TIME_OPTIONS: DeliveryTimeOption[] = (() => {
  const slots: DeliveryTimeOption[] = [];
  for (let h = 9; h <= 19; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 19 && m === 30) continue; // stop at 19:00

      const hourStr = h.toString().padStart(2, "0");
      const minStr = m.toString().padStart(2, "0");
      const value = `${hourStr}:${minStr}`;

      const displayHour = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const label = `${displayHour}:${minStr} ${ampm}`;

      const fee = h < 12 ? 0 : 10; // 9:00–11:59 free, 12:00+ €10
      slots.push({ value, label, fee, isFree: fee === 0 });
    }
  }
  return slots;
})();

export const DELIVERY_TIME_VALUES = DELIVERY_TIME_OPTIONS.map((o) => o.value);

// Collection: 12:00 PM – 8:30 PM every 30 min
export const COLLECTION_TIME_OPTIONS: DeliveryTimeOption[] = (() => {
  const slots: DeliveryTimeOption[] = [];
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

      const displayHour = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const labelTime = `${displayHour}:${m.toString().padStart(2, "0")} ${ampm}`;

      let fee = 10;
      let isFree = false;
      let labelSuffix = "";

      if (h >= 17) {
        fee = 0;
        isFree = true;
        labelSuffix = " (Free)";
      }

      // Special rule: exactly 20:30 → €20
      if (value === "20:30") {
        fee = 20;
        isFree = false;
        labelSuffix = " (+€20)";
      }

      const label = labelTime + labelSuffix;

      slots.push({ value, label, fee, isFree });
    }
  }
  return slots;
})();

export const COLLECTION_TIME_VALUES = COLLECTION_TIME_OPTIONS.map(
  (o) => o.value,
);

// ───────────────────────────────────────────────
// TIME MANAGER (normalization, formatting, fee lookup)
// ───────────────────────────────────────────────

export class DeliveryTimeManager {
  static normalize(
    input: string | undefined | null,
    type: "delivery" | "collection" = "delivery",
  ): string {
    if (!input) {
      return type === "delivery" ? "09:00" : "17:00";
    }

    const cleaned = input.trim().replace(/\s+/g, "").toLowerCase();

    const commonMappings: Record<string, string> = {
      "9": "09:00",
      "9am": "09:00",
      "9.00": "09:00",
      "930": "09:30",
      "9:30": "09:30",
      "10": "10:00",
      "1030": "10:30",
      "5pm": "17:00",
      "1700": "17:00",
      "17": "17:00",
      "8pm": "20:00",
      "830pm": "20:30",
    };

    if (commonMappings[cleaned]) return commonMappings[cleaned];

    // Direct match
    const allValues = [...DELIVERY_TIME_VALUES, ...COLLECTION_TIME_VALUES];
    if (allValues.includes(cleaned)) return cleaned;

    return type === "delivery" ? "09:00" : "17:00";
  }

  static getDeliveryOption(value: string): DeliveryTimeOption | undefined {
    return DELIVERY_TIME_OPTIONS.find((o) => o.value === value);
  }

  static getCollectionOption(value: string): DeliveryTimeOption | undefined {
    return COLLECTION_TIME_OPTIONS.find((o) => o.value === value);
  }

  static getDeliveryFee(value: string): number {
    return this.getDeliveryOption(value)?.fee ?? 10;
  }

  static getCollectionFee(value: string): number {
    const option = this.getCollectionOption(value);
    // fallback 10 if somehow invalid (but shouldn't happen)
    return option?.fee ?? 10;
  }

  static formatDelivery(value: string): string {
    const opt = this.getDeliveryOption(value);
    if (!opt) return "9:00 AM";
    return `${opt.label}${opt.isFree ? " (Free)" : ` (€${opt.fee})`}`;
  }

  static formatCollection(value: string): string {
    const opt = this.getCollectionOption(value);
    if (!opt) return "5:00 PM";
    return `${opt.label}${opt.isFree ? " (Free)" : ` (€${opt.fee})`}`;
  }

  static isValidDelivery(value: string): boolean {
    return DELIVERY_TIME_VALUES.includes(value);
  }

  static isValidCollection(value: string): boolean {
    return COLLECTION_TIME_VALUES.includes(value);
  }
}

// ───────────────────────────────────────────────
// ENUM-LIKE CONSTANTS
// ───────────────────────────────────────────────

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

export const HIRE_OCCASION_OPTIONS = [
  "christmasEvent",
  "eid",
  "birthdayPartyKid",
  "birthdayPartyAdult",
  "school_event",
  "community_event",
  "wedding",
  "christening",
  "corporateFunday",
] as const;
