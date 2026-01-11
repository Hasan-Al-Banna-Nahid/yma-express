import Customer from "./customer.model";
import { ICustomer } from "./customer.interface";
import Order from "../../modules/Order/order.model";
import User from "../../modules/Auth/user.model";
import { Types } from "mongoose";

/* ===================== TYPES ===================== */

export interface CustomerStats {
  totalCustomers: number;
  newCustomersToday: number;
  customersWithOrders: number;
  averageOrdersPerCustomer: number;
  totalRevenue: number;
  topCustomers: Array<{
    customerId: Types.ObjectId;
    name: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

export interface CustomerFilterOptions {
  search?: string;
  phone?: string;
  name?: string;
  email?: string;
  city?: string;
  tags?: string[];
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  startDate?: Date;
  endDate?: Date;
  isFavorite?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CustomerOrderHistory {
  customer: ICustomer;
  orders: unknown[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    favoriteProducts: Array<{
      productId: Types.ObjectId;
      name: string;
      timesOrdered: number;
    }>;
  };
}

/* ===================== SERVICE ===================== */

export class CustomerService {
  /* ---------- CREATE / UPDATE ---------- */
  static async createOrUpdateCustomerFromOrder(
    userId: string | Types.ObjectId,
    orderData: {
      totalAmount: number;
      shippingAddress?: {
        phone?: string;
        street?: string;
        city?: string;
        zipCode?: string;
      };
    }
  ): Promise<ICustomer> {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error("User not found");

    const existingCustomer = await Customer.findOne({ user: userId });

    const customerData = {
      user: userId,
      name: user.name,
      email: user.email,
      phone: user.phone || orderData.shippingAddress?.phone || "",
      address: orderData.shippingAddress?.street || "",
      city: orderData.shippingAddress?.city || "",
      postcode: orderData.shippingAddress?.zipCode || "",
    };

    if (existingCustomer) {
      existingCustomer.totalOrders += 1;
      existingCustomer.totalSpent += orderData.totalAmount;
      existingCustomer.lastOrderDate = new Date();

      existingCustomer.phone ||= customerData.phone;
      existingCustomer.address ||= customerData.address;
      existingCustomer.city ||= customerData.city;

      return existingCustomer.save();
    }

    return Customer.create({
      ...customerData,
      totalOrders: 1,
      totalSpent: orderData.totalAmount,
      firstOrderDate: new Date(),
      lastOrderDate: new Date(),
      isFavorite: false,
      tags: ["new-customer"],
    });
  }

  /* ---------- GET ALL ---------- */
  static async getAllCustomers(filters: CustomerFilterOptions = {}): Promise<{
    customers: ICustomer[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      search,
      phone,
      name,
      email,
      city,
      tags,
      minOrders,
      maxOrders,
      minSpent,
      maxSpent,
      startDate,
      endDate,
      isFavorite,
      page = 1,
      limit = 10,
      sortBy = "lastOrderDate",
      sortOrder = "desc",
    } = filters;

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    if (phone) query.phone = new RegExp(phone, "i");
    if (name) query.name = new RegExp(name, "i");
    if (email) query.email = new RegExp(email, "i");
    if (city) query.city = new RegExp(city, "i");
    if (tags?.length) query.tags = { $in: tags };
    if (isFavorite !== undefined) query.isFavorite = isFavorite;

    if (minOrders !== undefined || maxOrders !== undefined) {
      query.totalOrders = {
        ...(minOrders !== undefined && { $gte: minOrders }),
        ...(maxOrders !== undefined && { $lte: maxOrders }),
      };
    }

    if (minSpent !== undefined || maxSpent !== undefined) {
      query.totalSpent = {
        ...(minSpent !== undefined && { $gte: minSpent }),
        ...(maxSpent !== undefined && { $lte: maxSpent }),
      };
    }

    if (startDate || endDate) {
      query.createdAt = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 } as const;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean<ICustomer[]>(),
      Customer.countDocuments(query),
    ]);

    return {
      customers,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /* ---------- GET BY ID ---------- */
  static async getCustomerById(
    customerId: string
  ): Promise<CustomerOrderHistory | null> {
    const customer = await Customer.findById(customerId).lean<ICustomer>();
    if (!customer) return null;

    const orders = await Order.find({ user: customer.user })
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .lean();

    const productMap = new Map<
      string,
      CustomerOrderHistory["stats"]["favoriteProducts"][0]
    >();

    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        if (!item.product) return;
        const id = item.product._id.toString();
        const entry = productMap.get(id);
        if (entry) entry.timesOrdered += item.quantity;
        else {
          productMap.set(id, {
            productId: item.product._id,
            name: item.product.name,
            timesOrdered: item.quantity,
          });
        }
      });
    });

