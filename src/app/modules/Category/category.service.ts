import Category, { ICategoryModel } from "./category.model";
import ApiError from "../../utils/apiError";
import { CreateCategoryData, UpdateCategoryData } from "./category.interface";

/**
 * Create category (raw OR hardcoded)
 * Name must be unique (case-insensitive)
 */
export const createCategory = async (
  data: CreateCategoryData,
): Promise<ICategoryModel> => {
  const exists = await Category.findOne({
    name: { $regex: new RegExp(`^${data.name}$`, "i") },
  });

  if (exists) {
    throw new ApiError(`Category with name "${data.name}" already exists`, 400);
  }

  return await Category.create(data);
};

/**
 * Get all active categories
 */
export const getAllCategories = async (): Promise<ICategoryModel[]> => {
  return Category.find({ isActive: true }).sort({ name: 1 });
};

/**
 * Get category by ID
 */
export const getCategoryById = async (id: string): Promise<ICategoryModel> => {
  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError("Category not found", 404);
  }

  return category;
};

/**
 * Update category
 */
export const updateCategory = async (
  id: string,
  updateData: UpdateCategoryData,
): Promise<ICategoryModel> => {
  if (updateData.name) {
    const exists = await Category.findOne({
      name: { $regex: new RegExp(`^${updateData.name}$`, "i") },
      _id: { $ne: id },
    });

    if (exists) {
      throw new ApiError(
        `Category with name "${updateData.name}" already exists`,
        400,
      );
    }
  }

  const category = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new ApiError("Category not found", 404);
  }

  return category;
};

/**
 * Delete category
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    throw new ApiError("Category not found", 404);
  }
};

/**
 * Seed hardcoded categories (SAFE – no duplicates)
 */
export const seedCategories = async (): Promise<ICategoryModel[]> => {
  const hardcoded = [
    { name: "Garden Games", description: "Outdoor games", isActive: true },
    { name: "Soft Play", description: "Soft play equipment", isActive: true },
    {
      name: "Bouncy Castle",
      description: "Inflatable castles",
      isActive: true,
    },
    { name: "Fun Food", description: "Food & catering", isActive: true },
    {
      name: "Obstacle Course/Slides",
      description: "Large castles",
      isActive: true,
    },
  ];

  const results: ICategoryModel[] = [];

  for (const item of hardcoded) {
    let category = await Category.findOne({
      name: { $regex: new RegExp(`^${item.name}$`, "i") },
    });

    if (!category) {
      category = await Category.create(item);
    }

    results.push(category);
  }

  return results;
};

/**
 * Get only hardcoded categories
 */
export const getHardcodedCategories = async (): Promise<ICategoryModel[]> => {
  return Category.find({
    name: {
      $in: [
        "Garden Games",
        "Soft Play",
        "Bouncy Castle",
        "Fun Food",
        "Obstacle Course/Slides",
      ],
    },
  }).sort({ name: 1 });
};
