import mongoose, { Document, Schema } from 'mongoose';
import { IInventory } from '../interfaces/inventory.interface';

export interface IInventoryModel extends IInventory, Document {}

const inventorySchema: Schema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Inventory item must belong to a product'],
        },
        quantity: {
            type: Number,
            required: [true, 'Inventory item must have a quantity'],
            min: [0, 'Quantity cannot be negative'],
        },
        date: {
            type: Date,
            required: [true, 'Inventory item must have a date'],
        },
        status: {
            type: String,
            enum: ['available', 'booked', 'maintenance'],
            default: 'available',
        },
        bookings: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Booking',
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
inventorySchema.index({ product: 1, date: 1 }, { unique: true });

// Virtual populate
inventorySchema.virtual('productDetails', {
    ref: 'Product',
    foreignField: '_id',
    localField: 'product',
    justOne: true,
});

const Inventory = mongoose.model<IInventoryModel>('Inventory', inventorySchema);

export default Inventory;