    return {
      customer,
      orders,
      stats: {
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        averageOrderValue:
          customer.totalOrders > 0
            ? customer.totalSpent / customer.totalOrders
            : 0,
        lastOrderDate: customer.lastOrderDate,
        favoriteProducts: [...productMap.values()]
          .sort((a, b) => b.timesOrdered - a.timesOrdered)
          .slice(0, 5),
      },
    };
  }

  /* ---------- SIMPLE OPS ---------- */
  static getCustomerByUserId(userId: string) {
    return Customer.findOne({ user: userId }).lean<ICustomer>();
  }

  static updateCustomer(customerId: string, update: Partial<ICustomer>) {
    return Customer.findByIdAndUpdate(customerId, update, {
      new: true,
      runValidators: true,
    }).lean<ICustomer>();
  }

  static async toggleFavorite(customerId: string) {
    const customer = await Customer.findById(customerId);
    if (!customer) return null;
    customer.isFavorite = !customer.isFavorite;
    return customer.save();
  }

  static addTag(customerId: string, tag: string) {
    return Customer.findByIdAndUpdate(
      customerId,
      { $addToSet: { tags: tag } },
      { new: true }
    ).lean<ICustomer>();
  }

  static removeTag(customerId: string, tag: string) {
    return Customer.findByIdAndUpdate(
      customerId,
      { $pull: { tags: tag } },
      { new: true }
    ).lean<ICustomer>();
  }

  /* ---------- STATS ---------- */
  static async getCustomerStats(): Promise<CustomerStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      newCustomersToday,
      customersWithOrders,
      topCustomers,
    ] = await Promise.all([
      Customer.countDocuments().exec(),
      Customer.countDocuments({ createdAt: { $gte: today } }).exec(),
      Customer.countDocuments({ totalOrders: { $gt: 0 } }).exec(),
      Customer.aggregate<CustomerStats["topCustomers"][number]>([
        { $match: { totalOrders: { $gt: 0 } } },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            customerId: "$_id",
            name: 1,
            totalOrders: 1,
            totalSpent: 1,
          },
        },
      ]).exec(),
    ]);

    const revenueResult = await Customer.aggregate<{ total: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSpent" },
        },
      },
    ]).exec();

    return {
      totalCustomers,
      newCustomersToday,
      customersWithOrders,
      averageOrdersPerCustomer:
        totalCustomers > 0 ? customersWithOrders / totalCustomers : 0,
      totalRevenue: revenueResult[0]?.total ?? 0,
      topCustomers, // ✅ now correctly typed
    };
  }

  static searchCustomers(term: string) {
    return Customer.find({
      $or: [
        { phone: new RegExp(term, "i") },
        { name: new RegExp(term, "i") },
        { email: new RegExp(term, "i") },
      ],
    })
      .limit(20)
      .sort({ lastOrderDate: -1 })
      .lean<ICustomer[]>();
  }

  static async deleteCustomer(customerId: string): Promise<boolean> {
    return (await Customer.findByIdAndDelete(customerId)) !== null;
  }
}
