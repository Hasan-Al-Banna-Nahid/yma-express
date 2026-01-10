import Location, { ILocationModel } from "./location.model";
import { ILocation } from "./location.interface";

export const createLocation = async (
  payload: Partial<ILocation>
): Promise<ILocationModel> => {
  const location = await Location.create({
    name: payload.name,
    type: payload.type,
    parent: payload.parent || null,

    // Optional fields
    country: payload.country,
    state: payload.state,
    city: payload.city,
    area: payload.area,
    postcode: payload.postcode,

    // Delivery options (with defaults)
    deliveryOptions: {
      isAvailable: payload.deliveryOptions?.isAvailable ?? true,
      isFree: payload.deliveryOptions?.isFree ?? false,
      fee: payload.deliveryOptions?.fee ?? 0,
      minOrder: payload.deliveryOptions?.minOrder ?? 0,
      radius: payload.deliveryOptions?.radius ?? 5000,
      estimatedTime: payload.deliveryOptions?.estimatedTime ?? 60,
    },

    description: payload.description,
    isActive: payload.isActive ?? true,
    metadata: payload.metadata || {},
  });

  return location;
};

export const getLocationById = async (
  id: string
): Promise<ILocationModel | null> => {
  const location = await Location.findById(id)
    .populate("children")
    .populate("parent", "name type postcode");
  return location;
};

export const updateLocation = async (
  id: string,
  data: Partial<ILocation>
): Promise<ILocationModel | null> => {
  // Handle nested deliveryOptions update
  const updateData: any = { ...data };

  if (data.deliveryOptions) {
    updateData.$set = {
      "deliveryOptions.isAvailable": data.deliveryOptions.isAvailable,
      "deliveryOptions.isFree": data.deliveryOptions.isFree,
      "deliveryOptions.fee": data.deliveryOptions.fee,
      "deliveryOptions.minOrder": data.deliveryOptions.minOrder,
      "deliveryOptions.radius": data.deliveryOptions.radius,
      "deliveryOptions.estimatedTime": data.deliveryOptions.estimatedTime,
    };
  }

  const updated = await Location.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return updated;
};

export const deleteLocation = async (
  id: string
): Promise<ILocationModel | null> => {
  // Check if location has children before deleting
  const hasChildren = await Location.findOne({ parent: id });
  if (hasChildren) {
    throw new Error(
      "Cannot delete location that has children. Delete children first."
    );
  }

  const deleted = await Location.findByIdAndDelete(id);
  return deleted;
};

// Dynamic query with delivery filters
export const getLocations = async (query: any) => {
  const {
    page = 1,
    limit = 10,
    search,
    type,
    country,
    region,
    city,
    area,
    postcode,
    deliveryAvailable,
    freeDelivery,
    minRadius,
    maxRadius,
    parent,
  } = query;

  const filter: any = {};

  // Basic filters
  if (type) filter.type = type;
  if (country) filter.country = country;
  if (region) filter.region = region;
  if (city) filter.city = city;
  if (area) filter.area = area;
  if (postcode) filter.postcode = postcode;
  if (parent) filter.parent = parent === "null" ? null : parent;

  // Delivery filters
  if (deliveryAvailable !== undefined) {
    filter["deliveryOptions.isAvailable"] = deliveryAvailable === "true";
  }
  if (freeDelivery !== undefined) {
    filter["deliveryOptions.isFree"] = freeDelivery === "true";
  }

  // Radius filters
  if (minRadius || maxRadius) {
    filter["deliveryOptions.radius"] = {};
    if (minRadius) filter["deliveryOptions.radius"].$gte = +minRadius;
    if (maxRadius) filter["deliveryOptions.radius"].$lte = +maxRadius;
  }

  // Search
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { area: { $regex: search, $options: "i" } },
      { postcode: { $regex: search, $options: "i" } },
    ];
  }

  const locations = await Location.find(filter)
    .populate("parent", "name type")
    .sort({ name: 1 })
    .skip((+page - 1) * +limit)
    .limit(+limit);

  const total = await Location.countDocuments(filter);

  return {
    locations,
    total,
    page: +page,
    limit: +limit,
    totalPages: Math.ceil(total / +limit),
  };
};

// Special service for delivery area check
export const checkDeliveryAvailability = async (
  postcode: string,
  orderAmount: number = 0
) => {
  const location = await Location.findOne({
    postcode: postcode.toUpperCase(),
    "deliveryOptions.isAvailable": true,
    isActive: true,
  }).populate("parent");

  if (!location) {
    return {
      available: false,
      message: "Delivery not available in this area",
    };
  }

  const { deliveryOptions } = location;
  const meetsMinOrder = orderAmount >= deliveryOptions.minOrder;

  return {
    available: deliveryOptions.isAvailable && meetsMinOrder,
    location: {
      name: location.name,
      type: location.type,
      postcode: location.postcode,
      area: location.area,
    },
    delivery: {
      isFree: deliveryOptions.isFree,
      fee: deliveryOptions.fee,
      totalFee: deliveryOptions.isFree ? 0 : deliveryOptions.fee,
      minOrder: deliveryOptions.minOrder,
      estimatedTime: deliveryOptions.estimatedTime,
      radius: deliveryOptions.radius,
      meetsMinOrder,
    },
    message: meetsMinOrder
      ? `Delivery ${
          deliveryOptions.isFree ? "free" : `£${deliveryOptions.fee}`
        } - ${deliveryOptions.estimatedTime} mins`
      : `Minimum order £${deliveryOptions.minOrder} required`,
  };
};
