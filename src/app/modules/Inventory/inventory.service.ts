import ApiError from "../../utils/apiError";
import Inventory from "./inventory.model";
import { IInventory } from "./inventory.interface";
import Booking from "../../modules/Bookings/booking.model";

export const createInventoryItem = async (inventoryData: IInventory) => {
  // Check required fields
  const requiredFields = [
    "product",
    "productName",
    "description",
    "dimensions",
    "images",
    "deliveryTime",
    "collectionTime",
    "rentalPrice",
    "quantity",
    "category",
    "warehouse",
    "vendor",
  ];

  for (const field of requiredFields) {
    if (!inventoryData[field as keyof IInventory]) {
      throw new ApiError(`${field} is required`, 400);
    }
  }

  // Validate dimensions
  if (
    !inventoryData.dimensions.width ||
    !inventoryData.dimensions.length ||
    !inventoryData.dimensions.height
  ) {
    throw new ApiError(
      "Width, length, and height are required in dimensions",
      400
    );
  }

  // Validate images
  if (!inventoryData.images || inventoryData.images.length === 0) {
    throw new ApiError("At least one image is required", 400);
  }

  const inventoryItem = await Inventory.create({
    ...inventoryData,
    date: inventoryData.date || new Date(),
    status: inventoryData.status || "available",
    isSensitive: inventoryData.isSensitive || false,
    minBookingDays: inventoryData.minBookingDays || 1,
    maxBookingDays: inventoryData.maxBookingDays || 30,
  });

  return inventoryItem;
};

export const getInventoryItem = async (id: string) => {
  const inventoryItem = await Inventory.findById(id).populate(
    "product",
    "name price"
  );
  if (!inventoryItem) {
    throw new ApiError("No inventory item found with that ID", 404);
  }
  return inventoryItem;
};

export const getInventoryItems = async (filter: any = {}) => {
  return await Inventory.find(filter)
    .populate("product", "name price stock")
    .sort({ createdAt: -1 });
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
    status: "available",
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

  // Get inventory items and check if they're booked for these dates
  const inventoryItems = await Inventory.find(query);

  const availableItems = [];
  for (const item of inventoryItems) {
    let isBooked = false;

    if (item.bookedDates && item.bookedDates.length > 0) {
      for (const booking of item.bookedDates) {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);

        if (!(endDate < bookingStart || startDate > bookingEnd)) {
          isBooked = true;
          break;
        }
      }
    }

    if (!isBooked) {
      availableItems.push(item);
    }
  }

  return availableItems;
};

export const getBookedInventory = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  warehouse?: string
) => {
  const query: any = {
    product: productId,
    status: "booked",
    "bookedDates.startDate": { $lte: endDate },
    "bookedDates.endDate": { $gte: startDate },
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

  return await Inventory.find(query);
};

export const checkInventoryAvailability = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number
) => {
  try {
    const result = await Inventory.checkAvailability(
      productId,
      new Date(startDate),
      new Date(endDate),
      quantity
    );

    return {
      isAvailable: result.isAvailable,
      availableQuantity: result.availableQuantity,
      message: result.message,
      inventoryItems: result.inventoryItems.map((item) => ({
        id: item._id,
        productName: item.productName,
        quantity: item.quantity,
        warehouse: item.warehouse,
        vendor: item.vendor,
        rentalPrice: item.rentalPrice,
        dimensions: item.dimensions,
      })),
    };
  } catch (error) {
    console.error("Error checking inventory availability:", error);
    return {
      isAvailable: false,
      availableQuantity: 0,
      message: "Error checking availability",
      inventoryItems: [],
    };
  }
};

export const releaseExpiredCartItems = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const expiredBookings = await Booking.find({
    status: "pending",
    createdAt: { $lte: thirtyMinutesAgo },
  });

  for (const booking of expiredBookings) {
    try {
      // Use the model's static method
      await Inventory.releaseInventory(
        (booking._id as unknown as string).toString()
      );

      // Delete the booking
      await Booking.findByIdAndDelete(booking._id);
    } catch (error) {
      console.error(
        `Error releasing inventory for booking ${booking._id}:`,
        error
      );
    }
  }

  return expiredBookings.length;
};
