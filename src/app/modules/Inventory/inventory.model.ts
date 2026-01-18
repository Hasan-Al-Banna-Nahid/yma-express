import mongoose, { Document, Schema, Model } from "mongoose";
import { IInventory } from "./inventory.interface";

export interface IInventoryDocument extends IInventory, Document {}

export interface IInventoryModel extends Model<IInventoryDocument> {
  checkAvailability(
    productId: string,
    startDate: Date,
    endDate: Date,
    quantity: number
  ): Promise<{
    isAvailable: boolean;
    availableQuantity: number;
    inventoryItems: IInventoryDocument[];
    message?: string;
  }>;

  reserveInventory(
    productId: string,
    startDate: Date,
    endDate: Date,
    quantity: number,
    bookingId: mongoose.Types.ObjectId
  ): Promise<IInventoryDocument[]>;

  releaseInventory(bookingId: string): Promise<void>;
}

const dimensionsSchema = new Schema({
  width: { type: Number, required: true, min: 0 },
  length: { type: Number, required: true, min: 0 },
  height: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "feet" },
});

const bookedDateSchema = new Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
});

const inventorySchema = new Schema<IInventoryDocument, IInventoryModel>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      // required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    dimensions: dimensionsSchema,
    images: [
      {
        type: String,
        required: true,
      },
    ],
    isSensitive: {
      type: Boolean,
      default: false,
    },
    deliveryTime: {
      type: String,
      required: true,
    },
    collectionTime: {
      type: String,
      required: true,
    },
    rentalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    category: {
      type: String,
      required: true,
    },
    warehouse: {
      type: String,
      required: true,
    },
    vendor: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "booked", "maintenance", "out_of_stock"],
      default: "available",
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    bookings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
    minBookingDays: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxBookingDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    bookedDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        bookingId: {
          type: Schema.Types.ObjectId,
          ref: "Booking",
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for formatted dimensions
inventorySchema.virtual("formattedDimensions").get(function () {
  return `${
    this.dimensions.width
  } x ${this.dimensions.length} x ${this.dimensions.height} ${this.dimensions.unit || "feet"}`;
});

// Virtual for area
inventorySchema.virtual("area").get(function () {
  return this.dimensions.width * this.dimensions.length;
});

// inventory.model.ts - Add detailed debug logging
inventorySchema.statics.checkAvailability = async function (
  productId: string,
  startDate: Date,
  endDate: Date,
  requiredQuantity: number
): Promise<{
  isAvailable: boolean;
  availableQuantity: number;
  inventoryItems: IInventoryDocument[];
  message?: string;
}> {
  console.log("🔍 [DEBUG] checkAvailability called");
  console.log("📦 Product ID:", productId);
  console.log("📅 Start Date:", startDate, "Type:", typeof startDate);
  console.log("📅 End Date:", endDate, "Type:", typeof endDate);
  console.log("🔢 Required Quantity:", requiredQuantity);

  // Validate dates
  if (startDate >= endDate) {
    console.log("❌ Date validation failed: startDate >= endDate");
    return {
      isAvailable: false,
      availableQuantity: 0,
      inventoryItems: [],
      message: "Start date must be before end date",
    };
  }

  // Normalize dates
  const normalizedStartDate = new Date(startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);

  const normalizedEndDate = new Date(endDate);
  normalizedEndDate.setHours(23, 59, 59, 999);

  console.log("📅 Normalized Start:", normalizedStartDate.toISOString());
  console.log("📅 Normalized End:", normalizedEndDate.toISOString());

  // Convert productId to ObjectId
  let productObjectId;
  try {
    productObjectId = new mongoose.Types.ObjectId(productId);
    console.log("✅ Product ID converted to ObjectId:", productObjectId);
  } catch (error) {
    console.log("❌ Invalid product ID format:", productId);
    return {
      isAvailable: false,
      availableQuantity: 0,
      inventoryItems: [],
      message: "Invalid product ID format",
    };
  }

  // DEBUG: Log the query being executed
  console.log("🔍 [DEBUG] Executing query:", {
    product: productObjectId,
    status: { $in: ["available", "booked"] },
  });

  // Get all inventory items for this product
  const inventoryItems = await this.find({
    product: productObjectId,
    status: { $in: ["available", "booked"] },
  });

  console.log("📊 [DEBUG] Found inventory items:", inventoryItems.length);

  if (inventoryItems.length === 0) {
    console.log("❌ No inventory items found for product");
    return {
      isAvailable: false,
      availableQuantity: 0,
      inventoryItems: [],
      message: `No inventory found for product ID: ${productId}`,
    };
  }

  // DEBUG: Show each inventory item
  console.log("📋 [DEBUG] Inventory Items Details:");
  inventoryItems.forEach((item, index) => {
    console.log(`  Item ${index + 1}:`);
    console.log(`    ID: ${item._id}`);
    console.log(`    Status: ${item.status}`);
    console.log(`    Quantity: ${item.quantity}`);
    console.log(`    Warehouse: ${item.warehouse}`);
    console.log(`    Booked Dates Count: ${item.bookedDates?.length || 0}`);

    if (item.bookedDates && item.bookedDates.length > 0) {
      console.log(`    Booked Dates:`);
      item.bookedDates.forEach((booking, bIndex) => {
        console.log(`      Booking ${bIndex + 1}:`);
        console.log(`        Start: ${booking.startDate}`);
        console.log(`        End: ${booking.endDate}`);
        console.log(`        Booking ID: ${booking.bookingId}`);
      });
    }
  });

  let availableQuantity = 0;
  const availableItems: IInventoryDocument[] = [];

  console.log("🔍 [DEBUG] Checking availability for each item:");

  // Check each inventory item
  for (const [index, item] of inventoryItems.entries()) {
    console.log(`\n  🔍 Checking item ${index + 1} (ID: ${item._id}):`);
    console.log(`    Status: ${item.status}`);
    console.log(`    Quantity: ${item.quantity}`);

    // Skip maintenance/out_of_stock
    if (item.status === "maintenance" || item.status === "out_of_stock") {
      console.log(`    ❌ Skipped - status: ${item.status}`);
      continue;
    }

    let isAvailableForDates = true;

    // Check booked dates
    if (item.bookedDates && item.bookedDates.length > 0) {
      console.log(`    📅 Has ${item.bookedDates.length} booking(s)`);

      for (const [bIndex, booking] of item.bookedDates.entries()) {
        const bookingStart = new Date(booking.startDate);
        bookingStart.setHours(0, 0, 0, 0);

        const bookingEnd = new Date(booking.endDate);
        bookingEnd.setHours(23, 59, 59, 999);

        console.log(`    📅 Booking ${bIndex + 1}:`);
        console.log(
          `      Booking Range: ${bookingStart.toISOString()} to ${bookingEnd.toISOString()}`
        );
        console.log(
          `      Requested Range: ${normalizedStartDate.toISOString()} to ${normalizedEndDate.toISOString()}`
        );

        // Check for overlap
        const overlapCondition1 = normalizedEndDate < bookingStart;
        const overlapCondition2 = normalizedStartDate > bookingEnd;
        const hasOverlap = !(overlapCondition1 || overlapCondition2);

        console.log(
          `      Condition 1 (end < bookingStart): ${normalizedEndDate.toISOString()} < ${bookingStart.toISOString()} = ${overlapCondition1}`
        );
        console.log(
          `      Condition 2 (start > bookingEnd): ${normalizedStartDate.toISOString()} > ${bookingEnd.toISOString()} = ${overlapCondition2}`
        );
        console.log(`      Has Overlap?: ${hasOverlap}`);

        if (hasOverlap) {
          isAvailableForDates = false;
          console.log(
            `      ❌ OVERLAP DETECTED - Item not available for these dates`
          );
          break;
        } else {
          console.log(`      ✅ No overlap - Item still available`);
        }
      }
    } else {
      console.log(`    ✅ No bookings - Item is available`);
    }

    if (isAvailableForDates) {
      availableQuantity += item.quantity;
      availableItems.push(item);
      console.log(
        `    ✅ ADDED to available items. New total: ${availableQuantity}`
      );
    } else {
      console.log(`    ❌ NOT available for these dates`);
    }
  }

  const isAvailable = availableQuantity >= requiredQuantity;

  console.log("\n📊 [DEBUG] FINAL RESULTS:");
  console.log(`  Total Available Quantity: ${availableQuantity}`);
  console.log(`  Required Quantity: ${requiredQuantity}`);
  console.log(`  Is Available: ${isAvailable}`);
  console.log(`  Available Items Count: ${availableItems.length}`);

  let message = "";
  if (isAvailable) {
    message = `✅ Available! ${availableQuantity} unit(s) available for selected dates.`;
  } else {
    message = `❌ Not available. Only ${availableQuantity} unit(s) available, ${requiredQuantity} required.`;

    // Show where inventory exists
    if (inventoryItems.length > 0) {
      const warehouses = [
        ...new Set(inventoryItems.map((item) => item.warehouse)),
      ];
      message += ` Inventory exists in: ${warehouses.join(", ")}`;
    }
  }

  console.log(`  Message: ${message}`);

  return {
    isAvailable,
    availableQuantity,
    inventoryItems: availableItems,
    message,
  };
};

// Add this to inventory.model.ts static methods
inventorySchema.statics.findNextAvailableDate = async function (
  productId: string,
  fromDate: Date,
  requiredQuantity: number
): Promise<Date | null> {
  console.log(`🔍 Finding next available date for product ${productId}`);

  const inventoryItems = await this.find({
    product: new mongoose.Types.ObjectId(productId),
    status: { $ne: "maintenance" },
  });

  if (inventoryItems.length === 0) {
    console.log(`❌ No inventory items found for product ${productId}`);
    return null;
  }

  // Check next 90 days
  for (let daysAhead = 1; daysAhead <= 90; daysAhead++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(checkDate.getDate() + daysAhead);
    checkDate.setHours(0, 0, 0, 0);

    // Check availability for a 1-day period starting from checkDate
    const checkEndDate = new Date(checkDate);
    checkEndDate.setDate(checkEndDate.getDate() + 1);
    checkEndDate.setHours(23, 59, 59, 999);

    let availableQuantity = 0;

    for (const item of inventoryItems) {
      if (item.status === "out_of_stock") continue;

      let isBooked = false;
      if (item.bookedDates && item.bookedDates.length > 0) {
        for (const booking of item.bookedDates) {
          const bookingStart = new Date(booking.startDate);
          bookingStart.setHours(0, 0, 0, 0);

          const bookingEnd = new Date(booking.endDate);
          bookingEnd.setHours(23, 59, 59, 999);

          // Check if checkDate falls within any booking
          if (checkDate >= bookingStart && checkDate <= bookingEnd) {
            isBooked = true;
            break;
          }
        }
      }

      if (!isBooked) {
        availableQuantity += item.quantity;
      }
    }

    if (availableQuantity >= requiredQuantity) {
      console.log(
        `✅ Next available date found: ${checkDate.toISOString().split("T")[0]}`
      );
      return checkDate;
    }
  }

  console.log(`❌ No available date found in next 90 days`);
  return null;
};

// inventory.model.ts - Improved reserveInventory method
inventorySchema.statics.reserveInventory = async function (
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  bookingId: mongoose.Types.ObjectId
): Promise<IInventoryDocument[]> {
  console.log(`🔒 Reserving inventory for booking ${bookingId}`);
  console.log(
    `📦 Product: ${productId}, Quantity: ${quantity}, Dates: ${startDate} to ${endDate}`
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Normalize dates
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);

    // Check availability first - using our fixed method
    const { isAvailable, inventoryItems } = await this.checkAvailability(
      productId,
      normalizedStartDate,
      normalizedEndDate,
      quantity
    );

    console.log(
      `📊 Availability check: ${isAvailable ? "AVAILABLE" : "NOT AVAILABLE"}`
    );

    if (!isAvailable) {
      throw new Error(
        `Inventory not available: Required ${quantity} units, but only ${inventoryItems.length} items available`
      );
    }

    let remainingQuantity = quantity;
    const reservedItems: IInventoryDocument[] = [];

    console.log(`📋 Available items to reserve: ${inventoryItems.length}`);

    // Reserve from available items
    for (const item of inventoryItems) {
      if (remainingQuantity <= 0) break;

      const itemDoc = await this.findById(item._id).session(session);
      if (!itemDoc) continue;

      console.log(
        `📦 Processing item ${itemDoc._id} with quantity ${itemDoc.quantity}`
      );

      // Calculate how many units we can reserve from this item
      const unitsToReserve = Math.min(itemDoc.quantity, remainingQuantity);

      console.log(
        `📊 Units to reserve: ${unitsToReserve}, Remaining needed: ${remainingQuantity}`
      );

      // Create booked date entry
      const bookedDateEntry = {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        bookingId,
      };

      // If we need to split the item (reserve partial quantity)
      if (unitsToReserve < itemDoc.quantity) {
        console.log(`🔀 Splitting item ${itemDoc._id}`);

        // Create a new item for the remaining quantity
        const newItemData = {
          ...itemDoc.toObject(),
          _id: new mongoose.Types.ObjectId(),
          quantity: itemDoc.quantity - unitsToReserve,
          bookedDates: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Remove system fields
        delete (newItemData as any).__v;
        delete newItemData.id;

        const newItem = new this(newItemData);
        await newItem.save({ session });
        console.log(
          `✅ Created new item ${newItem._id} with quantity ${newItem.quantity}`
        );

        // Update original item with reserved quantity
        itemDoc.quantity = unitsToReserve;
      }

      // Initialize bookedDates array if it doesn't exist
      if (!itemDoc.bookedDates) {
        itemDoc.bookedDates = [];
      }

      // Add booking dates
      itemDoc.bookedDates.push(bookedDateEntry);

      // Update status
      itemDoc.status = "booked";

      // Add booking reference
      if (!itemDoc.bookings) {
        itemDoc.bookings = [];
      }

      itemDoc.bookings.push(bookingId);

      await itemDoc.save({ session });
      reservedItems.push(itemDoc);
      remainingQuantity -= unitsToReserve;

      console.log(
        `✅ Reserved ${unitsToReserve} units from item ${itemDoc._id}`
      );
      console.log(`📊 Remaining quantity to reserve: ${remainingQuantity}`);
    }

    if (remainingQuantity > 0) {
      throw new Error(
        `Failed to reserve all items. ${remainingQuantity} units still needed after processing all items`
      );
    }

    await session.commitTransaction();
    console.log(
      `✅ Successfully reserved ${quantity} units for booking ${bookingId}`
    );
    return reservedItems;
  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ Error reserving inventory:`, error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Release inventory
inventorySchema.statics.releaseInventory = async function (
  bookingId: string
): Promise<void> {
  const items = await this.find({
    "bookedDates.bookingId": new mongoose.Types.ObjectId(bookingId),
  });

  const updates: Promise<any>[] = [];

  for (const item of items) {
    // Remove the booked date entry for this booking
    if (item.bookedDates) {
      item.bookedDates = item.bookedDates.filter(
        (booking: any) => booking.bookingId.toString() !== bookingId
      );
    }

    // Remove booking reference
    if (item.bookings) {
      item.bookings = item.bookings.filter(
        (bid: any) => bid.toString() !== bookingId
      );
    }

    // Update status if no more bookings
    if (
      (!item.bookedDates || item.bookedDates.length === 0) &&
      (!item.bookings || item.bookings.length === 0)
    ) {
      item.status = "available";
    }

    updates.push(item.save());
  }

  await Promise.all(updates);
};

// Indexes
inventorySchema.index({ product: 1, status: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ warehouse: 1 });
inventorySchema.index({ vendor: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ "bookedDates.bookingId": 1 });
// inventorySchema.index({ "bookedDates.startDate": 1, "bookedDates.endDate": 1 });

const Inventory = mongoose.model<IInventoryDocument, IInventoryModel>(
  "Inventory",
  inventorySchema
);

export default Inventory;
