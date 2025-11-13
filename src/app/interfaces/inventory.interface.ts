import mongoose from 'mongoose';

export interface IInventory {
    product: mongoose.Schema.Types.ObjectId;
    quantity: number;
    date: Date;
    status?: 'available' | 'booked' | 'maintenance';
    bookings?: mongoose.Schema.Types.ObjectId[];
}