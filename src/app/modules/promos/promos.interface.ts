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
