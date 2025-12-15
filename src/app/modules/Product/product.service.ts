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
      state: productData.location.state,
      city: productData.location.city || "",
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
export const updateProduct = async (
  productId: string,
  updateData: any
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

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

    updateData.categories = categoryIds;
  }

  if (updateData.location) {
    updateData.location = {
      country: "England",
      state: updateData.location.state || "",
      city: updateData.location.city || "",
    };
  }

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
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
