import Category from "../Category/category.model";
import Product, { IProductModel } from "./product.model";
import ApiError from "../../utils/apiError";
import { ObjectId, Types } from "mongoose";
import {
  CreateProductData,
  DeepPartial,
  IProduct,
  UpdateProductData,
} from "./product.interface";
import { deleteFromCloudinary } from "../../utils/cloudinary.util";
import Booking from "../../modules/Bookings/booking.model";

const AVAILABLE_PRODUCT_FILTER = {
  active: true,
  stock: { $gt: 0 },
};

// =========================
// CREATE PRODUCT
// =========================

export const createProduct = async (
  productData: any,
): Promise<IProductModel> => {
  // Validate categories
  if (!productData.categories || productData.categories.length === 0) {
    throw new ApiError("At least one category is required", 400);
  }
  const categoryIds = productData.categories.map(
    (id: string) => new Types.ObjectId(id),
  );
  const categories = await Category.find({
    _id: { $in: categoryIds },
    isActive: true,
  });
  if (categories.length !== categoryIds.length) {
    throw new ApiError("One or more categories are invalid or inactive", 400);
  }

  // Ensure required nested fields have defaults
  const now = new Date();
  const product = await Product.create({
    ...productData,
    categories: categoryIds,
    dimensions: {
      length: productData.dimensions?.length || 1,
      width: productData.dimensions?.width || 1,
      height: productData.dimensions?.height || 1,
    },
    ageRange: {
      min: productData.ageRange?.min ?? 0,
      max: productData.ageRange?.max ?? 0,
      unit: productData.ageRange?.unit || "years",
    },
    location: {
      country: productData.location?.country || "Bangladesh",
      state: productData.location?.state || "Unknown",
      city: productData.location?.city || "Unknown",
    },
    safetyFeatures: productData.safetyFeatures?.length
      ? productData.safetyFeatures
      : ["Standard safety"],
    qualityAssurance: {
      isCertified: productData.qualityAssurance?.isCertified ?? false,
      certification: productData.qualityAssurance?.certification || "",
      warrantyPeriod: productData.qualityAssurance?.warrantyPeriod || "",
      warrantyDetails: productData.qualityAssurance?.warrantyDetails || "",
    },
    images: productData.images || [],
    imageCover: productData.imageCover || "",
    availableFrom: productData.availableFrom
      ? new Date(productData.availableFrom)
      : now,
    availableUntil: productData.availableUntil
      ? new Date(productData.availableUntil)
      : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    active: productData.active ?? true,
    stock: productData.stock ?? 0,
    deliveryTimeOptions: productData.deliveryTimeOptions || [
      "8am-12pm",
      "12pm-4pm",
      "4pm-8pm",
    ],
    collectionTimeOptions: productData.collectionTimeOptions || [
      "before_5pm",
      "after_5pm",
      "next_day",
    ],
    defaultDeliveryTime: productData.defaultDeliveryTime || "8am-12pm",
    defaultCollectionTime: productData.defaultCollectionTime || "before_5pm",
    deliveryTimeFee: productData.deliveryTimeFee ?? 0,
    collectionTimeFee: productData.collectionTimeFee ?? 0,
  });

  await product.populate({
    path: "categories",
    select: "name slug description image",
  });

  return product;
};

export const updateProductService = async (
  productId: string,
  updateData: any,
): Promise<IProductModel> => {
  // -------------------------
  // Validate product ID
  // -------------------------
  if (!Types.ObjectId.isValid(productId))
    throw new ApiError("Invalid product ID", 400);

  const product = await Product.findById(productId);
  if (!product) throw new ApiError("Product not found", 404);

  // -------------------------
  // Remove forbidden fields
  // -------------------------
  const forbiddenFields: string[] = ["_id", "createdAt", "updatedAt"];
  forbiddenFields.forEach((field) => delete updateData[field]);

  // -------------------------
  // Parse nested JSON strings (from form-data)
  // -------------------------
  const parseNested = (field: any) => {
    if (!field) return undefined;
    if (typeof field === "string") {
      try {
        const parsed = JSON.parse(field);
        if (typeof parsed === "object" && parsed !== null) return parsed;
        return field; // fallback if parsed value is primitive
      } catch {
        return field; // leave as-is if not valid JSON
      }
    }
    return field; // already an object
  };

  updateData.dimensions = parseNested(updateData.dimensions);
  updateData.ageRange = parseNested(updateData.ageRange);
  updateData.location = parseNested(updateData.location);
  updateData.qualityAssurance = parseNested(updateData.qualityAssurance);

  // -------------------------
  // Flatten nested objects for MongoDB $set
  // -------------------------
  const flatten = (obj: any, prefix = ""): any => {
    const flat: any = {};
    Object.keys(obj || {}).forEach((key) => {
      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        Object.assign(flat, flatten(value, path));
      } else if (value !== undefined) {
        flat[path] = value; // skip undefined fields
      }
    });
    return flat;
  };

  const update = flatten(updateData);

  // -------------------------
  // Apply update
  // -------------------------
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { $set: update },
    { new: true, runValidators: true },
  ).populate("categories", "name slug description image");

  if (!updatedProduct) throw new ApiError("Failed to update product", 500);

  return updatedProduct;
};

