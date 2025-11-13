import ApiError from "../utils/apiError";
import Inventory from "../models/inventory.model";
import { IInventory } from "../interfaces/inventory.interface";
import Booking from "../models/booking.model"; // <-- add this
import { Types } from "mongoose";

// Helper: normalize product to ObjectId (handles populated docs and strings)
const toObjectId = (val: any): Types.ObjectId => {
  if (val instanceof Types.ObjectId) return val;
  if (val && val._id instanceof Types.ObjectId) return val._id;
  return new Types.ObjectId(String(val));
};

export const createInventoryItem = async (inventoryData: IInventory) => {
  const existingItem = await Inventory.findOne({
    product: inventoryData.product,
    date: inventoryData.date,
  });

  if (existingItem) {
    throw new ApiError(
      "Inventory item already exists for this product and date",
      400
    );
  }

  const inventoryItem = await Inventory.create(inventoryData);
  return inventoryItem;
};

export const getInventoryItem = async (id: string) => {
  const inventoryItem = await Inventory.findById(id);
  if (!inventoryItem) {
    throw new ApiError("No inventory item found with that ID", 404);
  }
  return inventoryItem;
};

export const getInventoryItems = async (filter: any = {}) => {
  return await Inventory.find(filter);
};

export const updateInventoryItem = async (
  id: string,
  updateData: Partial<IInventory>
) => {
  const inventoryItem = await Inventory.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!inventoryItem) {
    throw new ApiError("No inventory item found with that ID", 404);
  }

  return inventoryItem;
};

export const deleteInventoryItem = async (id: string) => {
  const inventoryItem = await Inventory.findByIdAndDelete(id);

  if (!inventoryItem) {
    throw new ApiError("No inventory item found with that ID", 404);
  }

  return inventoryItem;
};

export const getAvailableInventory = async (
  productId: string,
  startDate: Date,
  endDate: Date
) => {
  return await Inventory.find({
    product: productId,
    date: { $gte: startDate, $lte: endDate },
    status: "available",
  });
};

export const getBookedInventory = async (
  productId: string,
  startDate: Date,
  endDate: Date
) => {
  return await Inventory.find({
    product: productId,
    date: { $gte: startDate, $lte: endDate },
    status: "booked",
  });
};

export const checkInventoryAvailability = async (
  productId: string,
  date: Date
) => {
  const inventoryItem = await Inventory.findOne({
    product: productId,
    date,
  });

  if (!inventoryItem) {
    return { available: false, quantity: 0 };
  }

  return {
    available: inventoryItem.status === "available",
    quantity: inventoryItem.quantity,
  };
};

export const releaseExpiredCartItems = async () => {
  // Bookings pending for more than 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Keep payload light; avoid populating heavy fields
  const expiredBookings = await Booking.find({
    status: "pending",
    createdAt: { $lte: thirtyMinutesAgo },
  }).select("_id product startDate endDate createdAt status");

  for (const booking of expiredBookings) {
    const productId = toObjectId(booking.product);

    // Return inventory to 'available' and detach this booking reference (if your schema has one)
    await Inventory.updateMany(
      {
        product: productId,
        date: { $gte: booking.startDate, $lte: booking.endDate },
      },
      {
        $set: { status: "available" },
        $pull: { bookings: booking._id }, // harmless if 'bookings' field doesn't exist
      }
    );

    // Delete the expired booking
    await Booking.findByIdAndDelete(booking._id);
  }

  return expiredBookings.length;
};
