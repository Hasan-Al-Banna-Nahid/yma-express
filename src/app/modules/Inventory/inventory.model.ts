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
    },
    warehouse: {
      type: String,
      required: true,
    },
    vendor: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["available", "booked", "maintenance", "out_of_stock"],
      default: "available",
    },
    bookings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
    rentalFee: {
      type: Number,
      required: true,
      min: 0,
    },
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
  }
);

// Check availability for specific dates
inventorySchema.statics.checkAvailability = async function (
  productId: string,
  startDate: Date,
  endDate: Date,
  requiredQuantity: number
) {
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (totalDays < 1) {
    return {
      isAvailable: false,
      availableQuantity: 0,
      inventoryItems: [],
      message: "Minimum booking duration is 1 day",
    };
  }

  // Find all inventory items for this product
  const inventoryItems = await this.find({
    product: productId,
    status: "available",
    quantity: { $gte: 1 },
  });

  if (inventoryItems.length === 0) {
    return {
      isAvailable: false,
      availableQuantity: 0,
      inventoryItems: [],
      message: "No inventory available for this product",
    };
  }

  // Check each inventory item's booked dates
  let availableQuantity = 0;
  const availableItems: IInventoryDocument[] = [];

  for (const item of inventoryItems) {
    // Check if this item is booked for the requested dates
    const isBooked = item.bookedDates?.some((booking: any) => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      return (
        (startDate >= bookingStart && startDate <= bookingEnd) ||
        (endDate >= bookingStart && endDate <= bookingEnd) ||
        (startDate <= bookingStart && endDate >= bookingEnd)
      );
    });

    if (!isBooked) {
      availableQuantity += item.quantity;
      availableItems.push(item);
    }
  }

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

// Reserve inventory for booking
inventorySchema.statics.reserveInventory = async function (
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  bookingId: mongoose.Types.ObjectId
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { isAvailable, availableQuantity, inventoryItems } =
      await this.checkAvailability(productId, startDate, endDate, quantity);

    if (!isAvailable) {
      throw new Error(
        `Not enough inventory available. Required: ${quantity}, Available: ${availableQuantity}`
      );
    }

    let remainingQuantity = quantity;
    const updatedItems: IInventoryDocument[] = [];

    for (const item of inventoryItems) {
      if (remainingQuantity <= 0) break;

      const reservedQuantity = Math.min(item.quantity, remainingQuantity);

      // Add to booked dates
      if (!item.bookedDates) item.bookedDates = [];
      item.bookedDates.push({
        startDate,
        endDate,
        bookingId,
      });

      // If all quantity is reserved, mark as booked
      if (reservedQuantity === item.quantity) {
        item.status = "booked";
      }

      // Add booking reference
      if (!item.bookings) item.bookings = [];
      item.bookings.push(bookingId);

      await item.save({ session });
      updatedItems.push(item);
      remainingQuantity -= reservedQuantity;
    }

    await session.commitTransaction();
    return updatedItems;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Release inventory when booking is cancelled or completed
inventorySchema.statics.releaseInventory = async function (bookingId: string) {
  await this.updateMany(
    { bookings: bookingId },
    {
      $pull: {
        bookings: bookingId,
        bookedDates: { bookingId: bookingId },
      },
      $set: { status: "available" },
    }
  );
};

// Indexes
inventorySchema.index({ product: 1, date: 1 });
inventorySchema.index({ product: 1, status: 1 });
inventorySchema.index({ "bookedDates.bookingId": 1 });

const Inventory = mongoose.model<IInventoryDocument, IInventoryModel>(
  "Inventory",
  inventorySchema
);

export default Inventory;
