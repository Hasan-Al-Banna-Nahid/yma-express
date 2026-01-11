import { Promo } from "./promos.model";
import {
  IPromo,
  CreatePromoDTO,
  UpdatePromoDTO,
  PromoStats,
  PromoStatus,
} from "./promos.interface";

export class PromoService {
  // Create new promo
  async createPromo(promoData: CreatePromoDTO): Promise<IPromo> {
    const promo = new Promo(promoData);
    return await promo.save();
  }

  // Get all promos
  async getAllPromos(): Promise<IPromo[]> {
    return await Promo.find().sort({ createdOn: -1 });
  }

  // Get promo by ID
  async getPromoById(id: string): Promise<IPromo | null> {
    return await Promo.findById(id);
  }

  // Get promo by name
  async getPromoByName(promoName: string): Promise<IPromo | null> {
    return await Promo.findOne({ promoName });
  }

  // Update promo
  async updatePromo(
    id: string,
    updateData: UpdatePromoDTO
  ): Promise<IPromo | null> {
    return await Promo.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  // Delete promo
  async deletePromo(id: string): Promise<IPromo | null> {
    return await Promo.findByIdAndDelete(id);
  }

  // Apply promo (simulate usage)
  async applyPromo(
    promoId: string,
    orderAmount: number,
    customerId?: string
  ): Promise<{ success: boolean; discount: number; message?: string }> {
    const promo = await Promo.findById(promoId);

    if (!promo) {
      return { success: false, discount: 0, message: "Promo not found" };
    }

    // First validate
    const validation = await this.validatePromo(promo.promoName, orderAmount);
    if (!validation.valid) {
      return { success: false, discount: 0, message: validation.message };
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (orderAmount * promo.discountPercentage) / 100;
      if (promo.maxDiscountValue && discount > promo.maxDiscountValue) {
        discount = promo.maxDiscountValue;
      }
    } else if (promo.discountType === "fixed_amount") {
      discount = promo.discount;
    } else if (promo.discountType === "free_shipping") {
      discount = promo.discount;
    }

    // Update promo stats WITHOUT changing status
    promo.usage += 1;
    promo.totalUsage += 1;
    promo.totalDiscount += discount;
    promo.totalRevenue += orderAmount;
    promo.avgDiscountPerOrder = promo.totalDiscount / promo.totalUsage;

    // Only change status if usage limit reached
    if (promo.totalUsageLimit && promo.totalUsage >= promo.totalUsageLimit) {
      promo.status = PromoStatus.INACTIVE;
      promo.availability = false;
    }

    await promo.save();

    return { success: true, discount };
  }

  // Get promo statistics
  async getPromoStats(): Promise<PromoStats> {
    const allPromos = await Promo.find();
    const activePromos = await Promo.countDocuments({
      status: PromoStatus.ACTIVE,
    });
    const expiredPromos = await Promo.countDocuments({
      status: PromoStatus.EXPIRED,
    });

    const stats: PromoStats = {
      totalPromos: allPromos.length,
      totalDiscountGiven: allPromos.reduce(
        (sum, promo) => sum + promo.totalDiscount,
        0
      ),
      totalUsage: allPromos.reduce((sum, promo) => sum + promo.totalUsage, 0),
      avgDiscountPerOrder:
        allPromos.reduce((sum, promo) => sum + promo.avgDiscountPerOrder, 0) /
        (allPromos.length || 1),
      activePromos,
      expiredPromos,
    };

    return stats;
  }

  // Get active promos
  async getActivePromos(): Promise<IPromo[]> {
    return await Promo.find({
      status: PromoStatus.ACTIVE,
      availability: true,
    });
  }

  // Validate promo
  async validatePromo(
    promoName: string,
    orderAmount: number
  ): Promise<{ valid: boolean; message?: string; discount?: number }> {
    const promo = await Promo.findOne({ promoName });

    if (!promo) {
      return { valid: false, message: "Promo not found" };
    }

    // Check availability
    if (!promo.availability) {
      return { valid: false, message: "Promo is not available" };
    }

    // Check status
    if (promo.status !== PromoStatus.ACTIVE) {
      return { valid: false, message: `Promo is ${promo.status}` };
    }

    // Check validity period
    const now = new Date();
    if (now < promo.validityPeriod.from) {
      return { valid: false, message: "Promo not yet started" };
    }

    if (now > promo.validityPeriod.to) {
      return { valid: false, message: "Promo has expired" };
    }

    // Check minimum order value
    if (promo.minimumOrderValue && orderAmount < promo.minimumOrderValue) {
      return {
        valid: false,
        message: `Minimum order value of ${promo.minimumOrderValue} required`,
      };
    }

    // Check total usage limit
    if (promo.totalUsageLimit && promo.totalUsage >= promo.totalUsageLimit) {
      return { valid: false, message: "Promo usage limit reached" };
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (orderAmount * promo.discountPercentage) / 100;
      if (promo.maxDiscountValue && discount > promo.maxDiscountValue) {
        discount = promo.maxDiscountValue;
      }
    } else if (promo.discountType === "fixed_amount") {
      discount = promo.discount;
    } else if (promo.discountType === "free_shipping") {
      discount = promo.discount;
    }

    return {
      valid: true,
      discount,
    };
  }
}
