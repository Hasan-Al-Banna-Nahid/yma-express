import Category from "../Category/category.model";
import Product, { IProductModel } from "./product.model";
import ApiError from "../../utils/apiError";
import { ObjectId, Types } from "mongoose";
import { CreateProductData } from "./product.interface";
import { deleteFromCloudinary } from "../../utils/cloudinary.util";

const AVAILABLE_PRODUCT_FILTER = {
  active: true,
  stock: { $gt: 0 },
};

/* =========================
   CREATE PRODUCT WITH CLOUDINARY
========================= */
export const createProduct = async (
  productData: CreateProductData & {
    imageCover?: Express.Multer.File;
    images?: Express.Multer.File[];
  }
): Promise<IProductModel> => {
  // Validate required fields
  if (!productData.categories || productData.categories.length === 0) {
    throw new ApiError("At least one category is required", 400);
  }

  // Validate images
  if (!productData.images || productData.images.length === 0) {
    throw new ApiError("At least one image is required", 400);
  }

  if (productData.images.length > 5) {
    throw new ApiError("Maximum 5 images allowed", 400);
  }

  if (!productData.imageCover) {
    throw new ApiError("Cover image is required", 400);
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

  // For file uploads, we'll handle in controller
  // This function expects URLs from controller
  const product = await Product.create({
    name: productData.name,
    description: productData.description,
    summary: productData.summary,
    price: productData.price,
    perDayPrice: productData.perDayPrice,
    perWeekPrice: productData.perWeekPrice,
    deliveryAndCollection: productData.deliveryAndCollection,
    priceDiscount: productData.priceDiscount,
    duration: productData.duration,
    maxGroupSize: productData.maxGroupSize,
    difficulty: productData.difficulty,
    categories: categoryIds,
    images: productData.images as string[], // URLs from controller
    imageCover: productData.imageCover as string, // URL from controller
    location: {
      country: "England",
      state: productData.location?.state || "",
      city: productData.location?.city || "",
    },
    dimensions: productData.dimensions || {
      length: 1,
      width: 1,
      height: 1,
    },
    availableFrom: productData.availableFrom
      ? new Date(productData.availableFrom)
      : new Date(),
    availableUntil: productData.availableUntil
      ? new Date(productData.availableUntil)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    size: productData.size,
    active: productData.active !== undefined ? productData.active : true,
    stock: productData.stock || 0,
    isSensitive: productData.isSensitive || false,
    material: productData.material,
    design: productData.design,
    dateAdded: new Date(),
    deliveryTimeOptions: productData.deliveryTimeOptions || [
      "8am-12pm",
      "12pm-4pm",
      "4pm-8pm",
    ],
    collectionTimeOptions: productData.collectionTimeOptions || [
      "before_5pm",
      "after_5pm",
      "next_day",
    ],
    defaultDeliveryTime: productData.defaultDeliveryTime || "8am-12pm",
    defaultCollectionTime: productData.defaultCollectionTime || "before_5pm",
    deliveryTimeFee: productData.deliveryTimeFee || 0,
    collectionTimeFee: productData.collectionTimeFee || 0,
    ageRange: productData.ageRange || {
      min: 0,
      max: 0,
      unit: "years",
    },
    safetyFeatures: productData.safetyFeatures || [],
    qualityAssurance: productData.qualityAssurance || {
      isCertified: false,
    },
  });

  await product.populate({
    path: "categories",
    select: "name slug description image",
    match: { isActive: true },
  });

  return product;
};

/* =========================
   UPDATE PRODUCT WITH CLOUDINARY
========================= */
export const updateProduct = async (
  productId: string,
  updateData: any & {
    newImageCover?: Express.Multer.File;
    newImages?: Express.Multer.File[];
  }
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  // Find existing product
  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new ApiError("Product not found", 404);
  }

  // Create update object
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
    "size",
    "active",
    "stock",
    "isSensitive",
    "material",
    "design",
    "dateAdded",
    "deliveryTimeOptions",
    "collectionTimeOptions",
    "defaultDeliveryTime",
    "defaultCollectionTime",
    "deliveryTimeFee",
    "collectionTimeFee",
  ];

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

  // Handle images - if new images are uploaded
  if (updateData.newImages && Array.isArray(updateData.newImages)) {
    if (updateData.newImages.length > 5) {
      throw new ApiError("Maximum 5 images allowed", 400);
    }
    // Images will be URLs from controller
    cleanUpdateData.images = updateData.newImages;
  }

  // Handle image cover - if new cover is uploaded
  if (updateData.newImageCover) {
    // Image cover will be URL from controller
    cleanUpdateData.imageCover = updateData.newImageCover;
  }

  // Validate array limits for images
  if (cleanUpdateData.images && cleanUpdateData.images.length > 5) {
    throw new ApiError("Maximum 5 images allowed", 400);
  }

  // Update the product
  const product = await Product.findByIdAndUpdate(productId, cleanUpdateData, {
    new: true,
    runValidators: true,
    context: "query",
  }).populate("categories", "name slug description image");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

