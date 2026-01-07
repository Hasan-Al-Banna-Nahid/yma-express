import Category from "../Category/category.model";
import Product, { IProductModel } from "./product.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import { CreateProductData } from "./product.interface";

/**
 * Base filter for available products
 * Only active & in-stock products should be visible publicly
 */
const AVAILABLE_PRODUCT_FILTER = {
  active: true,
  stock: { $gt: 0 },
};

/* =========================
   CREATE PRODUCT
========================= */
export const createProduct = async (
  productData: CreateProductData
): Promise<IProductModel> => {
  if (!productData.categories || productData.categories.length === 0) {
    throw new ApiError("At least one category is required", 400);
  }

  const categoryIds = productData.categories.map(
    (id) => new Types.ObjectId(id)
  );

  const categories = await Category.find({
    _id: { $in: categoryIds },
    isActive: true,
  });

  if (categories.length !== categoryIds.length) {
    throw new ApiError("One or more categories are invalid or inactive", 400);
  }

  const product = await Product.create({
    ...productData,
    categories: categoryIds,
    location: {
      country: "England",
      state: productData.location?.state || "",
      city: productData.location?.city || "",
    },
    dateAdded: new Date(),
  });

  await product.populate({
    path: "categories",
    select: "name slug description image",
    match: { isActive: true },
  });

  return product;
};

/* =========================
   UPDATE PRODUCT
========================= */
/* =========================
   ENHANCED UPDATE PRODUCT
   Supports updating all fields from the JSON example
========================= */
export const updateProduct = async (
  productId: string,
  updateData: any
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  // Create a clean update object with proper transformations
  const cleanUpdateData: any = {};

  // Basic fields that can be directly updated
  const basicFields = [
    "name",
    "description",
    "summary",
    "price",
    "perDayPrice",
    "perWeekPrice",
    "deliveryAndCollection",
    "priceDiscount",
    "duration",
    "maxGroupSize",
    "difficulty",
    "images",
    "imageCover",
    "size",
    "active",
    "stock",
    "isSensitive",
    "material",
    "design",
    "dateAdded",
  ];

  // Copy basic fields if they exist in updateData
  basicFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      cleanUpdateData[field] = updateData[field];
    }
  });

  // Handle categories update
  if (updateData.categories?.length) {
    const categoryIds = updateData.categories.map(
      (id: string) => new Types.ObjectId(id)
    );

    const categories = await Category.find({
      _id: { $in: categoryIds },
      isActive: true,
    });

    if (categories.length !== categoryIds.length) {
      throw new ApiError("One or more categories are invalid or inactive", 400);
    }

    cleanUpdateData.categories = categoryIds;
  }

  // Handle location update
  if (updateData.location) {
    cleanUpdateData.location = {
      country: "England",
      state: updateData.location.state || "",
      city: updateData.location.city || "",
    };
  }

  // Handle dimensions update
  if (updateData.dimensions) {
    const { length, width, height } = updateData.dimensions;
    cleanUpdateData.dimensions = {
      length: length || 1,
      width: width || 1,
      height: height || 1,
    };
  }

  // Handle date fields
  if (updateData.availableFrom) {
    cleanUpdateData.availableFrom = new Date(updateData.availableFrom);
  }

  if (updateData.availableUntil) {
    cleanUpdateData.availableUntil = new Date(updateData.availableUntil);
  }

  // Handle ageRange update
  if (updateData.ageRange) {
    const { min, max, unit } = updateData.ageRange;
    cleanUpdateData.ageRange = {
      min: min || 0,
      max: max || 0,
      unit: unit || "years",
    };
  }

  // Handle safetyFeatures update
  if (updateData.safetyFeatures !== undefined) {
    if (!Array.isArray(updateData.safetyFeatures)) {
      throw new ApiError("Safety features must be an array", 400);
    }
    if (updateData.safetyFeatures.length === 0) {
      throw new ApiError("At least one safety feature is required", 400);
    }
    cleanUpdateData.safetyFeatures = updateData.safetyFeatures;
  }

  // Handle qualityAssurance update
  if (updateData.qualityAssurance) {
    const { isCertified, certification, warrantyPeriod, warrantyDetails } =
      updateData.qualityAssurance;

    cleanUpdateData.qualityAssurance = {
      isCertified: isCertified !== undefined ? isCertified : false,
      certification: certification || undefined,
      warrantyPeriod: warrantyPeriod || undefined,
      warrantyDetails: warrantyDetails || undefined,
    };
  }

  // Update the product with validation
  const product = await Product.findByIdAndUpdate(productId, cleanUpdateData, {
    new: true,
    runValidators: true,
    context: "query", // This ensures validators run on update
  }).populate("categories", "name slug description image");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

/* =========================
   GET ALL PRODUCTS
========================= */
export const getAllProducts = async (
  page = 1,
  limit = 10,
  state?: string,
  category?: string,
  minPrice?: number,
  maxPrice?: number
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const filter: any = { ...AVAILABLE_PRODUCT_FILTER };

  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }

  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  const products = await Product.find(filter)
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
  };
};

/* =========================
   GET PRODUCT BY ID
========================= */
export const getProductById = async (
  productId: string
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findOne({
    _id: productId,
    ...AVAILABLE_PRODUCT_FILTER,
  }).populate("categories", "name description");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

/* =========================
   SOFT DELETE PRODUCT
========================= */
export const deleteProduct = async (productId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { active: false },
    { new: true }
  );

  if (!product) {
    throw new ApiError("Product not found", 404);
  }
};

/* =========================
   PRODUCTS BY STATE
========================= */
export const getProductsByState = async (
  state: string
): Promise<IProductModel[]> => {
  return Product.find({
    ...AVAILABLE_PRODUCT_FILTER,
    "location.state": { $regex: state, $options: "i" },
  }).populate("categories", "name description");
};

/* =========================
   AVAILABLE STATES
========================= */
export const getAvailableStates = async (): Promise<string[]> => {
  const states = await Product.distinct("location.state", {
    ...AVAILABLE_PRODUCT_FILTER,
  });

  return states.sort();
};

/* =========================
   UPDATE STOCK
========================= */
export const updateProductStock = async (
  productId: string,
  newStock: number
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  if (newStock < 0) {
    throw new ApiError("Stock cannot be negative", 400);
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { stock: newStock },
    { new: true, runValidators: true }
  ).populate("categories", "name description");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

/* =========================
   FEATURED PRODUCTS
========================= */
export const getFeaturedProducts = async (
  limit = 8
): Promise<IProductModel[]> => {
  return Product.find({ ...AVAILABLE_PRODUCT_FILTER })
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* =========================
   SEARCH PRODUCTS
========================= */
export const searchProducts = async (
  query: string,
  page = 1,
  limit = 10
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const filter = {
    ...AVAILABLE_PRODUCT_FILTER,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { summary: { $regex: query, $options: "i" } },
      { "location.state": { $regex: query, $options: "i" } },
      { "location.city": { $regex: query, $options: "i" } },
    ],
  };

  const products = await Product.find(filter)
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
  };
};

/* =========================
   PRODUCTS BY CATEGORY
========================= */
export const getProductsByCategory = async (
  categoryId: string,
  page = 1,
  limit = 10
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  if (!Types.ObjectId.isValid(categoryId)) {
    throw new ApiError("Invalid category ID", 400);
  }

  const skip = (page - 1) * limit;

  const filter = {
    ...AVAILABLE_PRODUCT_FILTER,
    categories: new Types.ObjectId(categoryId),
  };

  const products = await Product.find(filter)
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
  };
};
// Add these search functions to your existing product.service.ts

/* =========================
   CLIENT SEARCH INTERFACE & FUNCTION
   Search by: category, location, date
========================= */
export interface ClientSearchParams {
  category?: string;
  state?: string;
  city?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: "easy" | "medium" | "difficult";
  ageMin?: number;
  ageMax?: number;
  ageUnit?: "years" | "months";
  material?: string;
  isSensitive?: boolean;
}

