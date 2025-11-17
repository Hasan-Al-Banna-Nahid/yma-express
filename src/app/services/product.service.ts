import { Request } from "express";
import Product, { IProductModel } from "../models/product.model";
import Location from "../models/location.model";
import ApiError from "../utils/apiError";
import mongoose from "mongoose";

export const getAllProducts = async (
  query: any = {}
): Promise<{ products: IProductModel[]; total: number }> => {
  const {
    page = 1,
    limit = 10,
    category,
    location,
    minPrice,
    maxPrice,
    difficulty,
    search,
    availableFrom,
    availableUntil,
    availableOn, // NEW: Single specific date field
    sort = "-createdAt",
  } = query;

  // Build filter object - only show active products by default
  let filterObj: any = { isActive: true };

  // Location filter - handle both ObjectId and string
  if (location) {
    if (mongoose.Types.ObjectId.isValid(location)) {
      filterObj.location = new mongoose.Types.ObjectId(location);
    } else {
      throw new ApiError("Invalid location ID format", 400);
    }
  }

  // Category filter
  if (category) {
    filterObj.categories = Array.isArray(category)
      ? { $in: category }
      : category;
  }

  // Difficulty filter
  if (difficulty) {
    filterObj.difficulty = Array.isArray(difficulty)
      ? { $in: difficulty }
      : difficulty;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    filterObj.price = {};
    if (minPrice) filterObj.price.$gte = Number(minPrice);
    if (maxPrice) filterObj.price.$lte = Number(maxPrice);
  }

  // Search filter
  if (search) {
    filterObj.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { summary: { $regex: search, $options: "i" } },
    ];
  }

  // NEW: Single date availability filter
  if (availableOn) {
    const targetDate = new Date(availableOn);
    if (isNaN(targetDate.getTime())) {
      throw new ApiError("Invalid availableOn date format", 400);
    }

    // Check if product is available on that specific date
    filterObj.$and = [
      { availableFrom: { $lte: targetDate } },
      {
        $or: [
          { availableUntil: { $gte: targetDate } },
          { availableUntil: null },
        ],
      },
    ];

    // Also check booking availability for that specific date
    const aggregationPipeline: any[] = [
      { $match: filterObj },
      {
        $lookup: {
          from: "bookings",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$productId"] },
                    { $eq: ["$status", "confirmed"] },
                    {
                      $or: [
                        // Date falls within booking period
                        {
                          $and: [
                            { $lte: ["$startDate", targetDate] },
                            { $gte: ["$endDate", targetDate] },
                          ],
                        },
                        // Or exact date match for single-day bookings
                        { $eq: ["$bookingDate", targetDate] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "activeBookings",
        },
      },
      {
        $addFields: {
          bookedCount: { $size: "$activeBookings" },
          isAvailable: {
            $lt: [{ $size: "$activeBookings" }, "$stock"],
          },
        },
      },
      {
        $match: {
          isAvailable: true,
        },
      },
    ];

    // Parse sort options
    let sortObj: any = {};
    if (sort) {
      const sortFields = (sort as string).split(",");
      sortFields.forEach((field) => {
        const sortOrder = field.startsWith("-") ? -1 : 1;
        const fieldName = field.replace("-", "");
        sortObj[fieldName] = sortOrder;
      });
    } else {
      sortObj = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute aggregation with population
    const aggregationWithPagination = [
      ...aggregationPipeline,
      { $sort: sortObj },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "locations",
          localField: "location",
          foreignField: "_id",
          as: "location",
        },
      },
      { $unwind: "$location" },
    ];

    const products = await Product.aggregate(aggregationWithPagination);

    // Get total count
    const countPipeline = [...aggregationPipeline, { $count: "total" }];

    const countResult = await Product.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    return { products: products as IProductModel[], total };
  }

  // Original date range filter (keep existing functionality)
  if (availableFrom || availableUntil) {
    filterObj.$and = [];

    if (availableFrom) {
      const fromDate = new Date(availableFrom);
      if (isNaN(fromDate.getTime())) {
        throw new ApiError("Invalid availableFrom date format", 400);
      }
      filterObj.$and.push({
        $or: [{ availableUntil: { $gte: fromDate } }, { availableUntil: null }],
      });
    }

    if (availableUntil) {
      const untilDate = new Date(availableUntil);
      if (isNaN(untilDate.getTime())) {
        throw new ApiError("Invalid availableUntil date format", 400);
      }
      filterObj.$and.push({
        availableFrom: { $lte: untilDate },
      });
    }

    if (filterObj.$and.length === 0) {
      delete filterObj.$and;
    }
  }

  // Parse sort options
  let sortObj: any = {};
  if (sort) {
    const sortFields = (sort as string).split(",");
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1;
      const fieldName = field.replace("-", "");
      sortObj[fieldName] = sortOrder;
    });
  } else {
    sortObj = { createdAt: -1 };
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Execute query with population (for non-date-specific queries)
  const products = await Product.find(filterObj)
    .populate("categories")
    .populate({
      path: "location",
      select:
        "name type country state city fullAddress coordinates description",
    })
    .sort(sortObj)
    .skip(skip)
    .limit(Number(limit));

  // Get total count for pagination
  const total = await Product.countDocuments(filterObj);

  return { products, total };
};

