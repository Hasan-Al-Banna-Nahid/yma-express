import mongoose from "mongoose";
import connectDB from "../app/config/db";
import Product from "../app/modules/Product/product.model";
import Inventory from "../app/modules/Inventory/inventory.model";

async function run() {
  await connectDB();

  const productResult = await Product.updateMany(
    {},
    {
      $set: {
        stock: 1,
      },
    },
  );

  const inventoryResult = await Inventory.updateMany(
    {},
    {
      $set: {
        quantity: 1,
      },
    },
  );

  console.log(
    `[normalize-quantity] products matched=${productResult.matchedCount} modified=${productResult.modifiedCount}`,
  );
  console.log(
    `[normalize-quantity] inventory matched=${inventoryResult.matchedCount} modified=${inventoryResult.modifiedCount}`,
  );
}

run()
  .catch((error) => {
    console.error("[normalize-quantity] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });
