import Inventory from "../../modules/Inventory/inventory.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";

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
    productName: { $regex: productName, $options: "i" },
    quantity: { $gt: 0 },
  };
  if (warehouse) query.warehouse = warehouse;

  const inventoryItems = await Inventory.find(query);

  return inventoryItems.filter((item) => {
    if (!item.bookedDates || item.bookedDates.length === 0) return true;

    return !item.bookedDates.some((booking) => {
      return !(endDate < booking.startDate || startDate > booking.endDate);
    });
  });
};

/* ---------------------------------- */
/* CHECK INVENTORY AVAILABILITY        */
/* ---------------------------------- */
export const checkInventoryAvailability = async (
  productName: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  warehouse?: string,
) => {
  const availableItems = await getAvailableInventory(
    productName,
    startDate,
    endDate,
    warehouse,
  );

  const totalAvailable = availableItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );

  return {
    isAvailable: totalAvailable >= quantity,
    availableQuantity: totalAvailable,
    message:
      totalAvailable >= quantity
        ? `Available: ${totalAvailable} items`
        : `Only ${totalAvailable} items available`,
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
};

/* ---------------------------------- */
/* DELETE INVENTORY ITEM               */
/* ---------------------------------- */
export const deleteInventoryItem = async (id: string) => {
  const inventoryItem = await Inventory.findByIdAndDelete(id);
  if (!inventoryItem) throw new ApiError("Inventory not found", 404);
  return inventoryItem;
};
