import mongoose from "mongoose";
import connectDB from "../app/config/db";
import Product from "../app/modules/Product/product.model";

function toSlug(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueSlug(base: string, excludeId?: string) {
  const root = toSlug(base);
  if (!root) return "";

  let attempt = root;
  let suffix = 2;

  while (true) {
    const query: Record<string, any> = { slug: attempt };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Product.exists(query);
    if (!exists) return attempt;
    attempt = `${root}-${suffix++}`;
  }
}

async function run() {
  await connectDB();

  const cursor = Product.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  })
    .select("_id name slug")
    .cursor();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for await (const product of cursor) {
    scanned += 1;
    const name = String((product as any).name || "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const slug = await createUniqueSlug(name, String((product as any)._id));
    if (!slug) {
      skipped += 1;
      continue;
    }

    await Product.updateOne({ _id: (product as any)._id }, { $set: { slug } });
    updated += 1;
  }

  console.log(
    `[backfill-product-slugs] scanned=${scanned} updated=${updated} skipped=${skipped}`,
  );
}

run()
  .catch((error) => {
    console.error("[backfill-product-slugs] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });

