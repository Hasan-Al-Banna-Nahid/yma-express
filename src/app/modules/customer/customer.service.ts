// src/modules/customer/customer.service.ts
import { Types } from "mongoose";
import Customer from "./customer.model";
import Order from "../../modules/Order/order.model";
import { sendCustomerOrderEmail } from "./email.service";
import Product from "../../modules/Product/product.model";

// ─── Minimal types for clarity ──────────────────────────────────────
interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  fromDate?: string;
  toDate?: string;
  customerType?: "retail" | "corporate" | "guest";
  isFavorite?: boolean;
  hasOrders?: boolean;
  sortBy?:
    | "totalSpent"
    | "totalOrders"
    | "createdAt"
    | "name"
    | "lastOrderDate";
  sortOrder?: "asc" | "desc";
  includeOrders?: boolean;
}

interface Paginated<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
interface ReorderItemInput {
  productId: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
}
export interface PreparedReorderItem {
  product: string;
  name: string;
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
}
// ─── Shipping Address (lean-safe) ────────────────────────────────────
interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  street?: string;
  zipCode?: string;
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
interface LeanOrderForReorder {
  _id: Types.ObjectId;
  user?: {
    _id?: Types.ObjectId;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postcode?: string;
  };
  items?: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    startDate?: Date;
    endDate?: Date;
    hireOccasion?: string;
    keepOvernight?: boolean;
  }>;
  shippingAddress?: ShippingAddress;
}
interface ReorderRequest {
  customerId: string;
  itemsToReorder: ReorderItemInput[];
}
// ─── Utils ──────────────────────────────────────────────────────────
function splitFullName(fullName?: string | null): {
  firstName: string;
  lastName: string;
} {
  if (!fullName?.trim()) return { firstName: "", lastName: "" };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

// ─── Service ────────────────────────────────────────────────────────
export class CustomerService {
  /**
   * Get list of customers with filters & pagination
   */
  static async getCustomers(query: ListQuery): Promise<Paginated<any>> {
    const {
      page = 1,
      limit = 20,
      search = "",
      minOrders,
      maxOrders,
      minSpent,
      maxSpent,
      fromDate,
      toDate,
      customerType,
      isFavorite,
      hasOrders,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeOrders = false,
    } = query;

    const filter: Record<string, any> = {};

    // Search
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { customerId: regex },
      ];
    }

    if (customerType) filter.customerType = customerType;
    if (typeof isFavorite === "boolean") filter.isFavorite = isFavorite;

    if (hasOrders === true) {
      filter.totalOrders = { ...(filter.totalOrders || {}), $gt: 0 };
    }

    if (minOrders !== undefined || maxOrders !== undefined) {
      filter.totalOrders = filter.totalOrders || {};
      if (minOrders !== undefined) filter.totalOrders.$gte = minOrders;
      if (maxOrders !== undefined) filter.totalOrders.$lte = maxOrders;
    }

    if (minSpent !== undefined || maxSpent !== undefined) {
      filter.totalSpent = filter.totalSpent || {};
      if (minSpent !== undefined) filter.totalSpent.$gte = minSpent;
      if (maxSpent !== undefined) filter.totalSpent.$lte = maxSpent;
    }

    if (fromDate || toDate) {
      filter.lastOrderDate = filter.lastOrderDate || {};
      if (fromDate) filter.lastOrderDate.$gte = new Date(fromDate);
      if (toDate) filter.lastOrderDate.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const queryBuilder = Customer.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (includeOrders) {
      queryBuilder.populate("orders");
    }

    const customers = await queryBuilder.lean();
    const total = await Customer.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = customers.map((c: any) => ({
      customerId: c.customerId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      totalOrders: c.totalOrders ?? 0,
      totalSpent: c.totalSpent ?? 0,
      lastOrderDate: c.lastOrderDate ?? null,
      customerType: c.customerType,
      isFavorite: c.isFavorite ?? false,
      orders: Array.isArray(c.orders) ? c.orders : [],
    }));

    return {
      data,
      pagination: { total, page, limit, pages },
    };
  }

  /**
   * Get detailed view of a single customer + recent orders
   */
  static async getCustomerDetail(customerId: string) {
    const customer = await Customer.findOne({ customerId })
      .populate({
        path: "orders",
        options: { sort: { createdAt: -1 }, limit: 10 },
        select: "orderNumber totalAmount status createdAt deliveryDate items",
      })
      .lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    const recentOrders = (customer.orders || []).map((order: any) => ({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      deliveryDate: order.deliveryDate,
      itemsCount: order.items?.length || 0,
      mainProduct: order.items?.[0]?.name || null,
    }));

    return {
      customer: {
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postcode: customer.postcode,
        country: customer.country,
        customerType: customer.customerType,
        isFavorite: customer.isFavorite,
        tags: customer.tags,
        notes: customer.notes,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        firstOrderDate: customer.firstOrderDate,
        lastOrderDate: customer.lastOrderDate,
        averageOrderValue: customer.averageOrderValue,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      recentOrders,
      stats: {
        favoriteProduct: recentOrders[0]?.mainProduct || null,
      },
    };
  }

  /**
   * Prepare data for re-ordering
   */
  // ─── Lean order type with optional fields ──────────────

  // ─── Prepare reorder safely ─────────────────────────────
  static async prepareReorder(body: ReorderRequest): Promise<{
    items: PreparedReorderItem[];
    suggestedAddress: ShippingAddress;
    totalAmount: number;
  }> {
    const { customerId, itemsToReorder } = body;

    // Find customer by customerId (not _id)
    const customer = await Customer.findOne({ customerId }).lean();

    if (!customer) throw new Error("Customer not found");

    // If customer has no orders, we still allow reorder for any product
    const orderItems: PreparedReorderItem[] = [];

    for (const item of itemsToReorder) {
      // Fetch product details from your Product collection
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        // optional: skip or push placeholder
        orderItems.push({
          product: item.productId,
          name: "Product not available",
          quantity: 1,
          price: 0,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate),
        });
        continue;
      }

      orderItems.push({
        product: String(product._id),
        name: product.name,
        quantity: 1, // default or adjust as needed
        price: product.price,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
      });
    }

    const suggestedAddress: ShippingAddress = {
      firstName: customer.name.split(" ")[0] || "",
      lastName: customer.name.split(" ").slice(1).join(" ") || "",
      phone: customer.phone || "",
      email: customer.email,
      country: "Bangladesh",
      city: customer.city || "",
      street: customer.address || "",
      zipCode: customer.postcode || "",
      deliveryTime: "09:00",
      keepOvernight: false,
      hireOccasion: "",
      notes: "",
    };

    const totalAmount = orderItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    return {
      items: orderItems,
      suggestedAddress,
      totalAmount,
    };
  }
}
