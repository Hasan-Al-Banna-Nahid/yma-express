"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Use Schema generics; don't extend Document in our own interface
const invoiceSchema = new mongoose_1.Schema({
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        // If you generate custom invoices without a booking, keep this NOT required
        // required: [true, 'Invoice must belong to a booking'],
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ user: 1 });
// invoiceSchema.index({ invoiceNumber: 1 });
// Auto-populate booking and user
invoiceSchema.pre(/^find/, function (next) {
    this.populate('booking').populate({
        path: 'user',
        select: '_id name email photo',
    });
    next();
});
// Export a typed model. The hydrated document type is inferred from IInvoice.
const Invoice = mongoose_1.default.model('Invoice', invoiceSchema);
exports.default = Invoice;
