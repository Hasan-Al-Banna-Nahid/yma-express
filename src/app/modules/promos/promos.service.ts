import { Promo } from "./promos.model";
import {
  IPromo,
  CreatePromoDTO,
  UpdatePromoDTO,
  PromoStats,
  PromoStatus,
  CustomerInfo,
  OrderWithProductDetails,
  OrderItemWithProduct,
  OrdersWithProductsResponse,
  OrderQueryParams,
  DiscountType,
} from "./promos.interface";
import Order from "../../modules/Order/order.model";
import mongoose from "mongoose";

export class PromoService {
  // Create new promo
  async createPromo(promoData: CreatePromoDTO): Promise<IPromo> {
    const promo = new Promo(promoData);
    return await promo.save();
  }

  async getOrdersWithProducts(
    promoId: string,
    queryParams: OrderQueryParams = {},
  ): Promise<OrdersWithProductsResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        status,
        startDate,
        endDate,
      } = queryParams;

      // Get the promo first to get its name
      const promo = await Promo.findById(promoId);
      if (!promo) {
        throw new Error("Promo not found");
      }

      // Build filter - check both promoId and promoCode fields
      const filter: any = {
        $or: [
          { promoId: new mongoose.Types.ObjectId(promoId) },
          { promoCode: promo.promoName },
        ],
      };

      // Add status filter if provided
      if (status && status !== "all") {
        filter.status = status;
      }

      // Add date range filter if provided
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate);
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const total = await Order.countDocuments(filter);

      // Fetch orders with populated data
      const orders = await Order.find(filter)
        .populate({
          path: "user",
          select: "name email",
        })
        .populate({
          path: "items.product",
          select: "name price images",
        })
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Transform the data to match OrderWithProductDetails interface
      const transformedOrders: OrderWithProductDetails[] = orders.map(
        (order: any) => {
          // Map items with product details
          const items: OrderItemWithProduct[] = order.items.map(
            (item: any) => ({
              product: {
                _id: item.product?._id?.toString() || "",
                name: item.product?.name || "Unknown Product",
                price: item.product?.price || 0,
                image: item.product?.images?.[0] || null,
              },
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.quantity * item.price,
            }),
          );

          // Create customer info
          const customer: CustomerInfo = {
            _id: order.user?._id?.toString() || "",
            name: order.user?.name || "Unknown Customer",
            email: order.user?.email || "",
          };

          // Calculate total items
          const totalItems = order.items.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0,
          );

          // Return the complete order with product details
          return {
            _id: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount,
            subtotalAmount: order.subtotalAmount || 0,
            deliveryFee: order.deliveryFee || 0,
            discountAmount: order.discountAmount || 0,
            promoCode: order.promoCode,
            promoDiscount: order.promoDiscount || 0,
            promoId: order.promoId?.toString(),
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            paymentMethod: order.paymentMethod,
            totalItems,
            customer,
            items,
            shippingAddress: order.shippingAddress || {},
          };
        },
      );

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        success: true,
        data: transformedOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error: any) {
      console.error("Error in getOrdersWithProducts:", error);
      throw error;
    }
  }

  async getAllPromoOrders(
    queryParams: OrderQueryParams = {},
  ): Promise<OrdersWithProductsResponse> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      startDate,
      endDate,
    } = queryParams;

    const filter: any = { promoCode: { $exists: true, $ne: "" } };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "items.product",
        select: "name price",
      })
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedOrders: OrderWithProductDetails[] = orders.map(
      (order: any) => {
        const items: OrderItemWithProduct[] = order.items.map((item: any) => ({
          product: {
            _id: item.product?._id?.toString() || "",
            name: item.product?.name || "Unknown Product",
            price: item.product?.price || 0,
          },
          quantity: item.quantity,
          totalPrice: item.quantity * item.price,
        }));

        const customer: CustomerInfo = {
          _id: order.user?._id?.toString() || "",
          name: order.user?.name || "Unknown Customer",
          email: order.user?.email || "",
        };

        return {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          promoCode: order.promoCode,
          promoDiscount: order.promoDiscount,
          promoId: order.promoId?.toString(),
          createdAt: order.createdAt,
          customer,
          items,
        };
      },
    );

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      success: true,
      data: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async getPromoPerformance(promoId: string) {
    const promo = await Promo.findById(promoId);
    if (!promo) {
      throw new Error("Promo not found");
    }

    const ordersResult = await this.getOrdersWithProducts(promoId, {
      limit: 50,
    });

    const totalOrders = ordersResult.pagination.total;
    const totalRevenue = ordersResult.data.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const totalDiscount = ordersResult.data.reduce(
      (sum, order) => sum + (order.promoDiscount || 0),
      0,
    );

    const customerCount = new Set(
      ordersResult.data.map((order) => order.customer._id),
    ).size;
    const recentOrders = ordersResult.data.slice(0, 5);

    return {
      promo: {
        id: promo._id,
        name: promo.promoName,
        discount: promo.discount,
        usage: promo.usage,
        totalUsage: promo.totalUsage,
        totalDiscount: promo.totalDiscount,
      },
      performance: {
        totalOrders,
        totalRevenue,
        totalDiscount,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        uniqueCustomers: customerCount,
        averageDiscountPerOrder:
          totalOrders > 0 ? totalDiscount / totalOrders : 0,
      },
      recentOrders,
    };
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
    updateData: UpdatePromoDTO,
  ): Promise<IPromo | null> {
    return await Promo.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  // Delete promo
  async deletePromo(id: string): Promise<IPromo | null> {
    return await Promo.findByIdAndDelete(id);
  }

  async applyPromo(
    identifier: string, // promoName or _id
    orderAmount: number,
  ): Promise<{ success: boolean; discount: number; message?: string }> {
    // 1️⃣ Find promo by _id or name
    let promo: IPromo | null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      promo = await Promo.findById(identifier).lean();
    } else {
      promo = await Promo.findOne({ promoName: identifier }).lean();
    }

    if (!promo)
      return { success: false, discount: 0, message: "Promo not found" };

    // 2️⃣ Validate promo
    const validation = await this.validatePromo(promo.promoName, orderAmount);
    if (!validation.valid)
      return { success: false, discount: 0, message: validation.message };

    // 3️⃣ Calculate discount
    let discount = 0;
    switch (promo.discountType) {
      case DiscountType.PERCENTAGE:
        discount = (orderAmount * promo.discountPercentage) / 100;
        if (promo.maxDiscountValue && discount > promo.maxDiscountValue) {
          discount = promo.maxDiscountValue;
        }
        break;
      case DiscountType.FIXED_AMOUNT:
      case DiscountType.FREE_SHIPPING:
        discount = promo.discount;
        break;
    }

    // 4️⃣ Atomic update of stats
    await Promo.findByIdAndUpdate(
      promo._id,
      {
        $inc: {
          usage: 1,
          totalUsage: 1,
          totalDiscount: discount,
          totalRevenue: orderAmount,
        },
        $set: {
          status:
            promo.totalUsageLimit &&
            promo.totalUsage + 1 >= promo.totalUsageLimit
              ? PromoStatus.INACTIVE
              : promo.status,
          availability:
            promo.totalUsageLimit &&
            promo.totalUsage + 1 >= promo.totalUsageLimit
              ? false
              : promo.availability,
          avgDiscountPerOrder:
            (promo.totalDiscount + discount) / (promo.totalUsage + 1),
        },
      },
      { new: true },
    );

    return { success: true, discount };
  }

  async validatePromo(
    promoName: string,
    orderAmount: number,
  ): Promise<{ valid: boolean; discount?: number; message?: string }> {
    const promo = await Promo.findOne({ promoName }).lean();
    if (!promo) return { valid: false, message: "Promo not found" };

    const now = new Date();
    if (!promo.availability)
      return { valid: false, message: "Promo is not available" };
    if (promo.status !== PromoStatus.ACTIVE)
      return { valid: false, message: `Promo is ${promo.status}` };
    if (now < promo.validityPeriod.from)
      return { valid: false, message: "Promo not yet started" };
    if (now > promo.validityPeriod.to)
      return { valid: false, message: "Promo has expired" };
    if (promo.minimumOrderValue && orderAmount < promo.minimumOrderValue)
      return {
        valid: false,
        message: `Minimum order value ${promo.minimumOrderValue} required`,
      };
    if (promo.totalUsageLimit && promo.totalUsage >= promo.totalUsageLimit)
      return { valid: false, message: "Promo usage limit reached" };

    // Calculate discount without applying
    let discount = 0;
    switch (promo.discountType) {
      case DiscountType.PERCENTAGE:
        discount = (orderAmount * promo.discountPercentage) / 100;
        if (promo.maxDiscountValue && discount > promo.maxDiscountValue) {
          discount = promo.maxDiscountValue;
        }
        break;

      case DiscountType.FIXED_AMOUNT:
      case DiscountType.FREE_SHIPPING:
        discount = promo.discount;
        break;
    }

    return { valid: true, discount };
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
        0,
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
}
