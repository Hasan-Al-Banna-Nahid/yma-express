// booking.interface.ts
import { Types } from "mongoose";
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  InvoiceType,
  RentalType,
} from "../../types/express/common.types";

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
  // Add the missing properties as optional
  deliveryTime?: string;
  collectionTime?: string;
  street?: string;
  apartment?: string;
  zipCode?: string;
  locationAccessibility?: string;
  floorType?: string;
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
  securityDeposit?: number;
  invoiceType: InvoiceType;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
    bankName?: string;
  };
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
  paymentMethod: PaymentMethod;
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