// ... rest of your existing service functions remain the same

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
// Add to your existing product.service.ts

export interface TopPicksParams {
  limit?: number;
  category?: string;
}

export const getTopPicks = async (
  limit: number = 8
): Promise<IProductModel[]> => {
  // Get products marked as top picks first
  const topPicks = await Product.find({
    active: true,
    stock: { $gt: 0 },
    isTopPick: true, // New field we'll add
  })
    .populate("categories", "name slug")
    .sort({ topPickRank: 1, createdAt: -1 })
    .limit(limit);

  // If we don't have enough top picks, fill with featured products
  if (topPicks.length < limit) {
    const featuredProducts = await Product.find({
      active: true,
      stock: { $gt: 0 },
      isTopPick: false,
      _id: { $nin: topPicks.map((p) => p._id) },
    })
      .populate("categories", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit - topPicks.length);

    return [...topPicks, ...featuredProducts];
  }

  return topPicks;
};

export const markAsTopPick = async (
  productId: string,
  isTopPick: boolean = true,
  rank?: number
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const updateData: any = {
    isTopPick,
    topPickRank: rank,
    topPickUpdatedAt: new Date(),
  };

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  }).populate("categories", "name slug");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

// ... all your existing imports and functions remain

// Add these new interfaces at the top
interface CartItem {
  productId: string;
  quantity: number;
}

