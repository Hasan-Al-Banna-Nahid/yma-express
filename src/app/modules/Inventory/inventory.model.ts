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
      required: true,
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
      min: 0,
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
    bookedDates: [bookedDateSchema],
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

// Check availability
inventorySchema.statics.checkAvailability = async function (
  productId: string,
  startDate: Date,
  endDate: Date,
  requiredQuantity: number
) {
  console.log(`Checking availability for product: ${productId}`);

  // Find inventory for this product
  const inventoryItems = await this.find({
    product: productId,
    status: "available",
  });

  console.log(`Found ${inventoryItems.length} inventory items`);

  if (inventoryItems.length === 0) {
    return {
      isAvailable: false,
      availableQuantity: 0,
      inventoryItems: [],
      message: "No inventory available for this product",
    };
  }

  let availableQuantity = 0;
  const availableItems: IInventoryDocument[] = [];

  for (const item of inventoryItems) {
    console.log(`Checking item ${item._id}, quantity: ${item.quantity}`);

    // Check booked dates
    let isBooked = false;
    if (item.bookedDates && item.bookedDates.length > 0) {
      for (const booking of item.bookedDates) {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);

        const hasOverlap = !(endDate < bookingStart || startDate > bookingEnd);

        if (hasOverlap) {
          isBooked = true;
          console.log(`Item ${item._id} is booked during requested dates`);
          break;
        }
      }
    }

    if (!isBooked) {
      availableQuantity += item.quantity;
      availableItems.push(item);
      console.log(`Item ${item._id} is available, adding ${item.quantity}`);
    }
  }

  console.log(
    `Total available: ${availableQuantity}, Required: ${requiredQuantity}`
  );

  return {
    isAvailable: availableQuantity >= requiredQuantity,
    availableQuantity,
    inventoryItems: availableItems,
    message:
      availableQuantity >= requiredQuantity
        ? "Available"
        : `Only ${availableQuantity} available, ${requiredQuantity} required`,
  };
};

// Reserve inventory
inventorySchema.statics.reserveInventory = async function (
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  bookingId: mongoose.Types.ObjectId
) {
  console.log(`Reserving ${quantity} items for booking ${bookingId}`);

  const { isAvailable, availableQuantity, inventoryItems } =
    await this.checkAvailability(productId, startDate, endDate, quantity);

  if (!isAvailable) {
    throw new Error(
      `Not enough inventory available. Required: ${quantity}, Available: ${availableQuantity}`
    );
  }

  let remaining = quantity;
  const updatedItems: IInventoryDocument[] = [];

  for (const item of inventoryItems) {
    if (remaining <= 0) break;

    if (!item.bookedDates) item.bookedDates = [];
    item.bookedDates.push({
      startDate,
      endDate,
      bookingId,
    });

    // Update status if needed
    if (item.quantity <= remaining) {
      item.status = "booked";
    }

    if (!item.bookings) item.bookings = [];
    item.bookings.push(bookingId);

    await item.save();
    updatedItems.push(item);
    remaining -= Math.min(item.quantity, remaining);

    console.log(`Reserved item ${item._id}`);
  }

  console.log(`Successfully reserved ${quantity} items`);
  return updatedItems;
};

// Release inventory
inventorySchema.statics.releaseInventory = async function (bookingId: string) {
  console.log(`Releasing inventory for booking ${bookingId}`);

  const items = await this.find({
    "bookedDates.bookingId": bookingId,
  });

  for (const item of items) {
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

    // Set to available if no more bookings
    if (
      (!item.bookedDates || item.bookedDates.length === 0) &&
      (!item.bookings || item.bookings.length === 0)
    ) {
      item.status = "available";
    }

    await item.save();
  }

  console.log(`Released ${items.length} items`);
};

// Indexes
inventorySchema.index({ product: 1, status: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ warehouse: 1 });
inventorySchema.index({ vendor: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ "bookedDates.bookingId": 1 });

const Inventory = mongoose.model<IInventoryDocument, IInventoryModel>(
  "Inventory",
  inventorySchema
);

export default Inventory;
