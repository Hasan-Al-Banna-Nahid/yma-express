import Inventory from "../../modules/Inventory/inventory.model";
import ApiError from "../../utils/apiError";

// inventory.service.ts
export const createInventoryItem = async (inventoryData: any) => {
  // No validation here - controller already handled it
  // Just create the inventory item

  console.log("🛠️ Service: Creating inventory item with data:", {
    productName: inventoryData.productName,
    quantity: inventoryData.quantity,
    warehouse: inventoryData.warehouse,
    vendor: inventoryData.vendor,
  });

  const inventoryItem = await Inventory.create(inventoryData);

  console.log("✅ Service: Inventory item created:", inventoryItem._id);

  return inventoryItem;
};

export const updateInventoryItem = async (id: string, updateData: any) => {
  console.log("🛠️ Service: Updating inventory item:", id);

  const inventoryItem = await Inventory.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true, // MongoDB validators still run
  });

  if (!inventoryItem) {
    throw new ApiError("No inventory item found with that ID", 404);
  }

  console.log("✅ Service: Inventory item updated:", inventoryItem._id);
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
  return await Inventory.find(filter).sort({ createdAt: -1 });
};

// Update other functions that might depend on product field

export const getAvailableInventory = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  warehouse?: string
) => {
  const query: any = {
    // Changed from product: productId to productName for filtering
    productName: { $regex: productId, $options: "i" },
    status: "available",
  };

  if (warehouse) {
    query.warehouse = warehouse;
  }

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
    // Changed from product: productId to productName
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

export const checkInventoryAvailability = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number
) => {
  try {
    // Since we don't have product ID, we'll check by productName
    const inventoryItems = await Inventory.find({
      productName: { $regex: productId, $options: "i" },
      status: "available",
    });

    let availableQuantity = 0;
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
        availableQuantity += item.quantity;
        availableItems.push(item);
      }
    }

    const isAvailable = availableQuantity >= quantity;

    return {
      isAvailable,
      availableQuantity,
      message: isAvailable
        ? `Available: ${availableQuantity} items`
        : `Only ${availableQuantity} items available`,
      inventoryItems: availableItems.map((item) => ({
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
export const deleteInventoryItem = async (id: string) => {
  console.log(`🗑️ Service: Deleting inventory item with ID: ${id}`);

  const inventoryItem = await Inventory.findByIdAndDelete(id);

  if (!inventoryItem) {
    throw new ApiError("No inventory item found with that ID", 404);
  }

  console.log(`✅ Service: Successfully deleted: ${inventoryItem.productName}`);
  return inventoryItem;
};
