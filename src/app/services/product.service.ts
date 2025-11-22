// src/services/product.service.ts
import { Types } from "mongoose";
import Product, { IProductModel } from "../models/product.model";
import ApiError from "../utils/apiError";
import {
  CreateProductData,
  UpdateProductData,
} from "../interfaces/product.interface";

export const createProduct = async (
  productData: CreateProductData
): Promise<IProductModel> => {
  console.log("🆕 [SERVICE] Creating new product:", {
    name: productData.name,
    state: productData.location.state,
    dimensions: productData.dimensions,
  });

  // Auto-set country to England
  const productWithLocation = {
    ...productData,
    location: {
      country: "England", // Static value
      state: productData.location.state,
      city: productData.location.city || "",
    },
  };

  const product = await Product.create(productWithLocation);
  await product.populate("categories", "name description");

  console.log("✅ [SERVICE] Product created successfully:", product._id);
  return product;
};

// ... (keep all other existing functions the same, they will work with the new dimensions)

export const getAllProducts = async (
  page: number = 1,
  limit: number = 10,
  state?: string,
  category?: string,
  minPrice?: number,
  maxPrice?: number
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const filter: any = { active: true };

  // Filter by state
  if (state) {
    filter["location.state"] = { $regex: state, $options: "i" };
  }

  // Filter by category
  if (category && Types.ObjectId.isValid(category)) {
    filter.categories = new Types.ObjectId(category);
  }

  // Filter by price range
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

export const getProductById = async (
  productId: string
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findById(productId).populate(
    "categories",
    "name description"
  );

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

export const updateProduct = async (
  productId: string,
  updateData: UpdateProductData
): Promise<IProductModel> => {
  console.log("🔄 [SERVICE] Updating product:", productId);

  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  // If location is being updated, ensure country remains England
  if (updateData.location) {
    updateData.location = {
      // country: "England", // Always keep England
      state: updateData.location.state || "",
      city: updateData.location.city || "",
    };
  }

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  }).populate("categories", "name description");

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  console.log("✅ [SERVICE] Product updated successfully");
  return product;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  console.log("🗑️ [SERVICE] Deleting product:", productId);

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

  console.log("✅ [SERVICE] Product deleted successfully");
};

export const getProductsByState = async (
  state: string
): Promise<IProductModel[]> => {
  console.log("🗺️ [SERVICE] Getting products by state:", state);

  const products = await Product.find({
    "location.state": { $regex: state, $options: "i" },
    active: true,
  }).populate("categories", "name description");

  return products;
};

export const getAvailableStates = async (): Promise<string[]> => {
  const states = await Product.distinct("location.state", { active: true });
  return states.sort();
};

export const updateProductStock = async (
  productId: string,
  newStock: number
): Promise<IProductModel> => {
  console.log("📦 [SERVICE] Updating product stock:", { productId, newStock });

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

  console.log("✅ [SERVICE] Product stock updated successfully");
  return product;
};

// NEW: Get featured products
export const getFeaturedProducts = async (
  limit: number = 8
): Promise<IProductModel[]> => {
  console.log("⭐ [SERVICE] Getting featured products");

  const products = await Product.find({
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .limit(limit);

  return products;
};

// NEW: Search products
export const searchProducts = async (
  query: string,
  page: number = 1,
  limit: number = 10
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const searchFilter = {
    active: true,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { summary: { $regex: query, $options: "i" } },
      { "location.state": { $regex: query, $options: "i" } },
      { "location.city": { $regex: query, $options: "i" } },
    ],
  };

  const products = await Product.find(searchFilter)
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(searchFilter);

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
  };
};

// NEW: Get products by category
export const getProductsByCategory = async (
  categoryId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ products: IProductModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  if (!Types.ObjectId.isValid(categoryId)) {
    throw new ApiError("Invalid category ID", 400);
  }

  const filter = {
    active: true,
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
