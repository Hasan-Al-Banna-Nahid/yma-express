import mongoose, { Document, Schema } from "mongoose";
import { IInventory } from "./inventory.interface";

export interface IInventoryModel extends IInventory, Document {}

const inventorySchema: Schema = new Schema(
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
      enum: ["available", "booked", "maintenance"],
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
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
inventorySchema.index({ product: 1, date: 1 });

const Inventory = mongoose.model<IInventoryModel>("Inventory", inventorySchema);

export default Inventory;
