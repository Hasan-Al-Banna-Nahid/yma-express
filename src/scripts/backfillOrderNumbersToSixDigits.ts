import mongoose from "mongoose";
import connectDB from "../app/config/db";
import Order from "../app/modules/Order/order.model";

const SIX_DIGIT_REGEX = /^\d{6}$/;

const generateSixDigit = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const isSixDigitOrderNumber = (value?: string | null): boolean =>
  SIX_DIGIT_REGEX.test(String(value || "").trim());

async function getUniqueSixDigitOrderNumber(
  usedInRun: Set<string>,
): Promise<string> {
  for (let attempts = 0; attempts < 50; attempts += 1) {
    const candidate = generateSixDigit();
    if (usedInRun.has(candidate)) continue;

    const exists = await Order.exists({ orderNumber: candidate });
    if (!exists) {
      usedInRun.add(candidate);
      return candidate;
    }
  }

  throw new Error("Unable to generate unique 6-digit order number");
}

async function run() {
  await connectDB();

  const cursor = Order.find({})
    .select("_id orderNumber createdAt")
    .sort({ createdAt: 1 })
    .cursor();

  const usedInRun = new Set<string>();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const order of cursor) {
    scanned += 1;
    const currentOrderNumber = String((order as any).orderNumber || "").trim();

    if (isSixDigitOrderNumber(currentOrderNumber)) {
      usedInRun.add(currentOrderNumber);
      skipped += 1;
      continue;
    }

    try {
      const nextOrderNumber = await getUniqueSixDigitOrderNumber(usedInRun);
      await Order.updateOne(
        { _id: (order as any)._id },
        { $set: { orderNumber: nextOrderNumber } },
      );
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[order-id-backfill] failed for order=${String((order as any)._id)} current=${currentOrderNumber || "EMPTY"}`,
        error,
      );
    }
  }

  console.log(
    `[order-id-backfill] scanned=${scanned} updated=${updated} skipped=${skipped} failed=${failed}`,
  );
}

run()
  .catch((error) => {
    console.error("[order-id-backfill] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });
