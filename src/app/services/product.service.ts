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

  // Category filter - handle both single and multiple categories
  if (category) {
    filterObj.categories = Array.isArray(category)
      ? { $in: category }
      : category;
  }

  // Difficulty filter - handle both single and multiple difficulties
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

  // Search filter (by product name, description, or summary)
  if (search) {
    filterObj.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { summary: { $regex: search, $options: "i" } },
    ];
  }

  // Date availability filter
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

    // If no date conditions were added, remove the $and array
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
    sortObj = { createdAt: -1 }; // Default sort by newest first
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Execute query with population
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid product ID format", 400);
  }

  const product = await Product.findById(id).populate("categories").populate({
    path: "location",
    select: "name type country state city fullAddress coordinates description",
  });

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  if (!product.isActive) {
    throw new ApiError("Product is not available", 404);
  }

  return product;
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
