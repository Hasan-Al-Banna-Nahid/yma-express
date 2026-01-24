// import mongoose, { Types } from "mongoose";
// import Customer from "./customer.model";
// import { ICustomer } from "./customer.interface";
// import Order from "../../modules/Order/order.model";
// import User from "../Auth/user.model";
// import ApiError from "../../utils/apiError";
// import {
//   CustomerSearchFilters,
//   CustomerOrderHistory,
//   ICustomerStats,
//   PaginatedResponse,
// } from "./customer.interface";
// import { AnyARecord } from "dns";
//
// export const syncCustomerFromOrder = async (
//   userId: Types.ObjectId,
//   orderData: any,
// ): Promise<ICustomer> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//
//   try {
//     // Find existing customer
//     let customer = await Customer.findOne({ user: userId }).session(session);
//
//     const shippingAddress = orderData.shippingAddress;
//     const name = `${shippingAddress.firstName} ${shippingAddress.lastName}`;
//     const email = shippingAddress.email.toLowerCase();
//     const phone = shippingAddress.phone;
//
//     const customerData = {
//       user: userId,
//       name: name.trim(),
//       email,
//       phone,
//       address: shippingAddress.street || "",
//       city: shippingAddress.city || "",
//       postcode: shippingAddress.zipCode || "",
//       country: shippingAddress.country || "UK",
//       customerType: shippingAddress.companyName ? "corporate" : "retail",
//       notes: shippingAddress.notes || "",
//     };
//
//     if (customer) {
//       // Update existing customer
//       customer.totalOrders += 1;
//       customer.totalSpent += orderData.totalAmount || 0;
//       customer.lastOrderDate = new Date();
//
//       if (!customer.firstOrderDate) {
//         customer.firstOrderDate = new Date();
//       }
//
//       // Update contact info if not present
//       if (!customer.phone && phone) customer.phone = phone;
//       if (!customer.address && shippingAddress.street)
//         customer.address = shippingAddress.street;
//       if (!customer.city && shippingAddress.city)
//         customer.city = shippingAddress.city;
//       if (!customer.postcode && shippingAddress.zipCode)
//         customer.postcode = shippingAddress.zipCode;
//
//       // Update customer type if corporate
//       if (
//         shippingAddress.companyName &&
//         customer.customerType !== "corporate"
//       ) {
//         customer.customerType = "corporate";
//       }
//
//       await customer.save({ session });
//     } else {
//       // Create new customer
//       customer = new Customer({
//         ...customerData,
//         customerId: `CUST${Date.now().toString().slice(-8)}`,
//         totalOrders: 1,
//         totalSpent: orderData.totalAmount || 0,
//         firstOrderDate: new Date(),
//         lastOrderDate: new Date(),
//         isFavorite: false,
//         tags: ["new-customer"],
//       });
//
//       await customer.save({ session });
//     }
//
//     // Update user profile
//     await User.findByIdAndUpdate(
//       userId,
//       {
//         $set: {
//           phone: phone || undefined,
//           address: shippingAddress.street || undefined,
//           city: shippingAddress.city || undefined,
//           postcode: shippingAddress.zipCode || undefined,
//         },
//       },
//       { session },
//     );
//
//     await session.commitTransaction();
//     session.endSession();
//
//     return customer;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };
//
// export const getAllCustomers = async (
//   page: number = 1,
//   limit: number = 20,
//   filters: CustomerSearchFilters = {},
// ): Promise<PaginatedResponse<ICustomer>> => {
//   const skip = (page - 1) * limit;
//   const query: any = {};
//
//   // Apply filters
//   if (filters.search) {
//     const searchRegex = new RegExp(filters.search, "i");
//     query.$or = [
//       { name: searchRegex },
//       { email: searchRegex },
//       { phone: searchRegex },
//       { customerId: searchRegex },
//       { address: searchRegex },
//       { city: searchRegex },
//     ];
//   }
//
//   if (filters.phone) {
//     query.phone = { $regex: filters.phone, $options: "i" };
//   }
//
//   if (filters.email) {
//     query.email = filters.email.toLowerCase();
//   }
//
//   if (filters.name) {
//     query.name = { $regex: filters.name, $options: "i" };
//   }
//
//   if (filters.city) {
//     query.city = { $regex: filters.city, $options: "i" };
//   }
//
//   if (filters.postcode) {
//     query.postcode = { $regex: filters.postcode, $options: "i" };
//   }
//
//   if (filters.customerType) {
//     query.customerType = filters.customerType;
//   }
//
//   if (filters.tags && filters.tags.length > 0) {
//     query.tags = { $all: filters.tags };
//   }
//
//   if (filters.minOrders !== undefined) {
//     query.totalOrders = { $gte: filters.minOrders };
//   }
//
//   if (filters.maxOrders !== undefined) {
//     query.totalOrders = { ...query.totalOrders, $lte: filters.maxOrders };
//   }
//
//   if (filters.minSpent !== undefined) {
//     query.totalSpent = { $gte: filters.minSpent };
//   }
//
//   if (filters.maxSpent !== undefined) {
//     query.totalSpent = { ...query.totalSpent, $lte: filters.maxSpent };
//   }
//
//   if (filters.startDate) {
//     query.lastOrderDate = { $gte: filters.startDate };
//   }
//
//   if (filters.endDate) {
//     query.lastOrderDate = { ...query.lastOrderDate, $lte: filters.endDate };
//   }
//
//   if (filters.isFavorite !== undefined) {
//     query.isFavorite = filters.isFavorite;
//   }
//
//   if (filters.hasNotes !== undefined) {
//     if (filters.hasNotes) {
//       query.notes = { $exists: true, $ne: "" };
//     } else {
//       query.$or = [
//         { notes: { $exists: false } },
//         { notes: "" },
//         { notes: { $exists: true, $eq: null } },
//       ];
//     }
//   }
//
//   const [data, total] = await Promise.all([
//     Customer.find(query)
//       .sort({ lastOrderDate: -1, createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//     Customer.countDocuments(query),
//   ]);
//
//   return {
//     data,
//     total,
//     page,
//     limit,
//     pages: Math.ceil(total / limit),
//   };
// };
//
// export const getCustomerById = async (
//   customerId: string,
// ): Promise<ICustomer | null> => {
//   if (!mongoose.Types.ObjectId.isValid(customerId)) {
//     throw new ApiError("Invalid customer ID", 400);
//   }
//
//   const customer = await Customer.findById(customerId).lean();
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   return customer;
// };
//
// export const getCustomerByUserId = async (
//   userId: string,
// ): Promise<ICustomer | null> => {
//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     throw new ApiError("Invalid user ID", 400);
//   }
//
//   const customer = await Customer.findOne({ user: userId }).lean();
//   return customer;
// };
//
// export const searchCustomers = async (
//   searchTerm: string,
//   page: number = 1,
//   limit: number = 20,
// ): Promise<PaginatedResponse<ICustomer>> => {
//   if (!searchTerm || searchTerm.trim().length < 2) {
//     throw new ApiError("Search term must be at least 2 characters", 400);
//   }
//
//   const skip = (page - 1) * limit;
//   const searchRegex = new RegExp(searchTerm.trim(), "i");
//
//   const [data, total] = await Promise.all([
//     Customer.find({
//       $or: [
//         { name: searchRegex },
//         { email: searchRegex },
//         { phone: searchRegex },
//         { customerId: searchRegex },
//         { address: searchRegex },
//         { city: searchRegex },
//         { postcode: searchRegex },
//       ],
//     })
//       .sort({ lastOrderDate: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//     Customer.countDocuments({
//       $or: [
//         { name: searchRegex },
//         { email: searchRegex },
//         { phone: searchRegex },
//         { customerId: searchRegex },
//         { address: searchRegex },
//         { city: searchRegex },
//         { postcode: searchRegex },
//       ],
//     }),
//   ]);
//
//   return {
//     data,
//     total,
//     page,
//     limit,
//     pages: Math.ceil(total / limit),
//   };
// };
//
// export const getCustomerOrderHistory = async (
//   customerId: string,
// ): Promise<CustomerOrderHistory> => {
//   const customer = await Customer.findById(customerId).lean();
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   const orders = await Order.find({ user: customer.user })
//     .sort({ createdAt: -1 })
//     .populate("items.product", "name")
//     .lean();
//
//   const orderHistory = orders.map((order) => ({
//     orderId: order._id as Types.ObjectId,
//     orderNumber: order.orderNumber || "",
//     productName: order.items[0]?.name || "Multiple Items",
//     quantity: order.items.reduce(
//       (sum: any, item: any) => sum + item.quantity,
//       0,
//     ),
//     totalAmount: order.totalAmount,
//     status: order.status,
//     orderDate: order.createdAt,
//     deliveryDate: order.deliveryDate,
//   }));
//
//   const favoriteProduct =
//     orders.length > 0
//       ? orders.reduce(
//           (acc, order) => {
//             order.items.forEach((item: any) => {
//               const productName = item.name;
//               acc[productName] = (acc[productName] || 0) + 1;
//             });
//             return acc;
//           },
//           {} as Record<string, number>,
//         )
//       : {};
//
//   const favoriteProductName =
//     Object.keys(favoriteProduct).length > 0
//       ? Object.entries(favoriteProduct).sort(([, a], [, b]) => b - a)[0][0]
//       : undefined;
//
//   return {
//     customer: {
//       _id: customer._id,
//       customerId: customer.customerId,
//       name: customer.name,
//       email: customer.email,
//       phone: customer.phone,
//       address: customer.address,
//       city: customer.city,
//       postcode: customer.postcode,
//       totalOrders: customer.totalOrders,
//       totalSpent: customer.totalSpent,
//       lastOrderDate: customer.lastOrderDate,
//     },
//     orders: orderHistory,
//     stats: {
//       totalOrders: customer.totalOrders,
//       totalSpent: customer.totalSpent,
//       averageOrderValue:
//         customer.totalOrders > 0
//           ? Math.round(customer.totalSpent / customer.totalOrders)
//           : 0,
//       favoriteProduct: favoriteProductName,
//       lastOrderDate: customer.lastOrderDate,
//     },
//   };
// };
//
// export const getCustomerStats = async (): Promise<ICustomerStats> => {
//   // Set today's date for "new customers today" calculation
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const topCustomersFromDB = await Customer.find()
//     .sort({ totalSpent: -1 })
//     .limit(10)
//     .select("customerId name email totalOrders totalSpent")
//     .lean<
//       {
//         customerId: string;
//         name: string;
//         email: string;
//         totalOrders: number;
//         totalSpent: number;
//       }[]
//     >();
//
//   // Run all DB queries in parallel for performance
//   const [totalCustomers, newCustomersToday, repeatCustomers, revenueResult] =
//     await Promise.all([
//       // Total customers
//       Customer.countDocuments(),
//
//       // Customers who placed their first order today
//       Customer.countDocuments({ firstOrderDate: { $gte: today } }),
//
//       // Customers with more than 1 order
//       Customer.countDocuments({ totalOrders: { $gt: 1 } }),
//
//       // Aggregate total revenue and total orders
//       Customer.aggregate([
//         {
//           $group: {
//             _id: null,
//             totalRevenue: { $sum: "$totalSpent" },
//             totalOrders: { $sum: "$totalOrders" },
//           },
//         },
//       ]),
//
//       // Top 10 customers by spending
//       Customer.find()
//         .sort({ totalSpent: -1 })
//         .limit(10)
//         .select("customerId name email totalOrders totalSpent")
//         .lean<{
//           customerId: string;
//           name: string;
//           email: string;
//           totalOrders: number;
//           totalSpent: number;
//         }>(),
//     ]);
//
//   // Extract revenue and total orders from aggregation result
//   const totalRevenue = revenueResult[0]?.totalRevenue || 0;
//   const totalOrders = revenueResult[0]?.totalOrders || 0;
//   const averageOrderValue =
//     totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;
//
//   // Map DB result to typed topCustomers array
//   const topCustomers = topCustomersFromDB.map((customer) => ({
//     customerId: customer.customerId, // business ID (string)
//     name: customer.name,
//     email: customer.email,
//     totalOrders: customer.totalOrders,
//     totalSpent: customer.totalSpent,
//   }));
//
//   // Return fully typed ICustomerStats object
//   return {
//     totalCustomers,
//     newCustomersToday,
//     repeatCustomers,
//     totalRevenue,
//     averageOrderValue,
//     topCustomers,
//   };
// };
//
// export const updateCustomer = async (
//   customerId: string,
//   updateData: Partial<ICustomer>,
// ): Promise<ICustomer> => {
//   const allowedFields = [
//     "name",
//     "phone",
//     "address",
//     "city",
//     "postcode",
//     "country",
//     "notes",
//     "customerType",
//     "isFavorite",
//     "tags",
//   ];
//
//   const filteredData: Partial<ICustomer> = {};
//   allowedFields.forEach((field) => {
//     if (updateData[field as keyof ICustomer] !== undefined) {
//       filteredData[field as keyof ICustomer] =
//         updateData[field as keyof ICustomer];
//     }
//   });
//
//   const customer = await Customer.findByIdAndUpdate(
//     customerId,
//     { $set: filteredData },
//     { new: true, runValidators: true },
//   ).lean();
//
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   return customer;
// };
//
// export const deleteCustomer = async (customerId: string): Promise<void> => {
//   const customer = await Customer.findById(customerId);
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   // Check if customer has orders
//   const orderCount = await Order.countDocuments({ user: customer.user });
//   if (orderCount > 0) {
//     throw new ApiError(
//       "Cannot delete customer with existing orders. Archive instead.",
//       400,
//     );
//   }
//
//   await customer.deleteOne();
// };
//
// export const getCustomersByDateRange = async (
//   startDate: Date,
//   endDate: Date,
//   page: number = 1,
//   limit: number = 50,
// ): Promise<PaginatedResponse<ICustomer>> => {
//   const skip = (page - 1) * limit;
//
//   const [data, total] = await Promise.all([
//     Customer.find({
//       lastOrderDate: {
//         $gte: startDate,
//         $lte: endDate,
//       },
//     })
//       .sort({ lastOrderDate: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//     Customer.countDocuments({
//       lastOrderDate: {
//         $gte: startDate,
//         $lte: endDate,
//       },
//     }),
//   ]);
//
//   return {
//     data,
//     total,
//     page,
//     limit,
//     pages: Math.ceil(total / limit),
//   };
// };
//
// export const toggleFavorite = async (
//   customerId: string,
// ): Promise<ICustomer> => {
//   const customer = await Customer.findById(customerId);
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   customer.isFavorite = !customer.isFavorite;
//   await customer.save();
//
//   return customer.toObject();
// };
//
// export const addCustomerTag = async (
//   customerId: string,
//   tag: string,
// ): Promise<ICustomer> => {
//   const customer = await Customer.findById(customerId);
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   if (!customer.tags.includes(tag)) {
//     customer.tags.push(tag);
//     await customer.save();
//   }
//
//   return customer.toObject();
// };
//
// export const removeCustomerTag = async (
//   customerId: string,
//   tag: string,
// ): Promise<ICustomer> => {
//   const customer = await Customer.findById(customerId);
//   if (!customer) {
//     throw new ApiError("Customer not found", 404);
//   }
//
//   customer.tags = customer.tags.filter((t) => t !== tag);
//   await customer.save();
//
//   return customer.toObject();
// };