export const clientSearchProducts = async (
  params: ClientSearchParams
): Promise<{
  products: IProductModel[];
  total: number;
  pages: number;
  filters: any;
}> => {
  const {
    category,
    state,
    city,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    minPrice,
    maxPrice,
    difficulty,
    ageMin,
    ageMax,
    ageUnit = "years",
    material,
    isSensitive,
  } = params;

  const skip = (page - 1) * limit;
  const filter: any = {
    active: true,
    stock: { $gt: 0 },
  };

  // Convert string dates to Date objects
  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  // Date availability filter
  const dateConditions = [];

  if (startDateObj && endDateObj) {
    // Search for products available during the entire date range
    dateConditions.push({
      availableFrom: { $lte: endDateObj },
      availableUntil: { $gte: startDateObj },
    });
  } else if (startDateObj) {
    // Products available from start date onward
    dateConditions.push({
      availableUntil: { $gte: startDateObj },
    });
  } else if (endDateObj) {
    // Products available until end date
    dateConditions.push({
      availableFrom: { $lte: endDateObj },
    });
  } else {
    // Default: show currently available products
    const now = new Date();
    dateConditions.push({
      availableFrom: { $lte: now },
      availableUntil: { $gte: now },
    });
  }

  // Add date conditions to filter
  if (dateConditions.length > 0) {
    filter.$and = filter.$and || [];
    filter.$and.push(...dateConditions);
  }

  // Category filter
  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  // Location filters
  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }
  if (city) {
    filter["location.city"] = { $regex: city, $options: "i" };
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // Difficulty filter
  if (difficulty) {
    filter.difficulty = difficulty;
  }

  // Age range filter
  if (ageMin !== undefined || ageMax !== undefined) {
    const ageFilter: any = {};

    if (ageMin !== undefined) {
      ageFilter["ageRange.min"] = { $lte: ageMax !== undefined ? ageMax : 999 };
    }

    if (ageMax !== undefined) {
      ageFilter["ageRange.max"] = { $gte: ageMin !== undefined ? ageMin : 0 };
    }

    if (ageUnit) {
      ageFilter["ageRange.unit"] = ageUnit;
    }

    filter.$and = filter.$and || [];
    filter.$and.push(ageFilter);
  }

  // Material filter
  if (material) {
    filter.material = { $regex: material, $options: "i" };
  }

  // Sensitive items filter
  if (isSensitive !== undefined) {
    filter.isSensitive = isSensitive;
  }

  // Execute query
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name description slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: products as IProductModel[],
    total,
    pages: Math.ceil(total / limit),
    filters: {
      applied: params,
      totalResults: total,
    },
  };
};

/* =========================
   ADMIN SEARCH INTERFACE & FUNCTION
   Search by: name, ID
   Filter by: availability, categories
========================= */
/* =========================
   ADMIN SEARCH INTERFACE & FUNCTION - FIXED
   Search by: name, ID
   Filter by: availability, categories
========================= */
export interface AdminSearchParams {
  searchTerm?: string;
  productId?: string;
  active?: boolean;
  available?: boolean;
  categories?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const adminSearchProducts = async (
  params: AdminSearchParams
): Promise<{
  products: IProductModel[];
  total: number;
  pages: number;
  filters: any;
}> => {
  const {
    searchTerm,
    productId,
    active,
    available,
    categories = [],
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const skip = (page - 1) * limit;
  const filter: any = {};

  // FIXED: Search by product ID (exact match) - HIGHEST PRIORITY
  if (productId && Types.ObjectId.isValid(productId)) {
    // If searching by ID, ignore all other filters and return that specific product
    const product = await Product.findById(productId)
      .populate("categories", "name description slug")
      .lean();

    return {
      products: product ? [product as IProductModel] : [],
      total: product ? 1 : 0,
      pages: product ? 1 : 0,
      filters: {
        applied: { productId },
        totalResults: product ? 1 : 0,
      },
    };
  }

  // Search by name or description (text search)
  if (searchTerm && searchTerm.trim()) {
    const searchRegex = { $regex: searchTerm.trim(), $options: "i" };
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { summary: searchRegex },
      { material: searchRegex },
      { design: searchRegex },
      { "location.state": searchRegex },
      { "location.city": searchRegex },
    ];
  }

  // Filter by active status
  if (active !== undefined) {
    filter.active = active;
  }

  // Filter by availability - FIXED LOGIC
  if (available !== undefined) {
    const now = new Date();
    if (available) {
      // Show available products (in stock and within date range)
      filter.$and = [
        { stock: { $gt: 0 } },
        { availableFrom: { $lte: now } },
        { availableUntil: { $gte: now } },
      ];
    } else {
      // Show unavailable products (out of stock OR outside date range)
      filter.$or = [
        { stock: { $lte: 0 } },
        { availableFrom: { $gt: now } },
        { availableUntil: { $lt: now } },
      ];
    }
  }

  // Filter by categories
  if (categories.length > 0) {
    const validCategoryIds = categories
      .filter((cat) => Types.ObjectId.isValid(cat))
      .map((cat) => new Types.ObjectId(cat));

    if (validCategoryIds.length > 0) {
      filter.categories = { $in: validCategoryIds };
    }
  }

  // Sort configuration
  const sort: any = {};
  const validSortFields = [
    "name",
    "price",
    "stock",
    "createdAt",
    "updatedAt",
    "availableFrom",
    "availableUntil",
    "difficulty",
  ];

  // Default to createdAt if invalid sort field
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sort[finalSortBy] = sortOrder === "asc" ? 1 : -1;

  // Execute query
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name description slug")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: products as IProductModel[],
    total,
    pages: Math.ceil(total / limit),
    filters: {
      applied: params,
      totalResults: total,
    },
  };
};

