import Inventory from "../../modules/Inventory/inventory.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import Order from "../../modules/Order/order.model"; // Import your Order model
import Product from "../Product/product.model"; // Import your Product model

/* ---------------------------------- */
/* CREATE INVENTORY ITEM               */
/* ---------------------------------- */
export const createInventoryItem = async (inventoryData: any) => {
  console.log("🛠️ Creating inventory item:", inventoryData);

  // Ensure nested objects are parsed correctly
  const parseNested = (obj: any) => {
    if (!obj) return undefined;
    if (typeof obj === "string") {
      try {
        return JSON.parse(obj);
      } catch {
        return obj;
      }
    }
    return obj;
  };

  inventoryData.dimensions = parseNested(inventoryData.dimensions);

  const inventoryItem = await Inventory.create(inventoryData);
  console.log("✅ Inventory created:", inventoryItem._id);
  return inventoryItem;
};

/* ---------------------------------- */
/* UPDATE INVENTORY ITEM               */
/* ---------------------------------- */
export const updateInventoryItem = async (id: string, updateData: any) => {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("Invalid ID", 400);

  // Parse nested fields if passed as strings
  const parseNested = (obj: any) => {
    if (!obj) return undefined;
    if (typeof obj === "string") {
      try {
        return JSON.parse(obj);
      } catch {
        return obj;
      }
    }
    return obj;
  };

  if (updateData.dimensions)
    updateData.dimensions = parseNested(updateData.dimensions);

  const forbiddenFields = ["_id", "createdAt", "updatedAt"];
  forbiddenFields.forEach((f) => delete updateData[f]);

  const flatten = (obj: any, prefix = ""): any => {
    const flat: any = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        Object.assign(flat, flatten(value, path));
      } else {
        flat[path] = value;
      }
    });
    return flat;
  };

  const update = flatten(updateData);

  const updatedItem = await Inventory.findByIdAndUpdate(
    id,
    { $set: update },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedItem) throw new ApiError("Inventory not found", 404);
  return updatedItem;
};

/* ---------------------------------- */
/* GET SINGLE INVENTORY ITEM           */
/* ---------------------------------- */
export const getInventoryItem = async (id: string) => {
  const inventoryItem = await Inventory.findById(id);
  if (!inventoryItem) throw new ApiError("Inventory not found", 404);
  return inventoryItem;
};