export const getProductById = async (
  id: string
): Promise<IProductModel | null> => {
  console.log("🔍 Searching for product with ID:", id);

  if (!id) {
    throw new ApiError("Product ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid product ID format", 400);
  }

  try {
    // First, try without population to see if product exists
    const product = await Product.findById(id);
    console.log("📦 Raw product found:", product);
    console.log("isActive value:", product?.isActive);
    console.log("isActive type:", typeof product?.isActive);

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Fix: Check if isActive is explicitly false, not just falsy
    if (product.isActive === false) {
      console.log("⚠️ Product found but isActive is explicitly false");
      throw new ApiError("Product is not available", 404);
    }

    // If isActive is undefined, null, or true, allow access
    console.log("✅ Product is accessible (isActive is not false)");

    // Now populate the relationships
    const populatedProduct = await Product.findById(id)
      .populate("categories")
      .populate({
        path: "location",
        select:
          "name type country state city fullAddress coordinates description",
      });

    console.log("✅ Populated product:", populatedProduct);

    if (!populatedProduct) {
      throw new ApiError("Product not found after population", 404);
    }

    return populatedProduct;
  } catch (error) {
    console.error("❌ Error in getProductById:", error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError("Error fetching product", 500);
  }
};

export const createProduct = async (
  productData: Partial<IProductModel>
): Promise<IProductModel> => {
  // Validate location exists
  if (productData.location) {
    const location = await Location.findById(productData.location);
    if (!location) {
      throw new ApiError("Location not found", 404);
    }
  }

  // Validate dates
  if (productData.availableFrom && productData.availableUntil) {
    if (
      new Date(productData.availableUntil) <=
      new Date(productData.availableFrom)
    ) {
      throw new ApiError(
        "Available until date must be after available from date",
        400
      );
    }
  }

  // Validate price discount
  if (productData.priceDiscount && productData.price) {
    if (productData.priceDiscount >= productData.price) {
      throw new ApiError(
        "Price discount must be less than the original price",
        400
      );
    }
  }

  const product = await Product.create(productData);

  // Populate the location and categories before returning
  await product.populate("categories");
  await product.populate({
    path: "location",
    select: "name type country state city fullAddress coordinates",
  });

  return product;
};

export const updateProduct = async (
  id: string,
  updateData: Partial<IProductModel>
): Promise<IProductModel | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid product ID format", 400);
  }

  // Validate location if provided
  if (updateData.location) {
    const location = await Location.findById(updateData.location);
    if (!location) {
      throw new ApiError("Location not found", 404);
    }
  }

  // Validate dates if both are provided
  if (updateData.availableFrom && updateData.availableUntil) {
    if (
      new Date(updateData.availableUntil) <= new Date(updateData.availableFrom)
    ) {
      throw new ApiError(
        "Available until date must be after available from date",
        400
      );
    }
  }

  // Validate price discount
  if (
    updateData.priceDiscount !== undefined &&
    updateData.price !== undefined
  ) {
    if (updateData.priceDiscount >= updateData.price) {
      throw new ApiError(
        "Price discount must be less than the original price",
        400
      );
    }
  }

  const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("categories")
    .populate({
      path: "location",
      select: "name type country state city fullAddress coordinates",
    });

  if (!product) {
    throw new ApiError("Product not found", 404);
  }
  return product;
};

