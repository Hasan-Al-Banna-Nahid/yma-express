// src/services/location.service.ts
import Location, { ILocationModel } from "../models/location.model";
import ApiError from "../utils/apiError";

export const createLocation = async (
  locationData: Partial<ILocationModel>
): Promise<ILocationModel> => {
  // Validate parent if provided
  if (locationData.parent) {
    const parentLocation = await Location.findById(locationData.parent);
    if (!parentLocation) {
      throw new ApiError("Parent location not found", 404);
    }

    // Ensure hierarchy makes sense
    if (parentLocation.type === "country" && locationData.type !== "state") {
      throw new ApiError("A country can only have states as children", 400);
    }
    if (parentLocation.type === "state" && locationData.type !== "city") {
      throw new ApiError("A state can only have cities as children", 400);
    }
    if (parentLocation.type === "city" && locationData.type !== "landmark") {
      throw new ApiError("A city can only have landmarks as children", 400);
    }
  }

  const location = await Location.create(locationData);
  return location;
};

export const getAllLocations = async (
  query: any = {}
): Promise<{ locations: ILocationModel[]; total: number }> => {
  const {
    page = 1,
    limit = 10,
    sort = "name",
    type,
    country,
    state,
    city,
    search,
    isActive = true,
    ...otherFilters
  } = query;

  // Build filter object
  let filterObj: any = { isActive };

  // Type filtering
  if (type) {
    filterObj.type = Array.isArray(type) ? { $in: type } : type;
  }

  // Location hierarchy filtering
  if (country) filterObj.country = country;
  if (state) filterObj.state = state;
  if (city) filterObj.city = city;

  // Text search
  if (search) {
    filterObj.$or = [
      { name: { $regex: search, $options: "i" } },
      { fullAddress: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Field limiting
  const fields = query.fields
    ? (query.fields as string).split(",").join(" ")
    : "";

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Build sort object
  let sortObj: any = {};
  if (sort) {
    const sortFields = (sort as string).split(",");
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1;
      const fieldName = field.replace("-", "");
      sortObj[fieldName] = sortOrder;
    });
  }

  // Execute query with population
  const locations = await Location.find(filterObj)
    .populate("parent", "name type")
    .select(fields)
    .sort(sortObj)
    .skip(skip)
    .limit(Number(limit));

  const total = await Location.countDocuments(filterObj);

  return { locations, total };
};

export const getLocationById = async (
  id: string
): Promise<ILocationModel | null> => {
  const location = await Location.findById(id).populate("parent", "name type");
  if (!location) {
    throw new ApiError("Location not found", 404);
  }
  return location;
};

export const getLocationHierarchy = async (): Promise<any> => {
  const hierarchy = await Location.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$country",
        states: {
          $addToSet: {
            state: "$state",
            cities: {
              $cond: {
                if: { $eq: ["$type", "city"] },
                then: {
                  city: "$city",
                  landmarks: {
                    $cond: {
                      if: { $eq: ["$type", "landmark"] },
                      then: ["$name"],
                      else: [],
                    },
                  },
                },
                else: null,
              },
            },
          },
        },
      },
    },
  ]);

  return hierarchy;
};

export const getLocationsByType = async (
  type: string
): Promise<ILocationModel[]> => {
  const locations = await Location.find({ type, isActive: true }).sort("name");
  return locations;
};

export const getLocationsByParent = async (
  parentId: string
): Promise<ILocationModel[]> => {
  const locations = await Location.find({ parent: parentId, isActive: true })
    .populate("parent", "name type")
    .sort("name");
  return locations;
};

export const updateLocation = async (
  id: string,
  updateData: Partial<ILocationModel>
): Promise<ILocationModel | null> => {
  const location = await Location.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("parent", "name type");

  if (!location) {
    throw new ApiError("Location not found", 404);
  }
  return location;
};

export const deleteLocation = async (id: string): Promise<void> => {
  // Check if location has children
  const childCount = await Location.countDocuments({
    parent: id,
    isActive: true,
  });
  if (childCount > 0) {
    throw new ApiError("Cannot delete location that has child locations", 400);
  }

  const location = await Location.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!location) {
    throw new ApiError("Location not found", 404);
  }
};

export const getNearbyLocations = async (
  lat: number,
  lng: number,
  maxDistance: number = 10000
): Promise<ILocationModel[]> => {
  const locations = await Location.find({
    isActive: true,
    coordinates: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: maxDistance, // in meters
      },
    },
  }).limit(50);

  return locations;
};
