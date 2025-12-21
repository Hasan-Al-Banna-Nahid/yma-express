import { Types } from "mongoose";

export interface IBookingItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  rentalType?: "daily" | "weekly" | "monthly";
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  zipCode: string;
  apartment?: string;
  companyName?: string;
  locationAccessibility?: "easy" | "moderate" | "difficult";
  deliveryTime?: string;
  collectionTime?: string;
  floorType?: "ground" | "first" | "second" | "higher";
  userType?: "personal" | "business" | "event";
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

export interface IPaymentDetails {
  method: "cash_on_delivery" | "bank_transfer" | "card" | "paypal";
  status: "pending" | "paid" | "failed" | "refunded";
  transactionId?: string;
  paidAt?: Date;
  amount: number;
}

export interface IBookingStatusHistory {
  status: BookingStatus;
  changedAt: Date;
  changedBy: Types.ObjectId;
  notes?: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "payment_pending"
  | "payment_completed"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "ready_for_collection"
  | "collected"
  | "completed"
  | "cancelled"
  | "refunded";

export type InvoiceType = "regular" | "corporate";

export interface IBooking {
  _id?: Types.ObjectId;
  bookingNumber: string;
  user: Types.ObjectId;
  items: IBookingItem[];
  shippingAddress: IShippingAddress;
  payment: IPaymentDetails;
  status: BookingStatus;
  statusHistory: IBookingStatusHistory[];
  totalAmount: number;
  subTotal: number;
  taxAmount: number;
  deliveryFee: number;
  securityDeposit?: number;
  depositPaid?: boolean;
  depositAmount?: number;
  invoiceType: InvoiceType;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
    bankName?: string;
  };
  termsAccepted: boolean;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  estimatedCollectionDate?: Date;
  actualCollectionDate?: Date;
  adminNotes?: string;
  customerNotes?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateBookingData {
  shippingAddress: IShippingAddress;
  paymentMethod: "cash_on_delivery" | "bank_transfer" | "card" | "paypal";
  termsAccepted: boolean;
  invoiceType?: InvoiceType;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
    bankName?: string;
  };
  customerNotes?: string;
}

export interface UpdateBookingData {
  status?: BookingStatus;
  adminNotes?: string;
  estimatedDeliveryDate?: Date;
  estimatedCollectionDate?: Date;
  payment?: Partial<IPaymentDetails>;
  cancellationReason?: string;
}

export interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPaymentAmount: number;
  averageBookingValue: number;
}

export interface BookingFilter {
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  search?: string;
  paymentStatus?: string;
  minAmount?: number;
  maxAmount?: number;
}