/* =========================
   GET FREQUENTLY BOUGHT TOGETHER
========================= */
export const getFrequentlyBoughtTogether = async (
  productIds: string[],
  limit: number = 5
): Promise<IProductModel[]> => {
  if (!productIds || productIds.length === 0) {
    return getPopularProducts(limit);
  }

  const objectIds = productIds.map((id) => new Types.ObjectId(id));

  // For single product
  if (objectIds.length === 1) {
    const product = await Product.findById(objectIds[0])
      .populate({
        path: "frequentlyBoughtTogether.productId",
        match: { active: true, stock: { $gt: 0 } },
        select: "name price imageCover categories material description",
      })
      .exec();

    if (!product || !product.frequentlyBoughtTogether) {
      return getPopularProducts(limit);
    }

    // Filter and sort recommendations
    const recommendations = product.frequentlyBoughtTogether
      .filter((item) => item.productId && item.productId !== null)
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, limit)
      .map((item) => {
        // Type guard to ensure productId is populated
        if (item.productId && typeof item.productId !== "string") {
          return item.productId as unknown as IProductModel;
        }
        return null;
      })
      .filter((item): item is IProductModel => item !== null);

    return recommendations;
  }

  // For multiple products, find common recommendations
  const products = await Product.find({
    _id: { $in: objectIds },
  })
    .select("frequentlyBoughtTogether")
    .exec();

  if (products.length === 0) {
    return getPopularProducts(limit);
  }

  // Aggregate recommendations
  const recommendationScores = new Map<string, number>();

  products.forEach((product) => {
    if (product.frequentlyBoughtTogether) {
      product.frequentlyBoughtTogether.forEach((item) => {
        const itemId = item.productId.toString();

        // Skip if already in cart
        if (objectIds.some((id) => id.toString() === itemId)) {
          return;
        }

        const currentScore = recommendationScores.get(itemId) || 0;
        recommendationScores.set(itemId, currentScore + (item.frequency || 0));
      });
    }
  });

  // Sort by score and get top recommendations
  const sortedIds = Array.from(recommendationScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, limit)
    .map(([id]) => new Types.ObjectId(id));

  if (sortedIds.length === 0) {
    return getSimilarProducts(objectIds, limit);
  }

  // Fetch recommended products
  const recommendedProducts = await Product.find({
    _id: { $in: sortedIds },
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name slug")
    .select("name price imageCover categories material description")
    .exec();

  return recommendedProducts;
};

/* =========================
   GET CART RECOMMENDATIONS
========================= */
export const getCartRecommendations = async (
  cartItems: CartItem[],
  limit: number = 8
): Promise<IProductModel[]> => {
  if (!cartItems || cartItems.length === 0) {
    return getPopularProducts(limit);
  }

  // Convert to ObjectIds
  const productIds = cartItems
    .map((item) => {
      try {
        return new Types.ObjectId(item.productId);
      } catch {
        return null;
      }
    })
    .filter((id): id is Types.ObjectId => id !== null);

  if (productIds.length === 0) {
    return getPopularProducts(limit);
  }

  // Get recommendations
  const recommendations = await getFrequentlyBoughtTogether(
    productIds.map((id) => id.toString()),
    limit * 2
  );

  // Filter out products already in cart
  const cartIdSet = new Set(productIds.map((id) => id.toString()));
  const filtered = recommendations.filter(
    (product) =>
      product._id &&
      typeof product._id !== "string" &&
      !cartIdSet.has(product._id.toString())
  );

  // If not enough recommendations, add similar products
  if (filtered.length < limit) {
    const similar = await getSimilarProducts(
      productIds,
      limit - filtered.length
    );

    // Add unique similar products
    const filteredIds = new Set(
      filtered
        .map((p) => p._id?.toString())
        .filter((id): id is string => id !== undefined)
    );
    const uniqueSimilar = similar.filter(
      (product) =>
        product._id &&
        !cartIdSet.has(product._id.toString()) &&
        !filteredIds.has(product._id.toString())
    );

    filtered.push(...uniqueSimilar);
  }

  return filtered.slice(0, limit);
};

/* =========================
   RECORD PURCHASE FOR ANALYTICS
========================= */
export const recordPurchase = async (productIds: string[]): Promise<void> => {
  if (productIds.length < 2) {
    return; // Need at least 2 products for correlations
  }

  const objectIds = productIds.map((id) => new Types.ObjectId(id));
  const batchUpdates: Promise<any>[] = [];

  // Update each product's purchase history with others
  for (let i = 0; i < objectIds.length; i++) {
    for (let j = i + 1; j < objectIds.length; j++) {
      const productA = objectIds[i];
      const productB = objectIds[j];

      // Update both directions
      batchUpdates.push(updatePurchasePair(productA, productB));
      batchUpdates.push(updatePurchasePair(productB, productA));
    }
  }

  await Promise.all(batchUpdates);

  // Recalculate frequently bought (async)
  setTimeout(() => {
    objectIds.forEach((id) =>
      recalculateFrequentlyBought(id).catch(console.error)
    );
  }, 0);
};

/* =========================
   HELPER FUNCTIONS
========================= */

// Get popular products
const getPopularProducts = async (limit: number): Promise<IProductModel[]> => {
  return Product.find({
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name slug")
    .sort({
      createdAt: -1,
      price: -1,
    })
    .limit(limit)
    .select("name price imageCover categories material description")
    .exec();
};

// Get similar products
const getSimilarProducts = async (
  productIds: Types.ObjectId[],
  limit: number
): Promise<IProductModel[]> => {
  // Get categories from products
  const products = await Product.find({
    _id: { $in: productIds },
  })
    .select("categories price material")
    .exec();

  const categoryIds = products.flatMap((p) => p.categories);
  const uniqueCategoryIds = [
    ...new Set(categoryIds.map((id) => id.toString())),
  ].map((id) => new Types.ObjectId(id));

  if (uniqueCategoryIds.length === 0) {
    return [];
  }

  // Find products in same categories
  return Product.find({
    _id: { $nin: productIds },
    categories: { $in: uniqueCategoryIds },
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name slug")
    .limit(limit)
    .select("name price imageCover categories material description")
    .exec();
};

// Update purchase pair
const updatePurchasePair = async (
  productId: Types.ObjectId,
  relatedId: Types.ObjectId
): Promise<void> => {
  await Product.updateOne(
    { _id: productId },
    {
      $push: {
        purchaseHistory: {
          $each: [
            {
              productId: relatedId,
              count: 1,
              lastPurchased: new Date(),
            },
          ],
          $sort: { lastPurchased: -1 },
          $slice: 100,
        },
      },
    }
  ).exec();
};

// Recalculate frequently bought together
const recalculateFrequentlyBought = async (
  productId: Types.ObjectId
): Promise<void> => {
  const product = await Product.findById(productId)
    .select("purchaseHistory")
    .exec();

  if (!product || !product.purchaseHistory) {
    return;
  }

  // Count frequencies
  const frequencyMap = new Map<string, number>();
  let totalCount = 0;

  product.purchaseHistory.forEach((item) => {
    const id = item.productId.toString();
    const current = frequencyMap.get(id) || 0;
    frequencyMap.set(id, current + item.count);
    totalCount += item.count;
  });

  // Convert to array and calculate frequencies
  const frequentlyBought = Array.from(frequencyMap.entries())
    .map(([id, count]) => {
      const frequency = totalCount > 0 ? count / totalCount : 0;
      const confidence = calculateConfidence(count, totalCount);

      return {
        productId: new Types.ObjectId(id),
        frequency,
        confidence,
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Update product
  await Product.updateOne(
    { _id: productId },
    { frequentlyBoughtTogether: frequentlyBought }
  ).exec();
};

// Calculate confidence score
const calculateConfidence = (count: number, total: number): number => {
  if (total < 5) return 0.3;
  if (total < 20) return 0.6;
  return Math.min(0.95, (count / total) * 1.2);
};
/* =========================
   ADD FREQUENTLY BOUGHT TOGETHER PRODUCTS (Admin Only)
========================= */
/* =========================
   CREATE FREQUENTLY BOUGHT RELATIONSHIPS
   Add multiple products to each other's frequently bought lists
========================= */
/* =========================
   CREATE FREQUENTLY BOUGHT RELATIONSHIPS
   Add multiple products to each other's frequently bought lists
========================= */
export const createFrequentlyBoughtRelationships = async (
  productIds: string[]
): Promise<IProductModel[]> => {
  // Validate all product IDs
  const validProductIds = productIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (validProductIds.length < 2) {
    throw new ApiError("At least 2 valid product IDs are required", 400);
  }

  // Check if all products exist and are active
  const products = await Product.find({
    _id: { $in: validProductIds },
    active: true,
  }).select("_id");

  if (products.length !== validProductIds.length) {
    throw new ApiError("One or more products not found or inactive", 400);
  }

  // For each product, add all other products to its frequentlyBoughtTogether list
  const updatePromises = validProductIds.map(async (currentProductId) => {
    const otherProductIds = validProductIds.filter(
      (id) => !id.equals(currentProductId)
    );

    const frequentlyBoughtTogether = otherProductIds.map((id) => ({
      productId: id,
      frequency: 0.5,
      confidence: 0.4,
    }));

    const updatedProduct = await Product.findByIdAndUpdate(
      currentProductId,
      {
        frequentlyBoughtTogether,
      },
      { new: true, runValidators: true }
    ).populate({
      path: "frequentlyBoughtTogether.productId",
      select: "name price imageCover stock active",
      match: { active: true },
    });

    if (!updatedProduct) {
      throw new ApiError(`Product ${currentProductId} not found`, 404);
    }

    return updatedProduct;
  });

  const updatedProducts = await Promise.all(updatePromises);
  return updatedProducts;
};

export const getAllFrequentlyBoughtRelationships = async (): Promise<{
  [productId: string]: IProductModel[];
}> => {
  // Get all products that have frequentlyBoughtTogether data
  const products = await Product.find({
    "frequentlyBoughtTogether.0": { $exists: true }, // Has at least one item
    active: true,
  })
    .populate({
      path: "frequentlyBoughtTogether.productId",
      select: "name price imageCover stock active",
      match: { active: true, stock: { $gt: 0 } },
    })
    .select("name frequentlyBoughtTogether")
    .lean()
    .exec();

  // Create a map of product relationships
  const relationships: { [productId: string]: IProductModel[] } = {};

  products.forEach((product) => {
    if (product._id && product.frequentlyBoughtTogether) {
      const productId = product._id.toString();
      const relatedProducts: IProductModel[] = [];

      product.frequentlyBoughtTogether.forEach((item) => {
        if (
          item.productId &&
          typeof item.productId === "object" &&
          "_id" in item.productId &&
          "name" in item.productId
        ) {
          relatedProducts.push(item.productId as unknown as IProductModel);
        }
      });

      if (relatedProducts.length > 0) {
        relationships[productId] = relatedProducts;
      }
    }
  });

  return relationships;
};

export const getAllFrequentRelationships = async (): Promise<
  Array<{
    productId: string;
    productName: string;
    frequentlyBought: Array<{
      productId: string;
      productName: string;
      price: number;
      imageCover: string;
    }>;
  }>
> => {
  const products = await Product.find({
    "frequentlyBoughtTogether.0": { $exists: true },
    active: true,
  })
    .populate({
      path: "frequentlyBoughtTogether.productId",
      select: "name price imageCover",
      match: { active: true, stock: { $gt: 0 } },
    })
    .select("name frequentlyBoughtTogether")
    .lean()
    .exec();

  const result = products
    .map((product) => ({
      productId: product._id?.toString() || "",
      productName: product.name || "",
      frequentlyBought: (product.frequentlyBoughtTogether || [])
        .filter((item) => item.productId && typeof item.productId === "object")
        .map((item) => ({
          productId: (item.productId as any)?._id?.toString() || "",
          productName: (item.productId as any)?.name || "",
          price: (item.productId as any)?.price || 0,
          imageCover: (item.productId as any)?.imageCover || "",
        }))
        .filter((item) => item.productId && item.productName),
    }))
    .filter((product) => product.frequentlyBought.length > 0);

  return result;
};
