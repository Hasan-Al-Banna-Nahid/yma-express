import { IOrder } from "../../modules/Order/order.interface";
import { Document } from "mongoose";

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
  FREE_SHIPPING = "free_shipping",
}

export enum PromoStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  EXPIRED = "expired",
}

export interface IPromo extends Document {
  promoName: string;
  discountPercentage: number;
  discountType: DiscountType;
  maxDiscountValue?: number;
  discount: number;
  usage: number;
  totalUsage: number;
  totalUsageLimit?: number;
  totalDiscount: number;
  avgDiscountPerOrder: number;
  totalRevenue: number;
  validityPeriod: {
    from: Date;
    to: Date;
  };
  minimumOrderValue?: number;
  usageLimitPerCustomer?: number;
  createdOn: Date;
  status: PromoStatus;
  availability: boolean;
}

export interface PromoStats {
  totalPromos: number;
  totalDiscountGiven: number;
  totalUsage: number;
  avgDiscountPerOrder: number;
  activePromos: number;
  expiredPromos: number;
}

export interface CreatePromoDTO {
  promoName: string;
  discountPercentage: number;
  discountType: DiscountType;
  maxDiscountValue?: number;
  discount: number;
  totalUsageLimit?: number;
  validityPeriod: {
    from: Date;
    to: Date;
  };
  minimumOrderValue?: number;
  usageLimitPerCustomer?: number;
  status?: PromoStatus;
  availability?: boolean;
}

export interface UpdatePromoDTO {
  promoName?: string;
  discountPercentage?: number;
  discountType?: DiscountType;
  maxDiscountValue?: number;
  totalUsageLimit?: number;
  validityPeriod?: {
    from: Date;
    to: Date;
  };
  minimumOrderValue?: number;
  usageLimitPerCustomer?: number;
  status?: PromoStatus;
  availability?: boolean;
}
export interface PaginatedOrderResponse {
  success: boolean;
  data: IOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
export interface CreateOrderDTO {
  orderId: string;
  promoCode: string;
  promoId: string;
  customerId: string;
  customerEmail: string;
  amount: number;
  discount: number;
  finalAmount: number;
  status?: string;
  orderDate?: Date;
}
// Add these interfaces to your existing promos.interface.ts file

export interface CustomerInfo {
  _id: string;
  name: string;
  email: string;
}

export interface ProductInfo {
  _id: string;
  name: string;
  price: number;
}

export interface OrderItemWithProduct {
  product: ProductInfo;
  quantity: number;
  totalPrice: number;
}

export interface OrderWithProductDetails {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  promoCode?: string;
  promoDiscount?: number;
  promoId?: string;
  createdAt: Date;
  customer: CustomerInfo;
  items: OrderItemWithProduct[];
}

export interface OrdersWithProductsResponse {
  success: boolean;
  data: OrderWithProductDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  promoId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}
