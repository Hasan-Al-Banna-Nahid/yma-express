// dropIndex.js - UPDATED for newer MongoDB driver
const { MongoClient } = require("mongodb");
require("dotenv").config();

async function dropProblematicIndex() {
  let client;

  try {
    // Connect to MongoDB
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/YMA";
    client = new MongoClient(uri);

    await client.connect();
    console.log("✅ Connected to MongoDB");

    // Get the inventories collection
    const database = client.db("YMA");
    const collection = database.collection("inventories");

    // 1. First, list all indexes
    console.log("📋 Listing all indexes...");
    const indexes = await collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    // 2. Look for the problematic index
    let problematicIndex = null;
    for (const index of indexes) {
      if (
        index.name === "product_1_date_1" ||
        (index.key && index.key.product && index.key.date)
      ) {
        problematicIndex = index;
        break;
      }
    }

    if (problematicIndex) {
      console.log(`🔍 Found problematic index: ${problematicIndex.name}`);
      console.log("Index details:", JSON.stringify(problematicIndex, null, 2));

      // 3. Drop the index
      console.log(`🗑️ Dropping index: ${problematicIndex.name}...`);
      await collection.dropIndex(problematicIndex.name);
      console.log(`✅ Index ${problematicIndex.name} dropped successfully!`);
    } else {
      console.log("✅ No problematic index found with {product: 1, date: 1}");

      // Check if any index has date field
      const indexesWithDate = [];
      for (const index of indexes) {
        if (index.key && index.key.date !== undefined) {
          indexesWithDate.push(index);
        }
      }

      if (indexesWithDate.length > 0) {
        console.log("⚠️ Found indexes with date field:");
        indexesWithDate.forEach((index) => {
          console.log(`  - ${index.name}:`, index.key);
        });

        for (const index of indexesWithDate) {
          if (index.name !== "_id_") {
            console.log(`🗑️ Dropping index with date: ${index.name}...`);
            try {
              await collection.dropIndex(index.name);
              console.log(`✅ Index ${index.name} dropped`);
            } catch (dropError) {
              console.log(
                `⚠️ Could not drop ${index.name}: ${dropError.message}`
              );
            }
          }
        }
      }
    }

    // 4. List indexes again to confirm
    console.log("\n📋 Final list of indexes:");
    const finalIndexes = await collection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log("🚀 Now restart your server and try booking again!");
  } catch (error) {
    console.error("❌ Error:", error.message);

    // If index not found error
    if (error.code === 27 || error.message.includes("index not found")) {
      console.log("ℹ️ Index might already be dropped.");
    }

    console.error("Full error:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("✅ Disconnected from MongoDB");
    }
  }
}

dropProblematicIndex();
