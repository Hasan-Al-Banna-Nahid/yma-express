import mongoose, { Schema, Model } from 'mongoose';
import { IInvoice } from '../interfaces/invoice.interface';

// Use Schema generics; don't extend Document in our own interface
const invoiceSchema = new Schema<IInvoice>(
    {
        booking: {
            type: Schema.Types.ObjectId,
            ref: 'Booking',
            // If you generate custom invoices without a booking, keep this NOT required
            // required: [true, 'Invoice must belong to a booking'],
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Invoice must belong to a user'],
        },
        invoiceNumber: {
            type: String,
            required: [true, 'Invoice must have a number'],
            unique: true,
        },
        issueDate: {
            type: Date,
            required: [true, 'Invoice must have an issue date'],
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, 'Invoice must have a due date'],
        },
        amount: {
            type: Number,
            required: [true, 'Invoice must have an amount'],
            min: [0, 'Amount cannot be negative'],
        },
        tax: {
            type: Number,
            default: 0,
            min: [0, 'Tax cannot be negative'],
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative'],
        },
        totalAmount: {
            type: Number,
            required: [true, 'Invoice must have a total amount'],
            min: [0, 'Total amount cannot be negative'],
        },
        status: {
            type: String,
            enum: ['draft', 'sent', 'paid', 'cancelled'],
            default: 'draft',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'bank-transfer', 'credit-card', 'other'],
            default: 'cash',
        },
        notes: String,
        isOrganization: {
            type: Boolean,
            default: false,
        },
        organizationName: String,
        showCashOnDelivery: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ user: 1 });
// invoiceSchema.index({ invoiceNumber: 1 });

// Auto-populate booking and user
invoiceSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
    this.populate('booking').populate({
        path: 'user',
        select: '_id name email photo',
    });
    next();
});

// Export a typed model. The hydrated document type is inferred from IInvoice.
const Invoice: Model<IInvoice> = mongoose.model<IInvoice>('Invoice', invoiceSchema);

export default Invoice;
