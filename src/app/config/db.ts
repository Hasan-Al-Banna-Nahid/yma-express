
import mongoose from 'mongoose';
import { config } from './config';

const connectDB = async () => {
    try {
        await mongoose.connect(config.mongo.uri,{
        dbName: 'YMA', // optional override (ensures YMA even if URI has /test)
    });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.log('MongoDB connection error:', error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});

export default connectDB;