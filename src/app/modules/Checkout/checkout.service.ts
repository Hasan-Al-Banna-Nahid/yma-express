// src/services/checkout/checkout.service.ts
import mongoose, { Types } from "mongoose";
import Cart from "../../modules/Cart/cart.model";
import UserOrder, {
  IOrder as UserOrderInterface,
  DELIVERY_TIME_OPTIONS,
  COLLECTION_TIME_OPTIONS,
  HIRE_OCCASION_OPTIONS,
  IOrderDocument,
} from "../../modules/UserOrder/order.model";
import Product from "../../modules/Product/product.model";
import ApiError from "../../utils/apiError";
import {
  sendOrderConfirmationEmail,
  sendOrderNotificationToAdmin,
  sendOrderReceivedEmail,
} from "./email.service";

export interface CreateOrderData {
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    country: string;
    city: string;
    street: string;
    zipCode: string;
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
  };
  paymentMethod: "cash_on_delivery" | "online";
  termsAccepted: boolean;
  invoiceType?: "regular" | "corporate";
  bankDetails?: string;
}

export const createOrderFromCart = async (
  userId: Types.ObjectId,
  data: CreateOrderData
): Promise<IOrderDocument> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Find cart
    const cart = await Cart.findOne({ user: userId }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    // Validate delivery and collection times
    if (data.shippingAddress.deliveryTime) {
      const validDeliveryTimes = DELIVERY_TIME_OPTIONS.map((opt) => opt.value);
      if (
        !validDeliveryTimes.includes(data.shippingAddress.deliveryTime as any)
      ) {
        throw new ApiError("Invalid delivery time selected", 400);
      }
    }

    if (data.shippingAddress.collectionTime) {
      const validCollectionTimes = COLLECTION_TIME_OPTIONS.map(
        (opt) => opt.value
      );
      if (
        !validCollectionTimes.includes(
          data.shippingAddress.collectionTime as any
        )
      ) {
        throw new ApiError("Invalid collection time selected", 400);
      }
    }

    // Validate hire occasion
    if (data.shippingAddress.hireOccasion) {
      if (
        !HIRE_OCCASION_OPTIONS.includes(
          data.shippingAddress.hireOccasion as any
        )
      ) {
        throw new ApiError("Invalid hire occasion", 400);
      }
    }

    let subtotalAmount = 0;
    const orderItems: Array<{
      product: Types.ObjectId;
      quantity: number;
      price: number;
      name: string;
      startDate?: Date;
      endDate?: Date;
      hireOccasion?: string;
      keepOvernight?: boolean;
    }> = [];

    // Process cart items
    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new ApiError(`Product not found: ${item.product}`, 404);
      }

      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        );
      }

      // Update stock
      product.stock -= item.quantity;
      await product.save({ session });

      // Add to order items
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price,
        name: product.name,
        startDate: item.startDate,
        endDate: item.endDate,
        hireOccasion: data.shippingAddress.hireOccasion,
        keepOvernight: data.shippingAddress.keepOvernight,
      });

      subtotalAmount += item.quantity * item.price;
    }

    // Calculate fees
    let deliveryFee = 0;
    let overnightFee = 0;

    // Calculate delivery fee
    if (data.shippingAddress.deliveryTime) {
      const deliveryOption = DELIVERY_TIME_OPTIONS.find(
        (opt) => opt.value === data.shippingAddress.deliveryTime
      );
      if (deliveryOption) {
        deliveryFee += deliveryOption.fee;
      }
    }

    // Calculate collection fee
    if (data.shippingAddress.collectionTime) {
      const collectionOption = COLLECTION_TIME_OPTIONS.find(
        (opt) => opt.value === data.shippingAddress.collectionTime
      );
      if (collectionOption) {
        deliveryFee += collectionOption.fee;
      }
    }

    // Calculate overnight fee
    if (data.shippingAddress.keepOvernight) {
      overnightFee = 30; // £30 for overnight keeping
    }

    // Prepare order data for UserOrder model
    const orderData = {
      user: userId,
      items: orderItems,
      subtotalAmount,
      deliveryFee,
      overnightFee,
      totalAmount: subtotalAmount + deliveryFee + overnightFee,
      paymentMethod:
        data.paymentMethod === "online" ? "credit_card" : "cash_on_delivery",
      status: "pending" as const,
      shippingAddress: {
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
        email: data.shippingAddress.email,
        phone: data.shippingAddress.phone,
        street: data.shippingAddress.street,
        apartment: data.shippingAddress.apartment || "",
        city: data.shippingAddress.city,
        state: data.shippingAddress.country,
        zipCode: data.shippingAddress.zipCode,
        country: data.shippingAddress.country,
        location: data.shippingAddress.location || "",
        deliveryTime: data.shippingAddress.deliveryTime || "",
        collectionTime: data.shippingAddress.collectionTime || "",
        hireOccasion: data.shippingAddress.hireOccasion || "",
        keepOvernight: data.shippingAddress.keepOvernight || false,
        notes: data.shippingAddress.notes || "",
        companyName: data.shippingAddress.companyName || "",
        locationAccessibility: data.shippingAddress.locationAccessibility || "",
        floorType: data.shippingAddress.floorType || "",
        userType: data.shippingAddress.userType || "",
        differentBillingAddress:
          data.shippingAddress.differentBillingAddress || false,
        billingFirstName: data.shippingAddress.billingFirstName || "",
        billingLastName: data.shippingAddress.billingLastName || "",
        billingStreet: data.shippingAddress.billingStreet || "",
        billingCity: data.shippingAddress.billingCity || "",
        billingZipCode: data.shippingAddress.billingZipCode || "",
        billingCompanyName: data.shippingAddress.billingCompanyName || "",
      },
      bankDetails: data.bankDetails,
      termsAccepted: data.termsAccepted,
      invoiceType: data.invoiceType || "regular",
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    // Create order with type casting
    const [createdOrder] = (await UserOrder.create([orderData], {
      session,
    })) as unknown as IOrderDocument[];

    if (!createdOrder) {
      throw new ApiError("Failed to create order", 500);
    }

    // Clear cart
    cart.items = [];
    await cart.save({ session });

    // Commit transaction
    await session.commitTransaction();

    console.log(
      `✅ Order created successfully: ${createdOrder._id}, Order Number: ${createdOrder.orderNumber}`
    );

    // Send emails (outside transaction)
    try {
      await sendOrderReceivedEmail(createdOrder);
      await sendOrderNotificationToAdmin(createdOrder);
      console.log(`📧 Emails sent for order: ${createdOrder.orderNumber}`);
    } catch (emailError) {
      console.error("⚠️ Email sending failed:", emailError);
      // Don't throw - order was already created successfully
    }

    return createdOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