/* =========================
   UPDATE PRODUCT WITH CLOUDINARY
========================= */

// Flatten nested objects for $set
const flattenForUpdate = (obj: any, prefix = ""): any => {
  const flattened: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(flattened, flattenForUpdate(value, path));
    } else {
      flattened[path] = value;
    }
  });
  return flattened;
};
//
// type ForbiddenFields = "_id" | "createdAt" | "updatedAt";
//
// export const updateProductService = async (
//   productId: string,
//   updateData: Partial<IProduct>,
// ): Promise<IProduct> => {
//   if (!Types.ObjectId.isValid(productId))
//     throw new ApiError("Invalid product id", 400);
//
//   const product = await Product.findById(productId);
//   if (!product) throw new ApiError("Product not found", 404);
//
//   // Remove forbidden fields
//   const cleanData = { ...updateData };
//   delete cleanData._id;
//   delete cleanData.createdAt;
//   delete cleanData.updatedAt;
//
//   // Flatten nested objects (location, dimensions, ageRange, qualityAssurance, etc.)
//   const update = flattenForUpdate(cleanData);
//
//   // Automatically set topPickUpdatedAt
//   if (updateData.isTopPick) update.topPickUpdatedAt = new Date();
//
//   const updatedProduct = await Product.findByIdAndUpdate(
//     productId,
//     { $set: update },
//     { new: true, runValidators: true },
//   ).lean(); // return plain JS object
//
//   if (!updatedProduct) throw new ApiError("Failed to update product", 500);
//
//   return updatedProduct;
// };

