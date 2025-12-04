import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const forceUpdateSuperadmin = async () => {
  const client = new MongoClient(
    process.env.MONGO_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("yma");

    // Find the correct collection name
    const collections = await db.listCollections().toArray();
    const userCollectionName =
      collections.find((c) => c.name.toLowerCase().includes("user"))?.name ||
      "users";

    console.log(`📂 Using collection: ${userCollectionName}`);
    const users = db.collection(userCollectionName);

    // Find the user
    const user = await users.findOne({ email: "iamnahid591998@gmail.com" });

    if (!user) {
      console.log("❌ User not found. Creating new...");

      const password = "h975318642HBH$$$B";
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await users.insertOne({
        name: "Nahid",
        email: "iamnahid591998@gmail.com",
        password: hashedPassword,
        role: "superadmin",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("✅ New superadmin created with ID:", result.insertedId);
    } else {
      console.log("📋 Found user:", {
        id: user._id,
        name: user.name,
        email: user.email,
        currentRole: user.role,
        createdAt: user.createdAt,
      });

      // Update the role directly
      const result = await users.updateOne(
        { _id: user._id },
        {
          $set: {
            role: "superadmin",
            updatedAt: new Date(),
          },
        }
      );

      console.log(
        `✅ Update result: Matched ${result.matchedCount}, Modified ${result.modifiedCount}`
      );

      // Verify the update
      const updatedUser = await users.findOne({ _id: user._id });
      console.log("✅ Updated user role:", updatedUser?.role);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
};

forceUpdateSuperadmin();
