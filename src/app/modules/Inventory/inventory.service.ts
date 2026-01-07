import ApiError from "../../utils/apiError";
import Inventory from "./inventory.model";
import { IInventory } from "./inventory.interface";
import Booking from "../../modules/Bookings/booking.model";
import { Types } from "mongoose";

export const createInventoryItem = async (inventoryData: IInventory) => {
  // Check required fields
  const requiredFields = ["product", "warehouse", "vendor", "rentalFee"];
  for (const field of requiredFields) {
    if (!inventoryData[field as keyof IInventory]) {
      throw new ApiError(`${field} is required`, 400);
    }
  }

  const inventoryItem = await Inventory.create({
    ...inventoryData,
    date: inventoryData.date || new Date(),
  });

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
  endDate: Date,
  warehouse?: string
) => {
  const query: any = {
    product: productId,
    date: { $gte: startDate, $lte: endDate },
    status: "available",
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

  return await Inventory.find(query);
};

export const getBookedInventory = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  warehouse?: string
) => {
  const query: any = {
    product: productId,
    date: { $gte: startDate, $lte: endDate },
    status: "booked",
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

  return await Inventory.find(query);
};

export const checkInventoryAvailability = async (
  productId: string,
  date: Date,
  warehouse?: string
) => {
  const query: any = {
    product: productId,
    date,
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

  const inventoryItem = await Inventory.findOne(query);

  if (!inventoryItem) {
    return { available: false, quantity: 0 };
  }

  return {
    available: inventoryItem.status === "available",
    quantity: inventoryItem.quantity,
  };
};

export const releaseExpiredCartItems = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const expiredBookings = await Booking.find({
    status: "pending",
    createdAt: { $lte: thirtyMinutesAgo },
  });

  for (const booking of expiredBookings) {
    for (const item of booking.items) {
      await Inventory.updateMany(
        {
          product: item.product,
          date: { $gte: item.startDate, $lte: item.endDate },
        },
        {
          $set: { status: "available" },
          $pull: { bookings: booking._id },
        }
      );
    }

    await Booking.findByIdAndDelete(booking._id);
  }

  return expiredBookings.length;
};

export const updateInventoryForBooking = async (
  booking: any,
  action: "reserve" | "release"
) => {
  for (const item of booking.items) {
    const productId = item.product;
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);

    const dates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const date of dates) {
      let inventoryItem = await Inventory.findOne({
        product: productId,
        date,
      });

      if (!inventoryItem) {
        inventoryItem = await Inventory.create({
          product: productId,
          date,
          quantity: 1,
          status: action === "reserve" ? "booked" : "available",
          bookings: action === "reserve" ? [booking._id] : [],
          warehouse: booking.warehouse || "",
          vendor: booking.vendor || "",
          rentalFee: 0,
        });
      } else {
        if (action === "reserve") {
          inventoryItem.status = "booked";
          inventoryItem.bookings = inventoryItem.bookings || [];
          if (!inventoryItem.bookings.includes(booking._id)) {
            inventoryItem.bookings.push(booking._id);
          }
        } else {
          inventoryItem.status = "available";
          inventoryItem.bookings = (inventoryItem.bookings || []).filter(
            (b) => b.toString() !== booking._id.toString()
          );
        }
        await inventoryItem.save();
      }
    }
  }
};
