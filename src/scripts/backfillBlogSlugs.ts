import mongoose from "mongoose";
import connectDB from "../app/config/db";
import Blog from "../app/modules/Blog/blog.model";

function toSlug(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isObjectIdLike(value?: string | null) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

async function createUniqueSlug(base: string, excludeId?: string) {
  const root = toSlug(base);
  if (!root) return "";

  let attempt = root;
  let suffix = 2;

  while (true) {
    const query: Record<string, any> = { slug: attempt };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Blog.exists(query);
    if (!exists) return attempt;
    attempt = `${root}-${suffix++}`;
  }
}

async function run() {
  await connectDB();

  const cursor = Blog.find({})
    .select("_id title slug")
    .cursor();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for await (const blog of cursor) {
    scanned += 1;
    const title = String((blog as any).title || "").trim();
    const currentSlug = String((blog as any).slug || "").trim();
    const needsFix = !currentSlug || isObjectIdLike(currentSlug);

    if (!needsFix || !title) {
      skipped += 1;
      continue;
    }

    const slug = await createUniqueSlug(title, String((blog as any)._id));
    if (!slug) {
      skipped += 1;
      continue;
    }

    await Blog.updateOne({ _id: (blog as any)._id }, { $set: { slug } });
    updated += 1;
  }

  console.log(
    `[backfill-blog-slugs] scanned=${scanned} updated=${updated} skipped=${skipped}`,
  );
}

run()
  .catch((error) => {
    console.error("[backfill-blog-slugs] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });

