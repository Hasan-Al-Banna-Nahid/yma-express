import Customer from "./customer.model";
import Product from "../../modules/Product/product.model";
import { sendCustomerOrderEmail } from "./email.service";
import Order from "../../modules/Order/order.model";
import { IOrderDocument } from "../../modules/Checkout/checkout.interface";

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
    const { itemsToReorder } = body;

    // 1. Normalize the input email: trim and treat as lowercase
    const emailInput = body.email ? body.email.trim().toLowerCase() : "";

    // 2. Search shippingAddress.email using a case-insensitive regex
    // ^ and $ ensure we match the full string, 'i' makes it treat all as lowercase
    const previousOrder = (await Order.findOne({
      "shippingAddress.email": { $regex: new RegExp(`^${emailInput}$`, "i") },
    })
      .sort({ createdAt: -1 }) // Get the most recent one
      .lean()) as IOrderDocument | null;

    if (!previousOrder) {
      throw new Error(`No previous orders found for email: ${emailInput}`);
    }

    // 3. Generate the Dynamic Name Key
    const firstName = previousOrder.shippingAddress?.firstName || "Guest";
    const lastName = previousOrder.shippingAddress?.lastName || "User";
    const dynamicCustomerKey = `YMA-Cus-${firstName} ${lastName}`;
    const userId = previousOrder.user;

    const preparedItems = [];
    const emailItems = [];

    // 4. Process products (Pulling availability dates from Product DB)
    for (const item of itemsToReorder) {
      const product = await Product.findById(item.productId).lean();

      if (!product) {
        console.log(`Product ${item.productId} not found - skipping`);
        continue;
      }

      const qty = item.quantity || 1;

      preparedItems.push({
        product: product._id,
        name: product.name,
        imageCover: product.imageCover,
        quantity: qty,
        price: product.price,
        startDate: product.availableFrom, // From Product DB
        endDate: product.availableUntil, // From Product DB
      });

      emailItems.push({
        name: product.name,
        quantity: qty,
        price: product.price,
        subtotal: product.price * qty,
      });
    }

    const totalAmount = emailItems.reduce((sum, i) => sum + i.subtotal, 0);

    // 5. Send Email (to the email address found in the DB)
    if (preparedItems.length > 0) {
      await sendCustomerOrderEmail("order-received", {
        to: previousOrder.shippingAddress.email.toLowerCase(),
        customerName: dynamicCustomerKey,
        orderId: `RE-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
        eventDate: new Date().toLocaleDateString(),
        totalAmount,
        orderItems: emailItems,
        deliveryTime: previousOrder.shippingAddress?.deliveryTime || "09:00 AM",
        deliveryAddress: `${previousOrder.shippingAddress?.street}, ${previousOrder.shippingAddress?.city}`,
      });
    }

    return {
      items: preparedItems,
      totalAmount,
      customerName: dynamicCustomerKey,
      user: userId,
    };
  }
}