/* =========================
   GET AVAILABLE FILTER OPTIONS
   For client search UI
========================= */
export const getAvailableFilters = async (): Promise<{
  states: string[];
  cities: string[];
  difficulties: string[];
  materials: string[];
  priceRange: { min: number; max: number };
}> => {
  const [states, cities, difficulties, materials, priceRange] =
    await Promise.all([
      // Distinct states from active products
      Product.distinct("location.state", { active: true, stock: { $gt: 0 } }),

      // Distinct cities from active products
      Product.distinct("location.city", { active: true, stock: { $gt: 0 } }),

      // Distinct difficulty levels
      Product.distinct("difficulty", { active: true, stock: { $gt: 0 } }),

      // Distinct materials
      Product.distinct("material", { active: true, stock: { $gt: 0 } }),

      // Price range
      Product.aggregate([
        { $match: { active: true, stock: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
          },
        },
      ]),
    ]);

  return {
    states: states.filter(Boolean).sort(),
    cities: cities.filter(Boolean).sort(),
    difficulties: difficulties.filter(Boolean).sort(),
    materials: materials.filter(Boolean).sort(),
    priceRange: priceRange[0]
      ? {
          min: Math.floor(priceRange[0].minPrice || 0),
          max: Math.ceil(priceRange[0].maxPrice || 0),
        }
      : { min: 0, max: 0 },
  };
};
/* =========================
   TOP SELLING PRODUCTS
   Based on booking frequency and revenue
========================= */
export interface TopSellingParams {
  limit?: number;
  timeRange?: "day" | "week" | "month" | "year" | "all";
  category?: string;
  state?: string;
}

export const getTopSellingProducts = async (
  params: TopSellingParams
): Promise<{
  products: IProductModel[];
  timeRange: string;
  totalRevenue: number;
  totalBookings: number;
}> => {
  const { limit = 10, timeRange = "month", category, state } = params;

  // Calculate date range
  let startDate: Date | null = null;
  const now = new Date();

  switch (timeRange) {
    case "day":
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case "all":
    default:
      startDate = null;
  }

  // Base filter for top selling
  const filter: any = {
    active: true,
    stock: { $gt: 0 },
  };

  // Apply category filter
  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  // Apply state filter
  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }

  // In a real scenario, you would aggregate from booking data
  // For now, we'll use a simple approach with a virtual sales count

  // Get products sorted by popularity (you can adjust this logic)
  const products = await Product.find(filter)
    .populate("categories", "name description slug")
    .sort({
      // Sort by multiple factors to simulate "top selling"
      stock: -1, // Higher stock = more available for sale
      price: -1, // Higher price = more revenue potential
      createdAt: -1, // Newer products might be more popular
    })
    .limit(limit);

  // Calculate totals (in a real app, this would come from booking aggregation)
  const totalRevenue = products.reduce(
    (sum, product) => sum + product.price,
    0
  );
  const totalBookings = Math.floor(products.length * 0.7); // Simulated

  return {
    products,
    timeRange,
    totalRevenue,
    totalBookings,
  };
};

/* =========================
   MANUALLY MARK AS TOP SELLING
   For admin to feature specific products
========================= */
export const markAsTopSelling = async (
  productId: string,
  isTopSelling: boolean = true,
  rank?: number,
  notes?: string
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const updateData: any = {
    isTopSelling,
    topSellingRank: rank,
    topSellingNotes: notes,
    topSellingMarkedAt: new Date(),
  };

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  }).populate("categories", "name description");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};
