import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const checkUsers = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/yma";
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Find ALL users with this email (there might be duplicates)
    const users = await usersCollection
      .find({
        email: "iamnahid591998@gmail.com",
      })
      .toArray();

    console.log(
      `📋 Found ${users.length} user(s) with email: iamnahid591998@gmail.com`
    );

    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Created: ${user.createdAt}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

checkUsers();
