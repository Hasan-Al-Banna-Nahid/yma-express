// src/models/cart.model.ts
import mongoose, { Document, Schema } from "mongoose";
import { ICart, ICartItem } from "../interfaces/cart.interface";

export interface ICartItemModel extends ICartItem, Document {}
export interface ICartModel extends ICart, Document {}

const cartItemSchema: Schema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: function (this: any) {
      return this.endDate !== undefined;
    },
  },
  endDate: {
    type: Date,
    required: function (this: any) {
      return this.startDate !== undefined;
    },
    validate: {
      validator: function (this: any, endDate: Date) {
        return !this.startDate || endDate > this.startDate;
      },
      message: "End date must be after start date",
    },
  },
});

const cartSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
cartSchema.pre("save", function (this: ICartModel, next) {
  this.totalItems = this.items.reduce(
    (total: number, item: ICartItem) => total + item.quantity,
    0
  );
  this.totalPrice = this.items.reduce(
    (total: number, item: ICartItem) => total + item.quantity * item.price,
    0
  );
  next();
});

const Cart = mongoose.model<ICartModel>("Cart", cartSchema);

export default Cart;
