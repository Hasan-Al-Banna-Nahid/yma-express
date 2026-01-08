import Category, { ICategoryModel } from "./category.model";
import ApiError from "../../utils/apiError";

export const createCategory = async (
  categoryData: Partial<ICategoryModel>
): Promise<ICategoryModel> => {
  return await Category.create(categoryData);
};

export const getAllCategories = async (): Promise<ICategoryModel[]> => {
  return await Category.find({ isActive: true });
};

export const getCategoryById = async (id: string): Promise<ICategoryModel> => {
  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError("Category not found", 404);
  }

  return category;
};

export const updateCategory = async (
  id: string,
  updateData: Partial<ICategoryModel>
): Promise<ICategoryModel> => {
  const category = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new ApiError("Category not found", 404);
  }

  return category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    throw new ApiError("Category not found", 404);
  }
};

export const seedHardcodedCategories = async (): Promise<ICategoryModel[]> => {
  const hardcodedCategories = [
    { name: "Garden Games", description: "Outdoor games", isActive: true },
    { name: "Soft Play", description: "Soft equipment", isActive: true },
    { name: "Bouncy Castle", description: "Inflatables", isActive: true },
    { name: "Fun Food", description: "Food catering", isActive: true },
    { name: "Tower Castle", description: "Large structures", isActive: true },
  ];

  const results = [];

  for (const categoryData of hardcodedCategories) {
    let category = await Category.findOne({ name: categoryData.name });

    if (!category) {
      category = await Category.create(categoryData);
    }

    results.push(category);
  }

  return results;
};

export const getHardcodedCategories = async (): Promise<ICategoryModel[]> => {
  return await Category.find({
    name: {
      $in: [
        "Garden Games",
        "Soft Play",
        "Bouncy Castle",
        "Fun Food",
        "Tower Castle",
      ],
    },
  });
};
