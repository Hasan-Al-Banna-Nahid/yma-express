import Category from "../Category/category.model";
import Product, { IProductModel } from "./product.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import { CreateProductData } from "./product.interface";

export const createProduct = async (
  productData: CreateProductData
): Promise<IProductModel> => {
  if (productData.categories && productData.categories.length > 0) {
    const categoryIds = productData.categories.map(
      (id) => new Types.ObjectId(id)
    );
    const categories = await Category.find({
      _id: { $in: categoryIds },
      isActive: true,
    });

    if (categories.length !== productData.categories.length) {
      throw new ApiError("One or more categories are invalid or inactive", 400);
    }

    productData.categories = categoryIds as any;
  } else {
    throw new ApiError("At least one category is required", 400);
  }

  const productWithLocation = {
    ...productData,
    location: {
      country: "England",
      state: productData.location.state,
      city: productData.location.city || "",
    },
    dateAdded: new Date(),
  };

  const product = await Product.create(productWithLocation);

  await product.populate({
    path: "categories",
    select: "name slug description image",
    match: { isActive: true },
  });

  return product;
};

export const updateProduct = async (
  productId: string,
  updateData: any
): Promise<IProductModel> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  if (updateData.categories && updateData.categories.length > 0) {
    const categoryIds = updateData.categories.map(
      (id: string) => new Types.ObjectId(id)
    );
    const categories = await Category.find({
      _id: { $in: categoryIds },
      isActive: true,
    });

    if (categories.length !== updateData.categories.length) {
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
  }).populate({
    path: "categories",
    select: "name slug description image",
    match: { isActive: true },
  });

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  return product;
};

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

export const getProductsByState = async (
  state: string
): Promise<IProductModel[]> => {
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

export const getFeaturedProducts = async (
  limit: number = 8
): Promise<IProductModel[]> => {
  const products = await Product.find({
    active: true,
    stock: { $gt: 0 },
  })
    .populate("categories", "name description")
    .sort({ createdAt: -1 })
    .limit(limit);

  return products;
};

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