/* =========================
   GET BOOKED DATES FOR A SINGLE PRODUCT
========================= */
const getBookedDatesForProduct = async (productId: string): Promise<any[]> => {
  try {
    if (!Types.ObjectId.isValid(productId)) {
      return [];
    }

    const objectId = new Types.ObjectId(productId);

    const bookings = await Booking.find({
      "items.product": objectId,
      status: { $nin: ["cancelled", "completed"] },
    })
      .select("bookingNumber status bookedDates items startDate endDate")
      .lean();

    if (!bookings || bookings.length === 0) {
      return [];
    }

    const bookedDates = [];

    for (const booking of bookings) {
      if (booking.bookedDates && Array.isArray(booking.bookedDates)) {
        for (const bd of booking.bookedDates) {
          const item = booking.items?.find(
            (item, index) => index === bd.itemIndex,
          );

          if (item && item.product.toString() === productId) {
            bookedDates.push({
              date: bd.date,
              bookingId: booking._id,
              bookingNumber: booking.bookingNumber,
              status: booking.status,
              quantity: bd.quantity || item.quantity || 0,
              itemIndex: bd.itemIndex,
            });
          }
        }
      } else {
        for (const item of booking.items || []) {
          if (item.product.toString() === productId) {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const duration = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            );

            for (let i = 0; i < duration; i++) {
              const date = new Date(start);
              date.setDate(date.getDate() + i);

              bookedDates.push({
                date,
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                status: booking.status,
                quantity: item.quantity || 0,
              });
            }
          }
        }
      }
    }

    const uniqueDates = [];
    const seen = new Set();

    for (const bd of bookedDates) {
      const key = `${
        bd.date.toISOString().split("T")[0]
      }-${bd.bookingId.toString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDates.push(bd);
      }
    }

    return uniqueDates.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  } catch (error) {
    console.error(`Error in getBookedDatesForProduct for ${productId}:`, error);
    return [];
  }
};

/* =========================
   GET BOOKED DATES FOR MULTIPLE PRODUCTS
========================= */
export const getBookedDatesForProducts = async (
  productIds: string[],
): Promise<{ [productId: string]: any[] }> => {
  try {
    if (!productIds || productIds.length === 0) {
      return {};
    }

    const objectIds = productIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (objectIds.length === 0) {
      return {};
    }

    const aggregation = await Booking.aggregate([
      {
        $match: {
          "items.product": { $in: objectIds },
          status: { $nin: ["cancelled", "completed"] },
        },
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.product": { $in: objectIds },
        },
      },
      {
        $project: {
          bookingId: "$_id",
          bookingNumber: 1,
          status: 1,
          createdAt: 1,
          productId: "$items.product",
          quantity: "$items.quantity",
          startDate: "$items.startDate",
          endDate: "$items.endDate",
          bookedDates: {
            $cond: {
              if: { $isArray: "$bookedDates" },
              then: "$bookedDates",
              else: [],
            },
          },
        },
      },
      { $unwind: { path: "$bookedDates", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          effectiveDate: {
            $cond: {
              if: { $ne: ["$bookedDates.date", null] },
              then: "$bookedDates.date",
              else: "$startDate",
            },
          },
          effectiveQuantity: {
            $cond: {
              if: { $ne: ["$bookedDates.quantity", null] },
              then: "$bookedDates.quantity",
              else: "$quantity",
            },
          },
        },
      },
      {
        $group: {
          _id: "$productId",
          bookedDates: {
            $push: {
              bookingId: "$bookingId",
              bookingNumber: "$bookingNumber",
              status: "$status",
              date: "$effectiveDate",
              quantity: "$effectiveQuantity",
            },
          },
        },
      },
    ]);

    const result: { [productId: string]: any[] } = {};

    aggregation.forEach((item) => {
      const productId = item._id.toString();

      const datesMap = new Map();

      item.bookedDates.forEach((bd: any) => {
        if (!bd.date) return;

        const dateStr = bd.date.toISOString().split("T")[0];
        const key = `${dateStr}-${bd.bookingId}`;

        if (!datesMap.has(key)) {
          datesMap.set(key, {
            date: bd.date,
            bookingId: bd.bookingId,
            bookingNumber: bd.bookingNumber,
            status: bd.status,
            quantity: 0,
          });
        }

        datesMap.get(key).quantity += bd.quantity || 0;
      });

      result[productId] = Array.from(datesMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });

    productIds.forEach((id) => {
      if (!result[id]) {
        result[id] = [];
      }
    });

    return result;
  } catch (error) {
    console.error("Error in getBookedDatesForProducts:", error);

    const result: { [productId: string]: any[] } = {};

    for (const productId of productIds) {
      try {
        result[productId] = await getBookedDatesForProduct(productId);
      } catch (err) {
        console.error(`Error getting dates for product ${productId}:`, err);
        result[productId] = [];
      }
    }

    return result;
  }
};

/* =========================
   GET PRODUCT AVAILABILITY
========================= */
const getProductAvailability = async (
  productId: string,
  daysAhead: number = 30,
): Promise<
  Array<{
    date: string;
    isAvailable: boolean;
    bookedQuantity?: number;
    availableQuantity?: number;
  }>
> => {
  try {
    const product = await Product.findById(productId).select("stock").lean();
    const totalStock = product?.stock || 0;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const bookings = await Booking.find({
      "items.product": new Types.ObjectId(productId),
      status: { $nin: ["cancelled", "completed"] },
      $or: [
        { "items.startDate": { $lte: endDate } },
        { "items.endDate": { $gte: startDate } },
      ],
    })
      .select("items bookedDates")
      .lean();

    const availability = [];

    for (let i = 0; i < daysAhead; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      let bookedQuantity = 0;

      bookings.forEach((booking) => {
        if (booking.bookedDates && booking.bookedDates.length > 0) {
          booking.bookedDates.forEach((bd) => {
            const bookedDate = new Date(bd.date);
            bookedDate.setHours(0, 0, 0, 0);

            if (bookedDate.getTime() === currentDate.getTime()) {
              bookedQuantity += bd.quantity || 0;
            }
          });
        } else {
          booking.items?.forEach((item) => {
            if (item.product.toString() === productId) {
              const itemStart = new Date(item.startDate);
              itemStart.setHours(0, 0, 0, 0);
              const itemEnd = new Date(item.endDate);
              itemEnd.setHours(23, 59, 59, 999);

              if (currentDate >= itemStart && currentDate <= itemEnd) {
                bookedQuantity += item.quantity || 0;
              }
            }
          });
        }
      });

      availability.push({
        date: currentDate.toISOString().split("T")[0],
        isAvailable: bookedQuantity < totalStock,
        bookedQuantity,
        availableQuantity: totalStock - bookedQuantity,
      });
    }

    return availability;
  } catch (error) {
    console.error("Error calculating availability:", error);
    return [];
  }
};

/* =========================
   GET ALL PRODUCTS WITH BOOKED DATES
========================= */
export const getAllProducts = async (
  page: number = 1,
  limit: number = 10,
  state?: string,
  category?: string,
  minPrice?: number,
  maxPrice?: number,
  search?: string,
  sortBy: "price" | "createdAt" | "name" = "createdAt", // ← added
  sortOrder: "asc" | "desc" = "asc", // ← added
): Promise<{
  products: IProductModel[];
  total: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;

  // Build filter object
  const filter: any = { ...AVAILABLE_PRODUCT_FILTER };

  // 🔍 Product name search
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  // 📍 State filter
  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }

  // 🗂 Category filter
  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  // 💰 Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // ── Dynamic sorting ───────────────────────────────────────
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 }; // default: newest first

  if (sortBy === "price") {
    sortObj = { price: sortOrder === "asc" ? 1 : -1 };
  } else if (sortBy === "name") {
    sortObj = { name: sortOrder === "asc" ? 1 : -1 };
  } else if (sortBy === "createdAt") {
    sortObj = { createdAt: sortOrder === "asc" ? 1 : -1 };
  }

  // 📦 Fetch products
  const products = await Product.find(filter)
    .populate("categories", "name description")
    .select("-__v")
    .sort(sortObj) // ← dynamic sort applied here
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Product.countDocuments(filter);

  // 📅 Booking + availability enrichment
  const productsWithBookedDates = await Promise.all(
    products.map(async (product: any) => {
      const bookedDates = await getBookedDatesForProduct(
        product._id.toString(),
      );
      const availability = await getProductAvailability(
        product._id.toString(),
        30,
      );

      return {
        ...product,
        bookedDates: bookedDates.map((bd) => ({
          date: bd.date,
          bookingId: bd.bookingId,
          bookingNumber: bd.bookingNumber,
          status: bd.status,
          quantity: bd.quantity,
        })),
        availability: {
          bookedCount: bookedDates.length,
          next30Days: availability,
          isAvailable: bookedDates.length === 0,
        },
        images: product.images || [],
        discount: product.discount || 0,
        discountPrice:
          product.price - (product.price * (product.discount || 0)) / 100,
        dimensions: product.dimensions || {
          length: 0,
          width: 0,
          height: 0,
        },
        _id: product._id,
        id: product._id.toString(),
      };
    }),
  );

  return {
    products: productsWithBookedDates as IProductModel[],
    total,
    pages: Math.ceil(total / limit),
  };
};

/* =========================
   GET PRODUCT BY ID WITH BOOKED DATES
========================= */
export const getProductById = async (productId: string): Promise<any> => {
  // Change return type to 'any' or create proper type
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findOne({
    _id: productId,
    ...AVAILABLE_PRODUCT_FILTER,
  })
    .populate("categories", "name description")
    .populate({
      path: "frequentlyBoughtTogether.productId",
      select: "name price imageCover stock active discount dimensions",
      match: { active: true, stock: { $gt: 0 } },
    })
    .select("-__v")
    .lean();

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  const bookedDates = await getBookedDatesForProduct(productId);
  const availability = await getProductAvailability(productId, 30);
  const recentBookings = await Booking.find({
    "items.product": new Types.ObjectId(productId),
    status: { $nin: ["cancelled"] },
  })
    .select("bookingNumber status totalAmount createdAt items")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Calculate total booked quantity
  const totalBookedQuantity = bookedDates.reduce(
    (sum, bd) => sum + bd.quantity,
    0,
  );
  const totalStock = product.stock || 0;
  const availableStock = Math.max(0, totalStock - totalBookedQuantity);

  // Return as plain object with proper types
  return {
    ...product,
    bookedDates: bookedDates.map((bd) => ({
      date: bd.date,
      bookingId: bd.bookingId,
      bookingNumber: bd.bookingNumber,
      status: bd.status,
      quantity: bd.quantity,
    })),
    availability: {
      bookedCount: bookedDates.length,
      next30Days: availability,
      totalStock,
      availableStock,
      isAvailable: availableStock > 0,
    },
    recentBookings: recentBookings.map((rb) => ({
      bookingNumber: rb.bookingNumber,
      status: rb.status,
      totalAmount: rb.totalAmount,
      createdAt: rb.createdAt,
      itemCount: rb.items?.length || 0,
    })),
    images: product.images || [],
    discount: product.discount || 0,
    discountPrice: product.discount
      ? product.price - (product.price * product.discount) / 100
      : product.price,
    dimensions: product.dimensions || {
      length: 0,
      width: 0,
      height: 0,
    },
    _id: product._id,
    id: product._id.toString(),
  };
};

/* =========================
   SOFT DELETE PRODUCT
========================= */
export const deleteProduct = async (productId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { active: false },
    { new: true },
  );

  if (!product) {
    throw new ApiError("Product not found", 404);
  }
};

/* =========================
   PRODUCTS BY STATE
========================= */
export const getProductsByState = async (
  state: string,
): Promise<IProductModel[]> => {
  return Product.find({
    ...AVAILABLE_PRODUCT_FILTER,
    "location.state": { $regex: state, $options: "i" },
  }).populate("categories", "name description");
};

/* =========================
   AVAILABLE STATES
========================= */
export const getAvailableStates = async (): Promise<string[]> => {
  const states = await Product.distinct("location.state", {
    ...AVAILABLE_PRODUCT_FILTER,
  });

  return states.sort();
};

/* =========================
   UPDATE STOCK
========================= */
export const updateProductStock = async (
  productId: string,
  newStock: number,
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  if (newStock < 0) {
    throw new ApiError("Stock cannot be negative", 400);
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { stock: newStock },
    { new: true, runValidators: true },
  ).populate("categories", "name description");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

/* =========================
   FEATURED PRODUCTS
========================= */
export const getFeaturedProducts = async (
  limit = 8,
): Promise<IProductModel[]> => {
  return Product.find({ ...AVAILABLE_PRODUCT_FILTER })
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* =========================
   SEARCH PRODUCTS
========================= */
export const searchProducts = async (
  query: string,
  page = 1,
  limit = 10,
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const filter = {
    ...AVAILABLE_PRODUCT_FILTER,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { summary: { $regex: query, $options: "i" } },
      { "location.state": { $regex: query, $options: "i" } },
      { "location.city": { $regex: query, $options: "i" } },
    ],
  };

  const products = await Product.find(filter)
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
  };
};

/* =========================
   PRODUCTS BY CATEGORY
========================= */
export const getProductsByCategory = async (
  categoryId: string,
  page = 1,
  limit = 10,
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  if (!Types.ObjectId.isValid(categoryId)) {
    throw new ApiError("Invalid category ID", 400);
  }

  const skip = (page - 1) * limit;

  const filter = {
    ...AVAILABLE_PRODUCT_FILTER,
    categories: new Types.ObjectId(categoryId),
  };

  const products = await Product.find(filter)
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
  };
};

/* =========================
   CLIENT SEARCH INTERFACE & FUNCTION
========================= */
export interface ClientSearchParams {
  category?: string;
  state?: string;
  city?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: "easy" | "medium" | "difficult";
  ageMin?: number;
  ageMax?: number;
  ageUnit?: "years" | "months";
  material?: string;
  isSensitive?: boolean;
}

export const clientSearchProducts = async (
  params: ClientSearchParams,
): Promise<{
  products: IProductModel[];
  total: number;
  pages: number;
  filters: any;
}> => {
  const {
    category,
    state,
    city,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    minPrice,
    maxPrice,
    difficulty,
    ageMin,
    ageMax,
    ageUnit = "years",
    material,
    isSensitive,
  } = params;

  const skip = (page - 1) * limit;
  const filter: any = {
    active: true,
    stock: { $gt: 0 },
  };

  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  const dateConditions = [];

  if (startDateObj && endDateObj) {
    dateConditions.push({
      availableFrom: { $lte: endDateObj },
      availableUntil: { $gte: startDateObj },
    });
  } else if (startDateObj) {
    dateConditions.push({
      availableUntil: { $gte: startDateObj },
    });
  } else if (endDateObj) {
    dateConditions.push({
      availableFrom: { $lte: endDateObj },
    });
  } else {
    const now = new Date();
    dateConditions.push({
      availableFrom: { $lte: now },
      availableUntil: { $gte: now },
    });
  }

  if (dateConditions.length > 0) {
    filter.$and = filter.$and || [];
    filter.$and.push(...dateConditions);
  }

  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }
  if (city) {
    filter["location.city"] = { $regex: city, $options: "i" };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  if (difficulty) {
    filter.difficulty = difficulty;
  }

  if (ageMin !== undefined || ageMax !== undefined) {
    const ageFilter: any = {};

    if (ageMin !== undefined) {
      ageFilter["ageRange.min"] = { $lte: ageMax !== undefined ? ageMax : 999 };
    }

    if (ageMax !== undefined) {
      ageFilter["ageRange.max"] = { $gte: ageMin !== undefined ? ageMin : 0 };
    }

    if (ageUnit) {
      ageFilter["ageRange.unit"] = ageUnit;
    }

    filter.$and = filter.$and || [];
    filter.$and.push(ageFilter);
  }

  if (material) {
    filter.material = { $regex: material, $options: "i" };
  }

  if (isSensitive !== undefined) {
    filter.isSensitive = isSensitive;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name description slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: products as IProductModel[],
    total,
    pages: Math.ceil(total / limit),
    filters: {
      applied: params,
      totalResults: total,
    },
  };
};

/* =========================
   ADMIN SEARCH INTERFACE & FUNCTION
========================= */
export interface AdminSearchParams {
  searchTerm?: string;
  productId?: string;
  active?: boolean;
  available?: boolean;
  categories?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const adminSearchProducts = async (
  params: AdminSearchParams,
): Promise<{
  products: IProductModel[];
  total: number;
  pages: number;
  filters: any;
}> => {
  const {
    searchTerm,
    productId,
    active,
    available,
    categories = [],
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const skip = (page - 1) * limit;
  const filter: any = {};

  if (productId && Types.ObjectId.isValid(productId)) {
    const product = await Product.findById(productId)
      .populate("categories", "name description slug")
      .lean();

    return {
      products: product ? [product as IProductModel] : [],
      total: product ? 1 : 0,
      pages: product ? 1 : 0,
      filters: {
        applied: { productId },
        totalResults: product ? 1 : 0,
      },
    };
  }

  if (searchTerm && searchTerm.trim()) {
    const searchRegex = { $regex: searchTerm.trim(), $options: "i" };
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { summary: searchRegex },
      { material: searchRegex },
      { design: searchRegex },
      { "location.state": searchRegex },
      { "location.city": searchRegex },
    ];
  }

  if (active !== undefined) {
    filter.active = active;
  }

  if (available !== undefined) {
    const now = new Date();
    if (available) {
      filter.$and = [
        { stock: { $gt: 0 } },
        { availableFrom: { $lte: now } },
        { availableUntil: { $gte: now } },
      ];
    } else {
      filter.$or = [
        { stock: { $lte: 0 } },
        { availableFrom: { $gt: now } },
        { availableUntil: { $lt: now } },
      ];
    }
  }

  if (categories.length > 0) {
    const validCategoryIds = categories
      .filter((cat) => Types.ObjectId.isValid(cat))
      .map((cat) => new Types.ObjectId(cat));

    if (validCategoryIds.length > 0) {
      filter.categories = { $in: validCategoryIds };
    }
  }

  const sort: any = {};
  const validSortFields = [
    "name",
    "price",
    "stock",
    "createdAt",
    "updatedAt",
    "availableFrom",
    "availableUntil",
    "difficulty",
  ];

  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sort[finalSortBy] = sortOrder === "asc" ? 1 : -1;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name description slug")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: products as IProductModel[],
    total,
    pages: Math.ceil(total / limit),
    filters: {
      applied: params,
      totalResults: total,
    },
  };
};

/* =========================
   GET AVAILABLE FILTER OPTIONS
========================= */
export const getAvailableFilters = async (): Promise<{
  states: string[];
  cities: string[];
  difficulties: string[];
  materials: string[];
  priceRange: { min: number; max: number };
}> => {
  const [states, cities, difficulties, materials, priceRange] =
    await Promise.all([
      Product.distinct("location.state", { active: true, stock: { $gt: 0 } }),
      Product.distinct("location.city", { active: true, stock: { $gt: 0 } }),
      Product.distinct("difficulty", { active: true, stock: { $gt: 0 } }),
      Product.distinct("material", { active: true, stock: { $gt: 0 } }),
      Product.aggregate([
        { $match: { active: true, stock: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
          },
        },
      ]),
    ]);

  return {
    states: states.filter(Boolean).sort(),
    cities: cities.filter(Boolean).sort(),
    difficulties: difficulties.filter(Boolean).sort(),
    materials: materials.filter(Boolean).sort(),
    priceRange: priceRange[0]
      ? {
          min: Math.floor(priceRange[0].minPrice || 0),
          max: Math.ceil(priceRange[0].maxPrice || 0),
        }
      : { min: 0, max: 0 },
  };
};

/* =========================
   TOP SELLING PRODUCTS
========================= */
export interface TopSellingParams {
  limit?: number;
  timeRange?: "day" | "week" | "month" | "year" | "all";
  category?: string;
  state?: string;
}

export const getTopSellingProducts = async (
  params: TopSellingParams,
): Promise<{
  products: IProductModel[];
  timeRange: string;
  totalRevenue: number;
  totalBookings: number;
}> => {
  const { limit = 10, timeRange = "month", category, state } = params;

  let startDate: Date | null = null;
  const now = new Date();

  switch (timeRange) {
    case "day":
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case "all":
    default:
      startDate = null;
  }

  const filter: any = {
    active: true,
    stock: { $gt: 0 },
  };

  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }

  const products = await Product.find(filter)
    .populate("categories", "name description slug")
    .sort({
      stock: -1,
      price: -1,
      createdAt: -1,
    })
    .limit(limit);

  const totalRevenue = products.reduce(
    (sum, product) => sum + product.price,
    0,
  );
  const totalBookings = Math.floor(products.length * 0.7);

  return {
    products,
    timeRange,
    totalRevenue,
    totalBookings,
  };
};

/* =========================
   MANUALLY MARK AS TOP SELLING
========================= */
export const markAsTopSelling = async (
  productId: string,
  isTopSelling: boolean = true,
  rank?: number,
  notes?: string,
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const updateData: any = {
    isTopSelling,
    topSellingRank: rank,
    topSellingNotes: notes,
    topSellingMarkedAt: new Date(),
  };

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  }).populate("categories", "name description");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

/* =========================
   TOP PICKS
========================= */
export interface TopPicksParams {
  limit?: number;
  category?: string;
}

export const getTopPicks = async (
  limit: number = 8,
): Promise<IProductModel[]> => {
  const topPicks = await Product.find({
    active: true,
    stock: { $gt: 0 },
    isTopPick: true,
  })
    .populate("categories", "name slug")
    .sort({ topPickRank: 1, createdAt: -1 })
    .limit(limit);

  if (topPicks.length < limit) {
    const featuredProducts = await Product.find({
      active: true,
      stock: { $gt: 0 },
      isTopPick: false,
      _id: { $nin: topPicks.map((p) => p._id) },
    })
      .populate("categories", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit - topPicks.length);

    return [...topPicks, ...featuredProducts];
  }

  return topPicks;
};

export const markAsTopPick = async (
  productId: string,
  isTopPick: boolean = true,
  rank?: number,
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const updateData: any = {
    isTopPick,
    topPickRank: rank,
    topPickUpdatedAt: new Date(),
  };

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  }).populate("categories", "name slug");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

/* =========================
   FREQUENTLY BOUGHT TOGETHER
========================= */
interface CartItem {
  productId: string;
  quantity: number;
}

export const getFrequentlyBoughtTogether = async (
  productIds: string[],
  limit: number = 5,
): Promise<IProductModel[]> => {
  if (!productIds || productIds.length === 0) {
    return getPopularProducts(limit);
  }

  const objectIds = productIds.map((id) => new Types.ObjectId(id));

  if (objectIds.length === 1) {
    const product = await Product.findById(objectIds[0])
      .populate({
        path: "frequentlyBoughtTogether.productId",
        match: { active: true, stock: { $gt: 0 } },
        select: "name price imageCover categories material description",
      })
      .exec();

    if (!product || !product.frequentlyBoughtTogether) {
      return getPopularProducts(limit);
    }

    const recommendations = product.frequentlyBoughtTogether
      .filter((item) => item.productId && item.productId !== null)
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, limit)
      .map((item) => {
        if (item.productId && typeof item.productId !== "string") {
          return item.productId as unknown as IProductModel;
        }
        return null;
      })
      .filter((item): item is IProductModel => item !== null);

    return recommendations;
  }

  const products = await Product.find({
    _id: { $in: objectIds },
  })
    .select("frequentlyBoughtTogether")
    .exec();

  if (products.length === 0) {
    return getPopularProducts(limit);
  }

  const recommendationScores = new Map<string, number>();

  products.forEach((product) => {
    if (product.frequentlyBoughtTogether) {
      product.frequentlyBoughtTogether.forEach((item) => {
        const itemId = item.productId.toString();

        if (objectIds.some((id) => id.toString() === itemId)) {
          return;
        }

        const currentScore = recommendationScores.get(itemId) || 0;
        recommendationScores.set(itemId, currentScore + (item.frequency || 0));
      });
    }
  });

  const sortedIds = Array.from(recommendationScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, limit)
    .map(([id]) => new Types.ObjectId(id));

  if (sortedIds.length === 0) {
    return getSimilarProducts(objectIds, limit);
  }

  const recommendedProducts = await Product.find({
    _id: { $in: sortedIds },
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name slug")
    .select("name price imageCover categories material description")
    .exec();

  return recommendedProducts;
};

/* =========================
   GET CART RECOMMENDATIONS
========================= */
export const getCartRecommendations = async (
  cartItems: CartItem[],
  limit: number = 8,
): Promise<IProductModel[]> => {
  if (!cartItems || cartItems.length === 0) {
    return getPopularProducts(limit);
  }

  const productIds = cartItems
    .map((item) => {
      try {
        return new Types.ObjectId(item.productId);
      } catch {
        return null;
      }
    })
    .filter((id): id is Types.ObjectId => id !== null);

  if (productIds.length === 0) {
    return getPopularProducts(limit);
  }

  const recommendations = await getFrequentlyBoughtTogether(
    productIds.map((id) => id.toString()),
    limit * 2,
  );

  const cartIdSet = new Set(productIds.map((id) => id.toString()));
  const filtered = recommendations.filter(
    (product) =>
      product._id &&
      typeof product._id !== "string" &&
      !cartIdSet.has(product._id.toString()),
  );

  if (filtered.length < limit) {
    const similar = await getSimilarProducts(
      productIds,
      limit - filtered.length,
    );

    const filteredIds = new Set(
      filtered
        .map((p) => p._id?.toString())
        .filter((id): id is string => id !== undefined),
    );
    const uniqueSimilar = similar.filter(
      (product) =>
        product._id &&
        !cartIdSet.has(product._id.toString()) &&
        !filteredIds.has(product._id.toString()),
    );

    filtered.push(...uniqueSimilar);
  }

  return filtered.slice(0, limit);
};

/* =========================
   RECORD PURCHASE FOR ANALYTICS
========================= */
export const recordPurchase = async (productIds: string[]): Promise<void> => {
  if (productIds.length < 2) {
    return;
  }

  const objectIds = productIds.map((id) => new Types.ObjectId(id));
  const batchUpdates: Promise<any>[] = [];

  for (let i = 0; i < objectIds.length; i++) {
    for (let j = i + 1; j < objectIds.length; j++) {
      const productA = objectIds[i];
      const productB = objectIds[j];

      batchUpdates.push(updatePurchasePair(productA, productB));
      batchUpdates.push(updatePurchasePair(productB, productA));
    }
  }

  await Promise.all(batchUpdates);

  setTimeout(() => {
    objectIds.forEach((id) =>
      recalculateFrequentlyBought(id).catch(console.error),
    );
  }, 0);
};

/* =========================
   CREATE FREQUENTLY BOUGHT RELATIONSHIPS
========================= */
export const createFrequentlyBoughtRelationships = async (
  productIds: string[],
  productUpdates?: { [productId: string]: any },
): Promise<IProductModel[]> => {
  const validProductIds = productIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (validProductIds.length < 2) {
    throw new ApiError("At least 2 valid product IDs are required", 400);
  }

  const existingProducts = await Product.find({
    _id: { $in: validProductIds },
  }).select("_id name active");

  if (existingProducts.length !== validProductIds.length) {
    throw new ApiError("One or more products not found", 404);
  }

  const inactiveProducts = existingProducts.filter((p) => !p.active);
  if (inactiveProducts.length > 0) {
    const inactiveNames = inactiveProducts.map((p) => p.name).join(", ");
    throw new ApiError(`Some products are inactive: ${inactiveNames}`, 400);
  }

  const updatePromises = validProductIds.map(async (currentProductId) => {
    const otherProductIds = validProductIds.filter(
      (id) => !id.equals(currentProductId),
    );

    const frequentlyBoughtTogether = otherProductIds.map((id) => ({
      productId: id,
      frequency: 0.5,
      confidence: 0.4,
      addedAt: new Date(),
    }));

    const updateData: any = {
      frequentlyBoughtTogether,
      updatedAt: new Date(),
    };

    if (productUpdates && productUpdates[currentProductId.toString()]) {
      Object.assign(updateData, productUpdates[currentProductId.toString()]);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      currentProductId,
      updateData,
      { new: true, runValidators: true },
    ).populate({
      path: "frequentlyBoughtTogether.productId",
      select: "name price imageCover stock active discount dimensions images",
      match: { active: true },
    });

    if (!updatedProduct) {
      throw new ApiError(
        `Product ${currentProductId} not found after update`,
        404,
      );
    }

    return updatedProduct;
  });

  const updatedProducts = await Promise.all(updatePromises);

  await Promise.all(
    validProductIds.map(async (productId) => {
      await updatePurchaseHistoryForFrequentlyBought(
        productId,
        validProductIds,
      );
    }),
  );

  return updatedProducts;
};

/* =========================
   GET ALL FREQUENT RELATIONSHIPS
========================= */
export const getAllFrequentRelationships = async (): Promise<
  Array<{
    productId: string;
    productName: string;
    frequentlyBought: Array<{
      productId: string;
      productName: string;
      price: number;
      imageCover: string;
    }>;
  }>
> => {
  const products = await Product.find({
    "frequentlyBoughtTogether.0": { $exists: true },
    active: true,
  })
    .populate({
      path: "frequentlyBoughtTogether.productId",
      select: "name price imageCover",
      match: { active: true, stock: { $gt: 0 } },
    })
    .select("name frequentlyBoughtTogether")
    .lean()
    .exec();

  const result = products
    .map((product) => ({
      productId: product._id?.toString() || "",
      productName: product.name || "",
      frequentlyBought: (product.frequentlyBoughtTogether || [])
        .filter((item) => item.productId && typeof item.productId === "object")
        .map((item) => ({
          productId: (item.productId as any)?._id?.toString() || "",
          productName: (item.productId as any)?.name || "",
          price: (item.productId as any)?.price || 0,
          imageCover: (item.productId as any)?.imageCover || "",
        }))
        .filter((item) => item.productId && item.productName),
    }))
    .filter((product) => product.frequentlyBought.length > 0);

  return result;
};

/* =========================
   HELPER FUNCTIONS
========================= */

const getPopularProducts = async (limit: number): Promise<IProductModel[]> => {
  return Product.find({
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name slug")
    .sort({
      createdAt: -1,
      price: -1,
    })
    .limit(limit)
    .select("name price imageCover categories material description")
    .exec();
};

const getSimilarProducts = async (
  productIds: Types.ObjectId[],
  limit: number,
): Promise<IProductModel[]> => {
  const products = await Product.find({
    _id: { $in: productIds },
  })
    .select("categories price material")
    .exec();

  const categoryIds = products.flatMap((p) => p.categories);
  const uniqueCategoryIds = [
    ...new Set(categoryIds.map((id) => id.toString())),
  ].map((id) => new Types.ObjectId(id));

  if (uniqueCategoryIds.length === 0) {
    return [];
  }

  return Product.find({
    _id: { $nin: productIds },
    categories: { $in: uniqueCategoryIds },
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name slug")
    .limit(limit)
    .select("name price imageCover categories material description")
    .exec();
};

const updatePurchasePair = async (
  productId: Types.ObjectId,
  relatedId: Types.ObjectId,
): Promise<void> => {
  await Product.updateOne(
    { _id: productId },
    {
      $push: {
        purchaseHistory: {
          $each: [
            {
              productId: relatedId,
              count: 1,
              lastPurchased: new Date(),
            },
          ],
          $sort: { lastPurchased: -1 },
          $slice: 100,
        },
      },
    },
  ).exec();
};

const recalculateFrequentlyBought = async (
  productId: Types.ObjectId,
): Promise<void> => {
  const product = await Product.findById(productId)
    .select("purchaseHistory")
    .exec();

  if (!product || !product.purchaseHistory) {
    return;
  }

  const frequencyMap = new Map<string, number>();
  let totalCount = 0;

  product.purchaseHistory.forEach((item) => {
    const id = item.productId.toString();
    const current = frequencyMap.get(id) || 0;
    frequencyMap.set(id, current + item.count);
    totalCount += item.count;
  });

  const frequentlyBought = Array.from(frequencyMap.entries())
    .map(([id, count]) => {
      const frequency = totalCount > 0 ? count / totalCount : 0;
      const confidence = calculateConfidence(count, totalCount);

      return {
        productId: new Types.ObjectId(id),
        frequency,
        confidence,
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  await Product.updateOne(
    { _id: productId },
    { frequentlyBoughtTogether: frequentlyBought },
  ).exec();
};

const calculateConfidence = (count: number, total: number): number => {
  if (total < 5) return 0.3;
  if (total < 20) return 0.6;
  return Math.min(0.95, (count / total) * 1.2);
};

const updatePurchaseHistoryForFrequentlyBought = async (
  productId: Types.ObjectId,
  relatedProductIds: Types.ObjectId[],
): Promise<void> => {
  const otherProductIds = relatedProductIds.filter(
    (id) => !id.equals(productId),
  );

  for (const relatedId of otherProductIds) {
    await Product.findByIdAndUpdate(productId, {
      $push: {
        purchaseHistory: {
          $each: [
            {
              productId: relatedId,
              count: 3,
              lastPurchased: new Date(),
            },
          ],
          $sort: { lastPurchased: -1 },
          $slice: 100,
        },
      },
    });
  }
};