export const deleteProduct = async (id: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid product ID format", 400);
  }

  const product = await Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!product) {
    throw new ApiError("Product not found", 404);
  }
};

export const getAvailableLocations = async (): Promise<any[]> => {
  const locations = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "locations",
        localField: "location",
        foreignField: "_id",
        as: "locationData",
      },
    },
    { $unwind: "$locationData" },
    {
      $group: {
        _id: "$locationData._id",
        name: { $first: "$locationData.name" },
        type: { $first: "$locationData.type" },
        country: { $first: "$locationData.country" },
        state: { $first: "$locationData.state" },
        city: { $first: "$locationData.city" },
        productCount: { $sum: 1 },
      },
    },
    { $sort: { productCount: -1, name: 1 } },
  ]);

  return locations;
};

export const searchProductsByLocation = async (
  locationQuery: string,
  filters: any = {}
): Promise<{ products: IProductModel[]; total: number }> => {
  const aggregationPipeline: any[] = [
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "locations",
        localField: "location",
        foreignField: "_id",
        as: "locationData",
      },
    },
    { $unwind: "$locationData" },
    {
      $match: {
        $or: [
          { "locationData.country": { $regex: locationQuery, $options: "i" } },
          { "locationData.state": { $regex: locationQuery, $options: "i" } },
          { "locationData.city": { $regex: locationQuery, $options: "i" } },
          { "locationData.name": { $regex: locationQuery, $options: "i" } },
        ],
      },
    },
  ];

  // Add other filters
  if (filters.travelDate) {
    const targetDate = new Date(filters.travelDate);
    if (isNaN(targetDate.getTime())) {
      throw new ApiError("Invalid travelDate format", 400);
    }
    aggregationPipeline.push({
      $match: {
        availableFrom: { $lte: targetDate },
        availableUntil: { $gte: targetDate },
      },
    });
  }

  if (filters.minPrice || filters.maxPrice) {
    const priceFilter: any = {};
    if (filters.minPrice) priceFilter.$gte = Number(filters.minPrice);
    if (filters.maxPrice) priceFilter.$lte = Number(filters.maxPrice);
    aggregationPipeline.push({ $match: { price: priceFilter } });
  }

  if (filters.difficulty) {
    aggregationPipeline.push({
      $match: {
        difficulty: Array.isArray(filters.difficulty)
          ? { $in: filters.difficulty }
          : filters.difficulty,
      },
    });
  }

  if (filters.category) {
    aggregationPipeline.push({
      $match: {
        categories: Array.isArray(filters.category)
          ? { $in: filters.category }
          : filters.category,
      },
    });
  }

  // Add pagination
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  // Count total before pagination
  const countPipeline = [...aggregationPipeline];
  countPipeline.push({ $count: "total" });

  const countResult = await Product.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Add pagination and population
  aggregationPipeline.push(
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "categories",
        localField: "categories",
        foreignField: "_id",
        as: "categories",
      },
    }
  );

  const products = await Product.aggregate(aggregationPipeline);

  return { products: products as IProductModel[], total };
};

// Additional utility function to get products by category
export const getProductsByCategory = async (
  categoryId: string,
  query: any = {}
): Promise<{ products: IProductModel[]; total: number }> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError("Invalid category ID format", 400);
  }

  const filterObj = {
    isActive: true,
    categories: categoryId,
  };

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const products = await Product.find(filterObj)
    .populate("categories")
    .populate({
      path: "location",
      select:
        "name type country state city fullAddress coordinates description",
    })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filterObj);

  return { products, total };
};