export const getBookedInventory = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  warehouse?: string,
) => {
  const query: any = {
    productName: { $regex: productId, $options: "i" },
    status: "booked",
    "bookedDates.startDate": { $lte: endDate },
    "bookedDates.endDate": { $gte: startDate },
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

  return await Inventory.find(query);
};

/* ---------------------------------- */
/* GET INVENTORY ITEMS WITH FILTER     */
/* ---------------------------------- */
export const getInventoryItems = async (
  filter: any = {},
  startDate?: Date,
  endDate?: Date,
) => {
  const query: any = { ...filter, quantity: { $gt: 0 } };

  if (startDate && endDate) {
    query.$or = [
      { bookedDates: { $exists: false } },
      { bookedDates: { $size: 0 } },
      {
        bookedDates: {
          $not: {
            $elemMatch: {
              startDate: { $lte: endDate },
              endDate: { $gte: startDate },
            },
          },
        },
      },
    ];
  }

  return Inventory.find(query).sort({ createdAt: -1 });
};

/* ---------------------------------- */
/* GET AVAILABLE INVENTORY             */
/* ---------------------------------- */
export const getAvailableInventory = async (
  productName: string,
  startDate: Date,
  endDate: Date,
  warehouse?: string,
) => {
  const query: any = {
    // Search by product name (optional: you might prefer searching by productId)
    productName: { $regex: productName, $options: "i" },
    quantity: { $gt: 0 },
    status: { $ne: "maintenance" }, // Ensure we don't pick broken items
  };

  if (warehouse) query.warehouse = warehouse;

  const inventoryItems = await Inventory.find(query);

  // Filter out items that have an overlapping booking
  return inventoryItems.filter((item) => {
    // If no bookings exist, it's available
    if (!item.bookedDates || item.bookedDates.length === 0) return true;

    // Check for overlap:
    // An overlap exists if: (RequestStart <= ExistingEnd) AND (RequestEnd >= ExistingStart)
    const hasOverlap = item.bookedDates.some((booking: any) => {
      return (
        startDate <= new Date(booking.endDate) &&
        endDate >= new Date(booking.startDate)
      );
    });

    // We want items that do NOT have an overlap
    return !hasOverlap;
  });
};

/* ---------------------------------- */
/* CHECK INVENTORY AVAILABILITY        */
/* ---------------------------------- */

interface CheckAvailabilityParams {
  productName: string;
  startDate: Date;
  endDate: Date;
  requestedQuantity: number;
  warehouse?: string;
  page: number;
  limit: number;
}

export const checkInventoryAvailability = async ({
  productName,
  startDate,
  endDate,
  requestedQuantity,
  warehouse,
  page,
  limit,
}: CheckAvailabilityParams) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 1. Fetch the Master Product details first (for seasonal range)
  const masterProduct = await Product.findOne({
    name: { $regex: productName, $options: "i" },
  }).lean();

  // 2. Fetch Inventory Items (Physical Stock)
  const inventoryQuery: any = {
    productName: { $regex: productName, $options: "i" },
    status: "available", // Only count available stock
  };
  if (warehouse) inventoryQuery.warehouse = warehouse;

  const inventoryItems = await Inventory.find(inventoryQuery).lean();

  if (!inventoryItems.length) {
    throw new ApiError("No inventory found for this product name.", 404);
  }

  // 3. Fetch Blocking Orders (Confirmed/Delivered)
  const blockingOrders = await Order.find({
    productName: { $regex: productName, $options: "i" },
    status: { $in: ["confirmed", "delivered"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean();

  // 4. Generate Daily Timeline
  const availabilityTimeline = [];
  let currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const checkTime = new Date(dateStr).getTime();

    // STEP A: Check Seasonal Range (Only if Product exists in DB)
    let isWithinSeason = true;
    let seasonalReason = "Clear";

    if (
      masterProduct &&
      masterProduct.availableFrom &&
      masterProduct.availableUntil
    ) {
      const pStart = new Date(masterProduct.availableFrom).getTime();
      const pEnd = new Date(masterProduct.availableUntil).getTime();

      if (checkTime < pStart || checkTime > pEnd) {
        isWithinSeason = false;
        seasonalReason = "Outside Seasonal Range";
      }
    }

    // STEP B: Calculate Stock minus Confirmed Orders
    const totalPhysicalStock = inventoryItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    const quantityBookedToday = blockingOrders
      .filter((order) => {
        const oStart = new Date(order.startDate).setUTCHours(0, 0, 0, 0);
        const oEnd = new Date(order.endDate).setUTCHours(0, 0, 0, 0);
        return checkTime >= oStart && checkTime <= oEnd;
      })
      .reduce((sum, order) => sum + (order.quantity || 0), 0);

    const availableQuantityToday = isWithinSeason
      ? Math.max(0, totalPhysicalStock - quantityBookedToday)
      : 0;

    availabilityTimeline.push({
      date: dateStr,
      availableQuantity: availableQuantityToday,
      isAvailable:
        isWithinSeason && availableQuantityToday >= requestedQuantity,
      status: !isWithinSeason
        ? "Seasonal Block"
        : availableQuantityToday >= requestedQuantity
          ? "Available"
          : "Fully Booked",
      reason:
        seasonalReason === "Clear" && availableQuantityToday < requestedQuantity
          ? "Confirmed Bookings"
          : seasonalReason,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 5. Pagination & Final Response
  const isFullyAvailable = availabilityTimeline.every((day) => day.isAvailable);
  const skip = (page - 1) * limit;

  return {
    isAvailable: isFullyAvailable,
    productFoundInDb: !!masterProduct,
    requestedQuantity,
    period: {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    },
    timeline: availabilityTimeline,
    pagination: {
      totalItems: inventoryItems.length,
      totalPages: Math.ceil(inventoryItems.length / limit),
      currentPage: page,
      limit,
    },
    availableItems: inventoryItems.slice(skip, skip + limit),
  };
};

// Helper to clean date strings
const dateStr = (date: Date) => date.toISOString().split("T")[0];

/* ---------------------------------- */
/* DELETE INVENTORY ITEM               */
/* ---------------------------------- */
export const deleteInventoryItem = async (id: string) => {
  const inventoryItem = await Inventory.findByIdAndDelete(id);
  if (!inventoryItem) throw new ApiError("Inventory not found", 404);
  return inventoryItem;
};
