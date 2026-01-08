// src/services/category.service.ts
import Category, { ICategoryModel } from "./category.model";
import ApiError from "../../utils/apiError";

export const createCategory = async (
  categoryData: Partial<ICategoryModel>
): Promise<ICategoryModel> => {
  const category = await Category.create(categoryData);
  return category;
};

export const getAllCategories = async (): Promise<ICategoryModel[]> => {
  const categories = await Category.find({ isActive: true });
  return categories;
};

export const getCategoryById = async (
  id: string
): Promise<ICategoryModel | null> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError("Category not found", 404);
  }
  return category;
};

export const updateCategory = async (
  id: string,
  updateData: Partial<ICategoryModel>
): Promise<ICategoryModel | null> => {
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
// Add these functions to your existing category.service.ts
export const seedHardcodedCategories = async (): Promise<ICategoryModel[]> => {
  const hardcodedCategories = [
    {
      name: "Garden Games",
      description: "Outdoor games and activities for garden fun",
      isActive: true,
    },
    {
      name: "Soft Play",
      description: "Soft and safe play equipment for children",
      isActive: true,
    },
    {
      name: "Bouncy Castle",
      description: "Inflatable castles and bouncy houses",
      isActive: true,
    },
    {
      name: "Fun Food",
      description: "Fun and creative food catering options",
      isActive: true,
    },
    {
      name: "Tower Castle",
      description: "Large tower-style castle structures",
      isActive: true,
    },
  ];

  const results = [];

  for (const categoryData of hardcodedCategories) {
    // Check if exists
    let category = await Category.findOne({ name: categoryData.name });

    if (!category) {
      category = await Category.create(categoryData);
    }

    results.push(category);
  }

  return results;
};

export const getHardcodedCategories = async (): Promise<any[]> => {
  const categories = await Category.find({
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

  return categories.map((cat) => ({
    id: cat._id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: cat.image || null, // Optional photo
    isActive: cat.isActive,
  }));
};
