import ApiError from "../../utils/apiError";
import Inventory from "./inventory.model";
import { IInventory } from "./inventory.interface";
import Booking from "../../modules/Bookings/booking.model";
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
  }).select("items createdAt status");

  for (const booking of expiredBookings) {
    // Process each item in the booking
    for (const item of booking.items) {
      const productId = toObjectId(item.product);

      // Return inventory to 'available' and detach this booking reference
      await Inventory.updateMany(
        {
          product: productId,
          date: { $gte: item.startDate, $lte: item.endDate },
        },
        {
          $set: { status: "available" },
          $pull: { bookings: booking._id }, // harmless if 'bookings' field doesn't exist
        }
      );
    }

    // Delete the expired booking
    await Booking.findByIdAndDelete(booking._id);
  }

  return expiredBookings.length;
};

// New function to update inventory when booking is created
export const updateInventoryForBooking = async (
  booking: any,
  action: "reserve" | "release"
) => {
  try {
    for (const item of booking.items) {
      const productId = toObjectId(item.product);
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);

      // Generate dates array for the booking period
      const dates = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const date of dates) {
        // Find or create inventory item
        let inventoryItem = await Inventory.findOne({
          product: productId,
          date,
        });

        if (!inventoryItem) {
          // Create new inventory item if it doesn't exist
          inventoryItem = await Inventory.create({
            product: productId,
            date,
            quantity: 1,
            status: action === "reserve" ? "booked" : "available",
            bookings: action === "reserve" ? [booking._id] : [],
          });
        } else {
          // Update existing inventory item
          if (action === "reserve") {
            // Reserve inventory
            inventoryItem.status = "booked";
            inventoryItem.bookings = inventoryItem.bookings || [];
            if (!inventoryItem.bookings.includes(booking._id)) {
              inventoryItem.bookings.push(booking._id);
            }
          } else {
            // Release inventory
            inventoryItem.status = "available";
            inventoryItem.bookings = (inventoryItem.bookings || []).filter(
              (b) => b.toString() !== booking._id.toString()
            );
          }
          await inventoryItem.save();
        }
      }
    }
  } catch (error) {
    console.error("Error updating inventory for booking:", error);
    throw error;
  }
};

// Function to check availability for multiple products
export const checkBulkAvailability = async (
  items: Array<{
    productId: string;
    startDate: Date;
    endDate: Date;
    quantity: number;
  }>
) => {
  const availabilityResults = [];

  for (const item of items) {
    const productId = toObjectId(item.productId);
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);

    // Get all inventory items for this product and date range
    const inventoryItems = await Inventory.find({
      product: productId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Check if all required dates have available inventory
    const dates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let isAvailable = true;
    const unavailableDates = [];

    for (const date of dates) {
      const inventoryForDate = inventoryItems.find(
        (inv) => inv.date.toDateString() === date.toDateString()
      );

      if (!inventoryForDate || inventoryForDate.status !== "available") {
        isAvailable = false;
        unavailableDates.push(date);
      }
    }

    availabilityResults.push({
      productId: item.productId,
      startDate,
      endDate,
      quantity: item.quantity,
      isAvailable,
      unavailableDates,
      message: isAvailable
        ? "Product is available for the selected dates"
        : `Product is unavailable for dates: ${unavailableDates
            .map((d) => d.toDateString())
            .join(", ")}`,
    });
  }

  return availabilityResults;
};

// Function to get inventory overview for a product
export const getProductInventoryOverview = async (
  productId: string,
  startDate: Date,
  endDate: Date
) => {
  const inventoryItems = await Inventory.find({
    product: productId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toDateString();
    const inventoryForDate = inventoryItems.find(
      (inv) => inv.date.toDateString() === dateStr
    );

    dates.push({
      date: new Date(currentDate),
      status: inventoryForDate?.status || "available",
      quantity: inventoryForDate?.quantity || 1,
      bookings: inventoryForDate?.bookings || [],
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    productId,
    startDate,
    endDate,
    totalDays: dates.length,
    availableDays: dates.filter((d) => d.status === "available").length,
    bookedDays: dates.filter((d) => d.status === "booked").length,
    dates,
  };
};
