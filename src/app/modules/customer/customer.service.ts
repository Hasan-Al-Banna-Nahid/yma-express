import Customer from "./customer.model";
import Product from "../../modules/Product/product.model";
import { sendCustomerOrderEmail } from "./email.service";

export class CustomerService {
  /**
   * Get all customers with date filtering and full order details
   */
  static async getCustomers(query: any) {
    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
      search = "",
      includeOrders = "true", // Default to true to ensure they show
    } = query;

    const skip = (page - 1) * limit;
    const filter: any = {};

    // 1. Search Logic
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { customerId: regex },
      ];
    }

    // 2. Date Range Filter (Based on Customer Creation or lastOrderDate)
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const queryBuilder = Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // 3. Deep Populate Orders -> Items -> Product (to get the Image)
    if (includeOrders === "true" || includeOrders === true) {
      queryBuilder.populate({
        path: "orders",
        populate: {
          path: "items.product",
          select: "name price image mainImage", // Fetches the product image
        },
      });
    }

    const customers = await queryBuilder.lean();
    const total = await Customer.countDocuments(filter);

    return {
      data: customers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Single Customer Detail with full Order & Product images
   */
  static async getCustomerDetail(customerId: string) {
    const customer = await Customer.findOne({ customerId })
      .populate({
        path: "orders",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "items.product",
          select: "name price image mainImage description",
        },
      })
      .lean();

    if (!customer) throw new Error("Customer not found");
    return customer;
  }

  /**
   * Prepare Reorder and send Email
   */
  static async prepareReorder(body: any) {
    const { customerId, itemsToReorder } = body;
    const customer = await Customer.findOne({ customerId }).lean();
    if (!customer) throw new Error("Customer not found");

    const preparedItems = [];
    const emailItems = [];

    for (const item of itemsToReorder) {
      const product = await Product.findById(item.productId).lean();
      if (!product) continue;

      preparedItems.push({
        product: product._id,
        name: product.name,
        image: product?.imageCover,
        quantity: 1,
        price: product.price,
        startDate: item.startDate,
        endDate: item.endDate,
      });

      emailItems.push({
        name: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price * 1,
      });
    }

    const totalAmount = emailItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Send the detailed email
    await sendCustomerOrderEmail("order-received", {
      to: customer.email,
      customerName: customer.name,
      orderId: `RE-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
      eventDate: new Date(itemsToReorder[0].startDate).toLocaleDateString(),
      deliveryTime: "09:00 AM",
      deliveryAddress: `${customer.address}, ${customer.city}, ${customer.postcode}`,
      totalAmount,
      orderItems: emailItems,
    });

    return { items: preparedItems, totalAmount };
  }
}
