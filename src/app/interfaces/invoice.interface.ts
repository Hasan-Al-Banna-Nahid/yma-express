import mongoose from 'mongoose';
import {IUser} from "./user.interface";

export interface IInvoice {
    booking?: mongoose.Schema.Types.ObjectId;
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    amount: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
    status?: 'draft' | 'sent' | 'paid' | 'cancelled';
    paymentMethod?: 'cash' | 'bank-transfer' | 'credit-card' | 'other';
    notes?: string;
    isOrganization?: boolean;
    organizationName?: string;
    showCashOnDelivery?: boolean;
    _id?: mongoose.Types.ObjectId;


    // Can be ObjectId or populated IUser
    user: mongoose.Types.ObjectId | (IUser & { _id: mongoose.Types.ObjectId });




    createdAt?: Date;
    updatedAt?: Date;
}