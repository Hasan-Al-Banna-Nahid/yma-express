import Customer from "./customer.model";
import Product from "../../modules/Product/product.model";
import { sendCustomerOrderEmail } from "./email.service";

export class CustomerService {
  /**
   * Get all customers with date filtering and full order details
   */
  static async getCustomers(query: any) {
    const { search, fromDate, toDate, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // 1. Initialize empty filter
    let filter: any = {};

    // 2. Fix Search: Handle multiple fields with Case-Insensitive Regex
    if (search && search !== "undefined" && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { customerId: searchRegex },
        { city: searchRegex },
      ];
    }

    // 3. Fix Dates: Convert String to proper ISODate Objects
    // This is crucial because your DB stores dates as { "$date": ... }
    if (
      (fromDate && fromDate !== "undefined") ||
      (toDate && toDate !== "undefined")
    ) {
      filter.createdAt = {};

      if (fromDate && fromDate !== "undefined") {
        const start = new Date(fromDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }

      if (toDate && toDate !== "undefined") {
        const end = new Date(toDate);
        if (!isNaN(end.getTime())) {
          // Set to 23:59:59 to include everything on that final day
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
    }

    try {
      // 4. Execute Query with Deep Population
      const customers = await Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "orders", // Populates the array of OIDs seen in your JSON
          options: { sort: { createdAt: -1 } },
        })
        .lean(); // Faster performance for read-only data

      const total = await Customer.countDocuments(filter);

      return {
        success: true,
        data: customers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      console.error("Filter Error:", error);
      throw error;
    }
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
