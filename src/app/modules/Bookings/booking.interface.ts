import { Types } from "mongoose";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "ready_for_collection"
  | "collected"
  | "completed"
  | "cancelled";
export type PaymentMethod =
  | "cash_on_delivery"
  | "bank_transfer"
  | "card"
  | "paypal";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type InvoiceType = "regular" | "corporate";
export type RentalType = "daily" | "weekly" | "monthly";

export interface IBookingItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  rentalType: RentalType;
  warehouse: string;
  vendor: string;
  rentalFee: number;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
  deliveryTime?: string;
  collectionTime?: string;
}

export interface IPaymentDetails {
  method: PaymentMethod;
  status: PaymentStatus;
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
  collectionFee: number;
  securityDeposit?: number;
  invoiceType: InvoiceType;
  bankDetails?: string;
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
  startDate?: Date;
  endDate?: Date;
  bookedDates?: Array<{
    date: Date;
    itemIndex: number;
    quantity: number;
  }>;
}

export interface CreateBookingData {
  items: {
    productId: string;
    quantity: number;
    startDate: Date;
    endDate: Date;
    rentalType: RentalType;
  }[];
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  invoiceType?: InvoiceType;
  bankDetails?: string;
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
