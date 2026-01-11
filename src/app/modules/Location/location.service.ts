import mongoose from "mongoose";
import Location from "./location.model";
import {
  ILocation,
  ICreateLocationData,
  IUpdateLocationData,
  ICreateDeliveryAreaData,
  IUpdateDeliveryAreaData,
  ILocationFilters,
  IDeliveryCheckResult,
  IDeliveryArea,
  IDeliveryOptions,
} from "./location.interface";

// Create location
export const createLocation = async (
  data: ICreateLocationData
): Promise<ILocation> => {
  const location = await Location.create({
    name: data.name,
    type: data.type,
    parent: data.parent ? new mongoose.Types.ObjectId(data.parent) : null,
    country: data.country,
    state: data.state,
    city: data.city,
    area: data.area,
    postcode: data.postcode?.toUpperCase(),
    deliveryAreas: data.deliveryAreas || [],
    deliveryOptions: data.deliveryOptions || {
      isAvailable: true,
      isFree: false,
      fee: 0,
      minOrder: 0,
      estimatedTime: 60,
      radius: 5000,
    },
    description: data.description,
    isActive: data.isActive ?? true,
    metadata: data.metadata || {},
  });

  return location;
};

// Get location by ID
export const getLocationById = async (
  id: string
): Promise<ILocation | null> => {
  return Location.findById(id).populate("children").populate("parent");
};

// Update location
export const updateLocation = async (
  id: string,
  data: IUpdateLocationData
): Promise<ILocation | null> => {
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.parent !== undefined)
    updateData.parent = data.parent
      ? new mongoose.Types.ObjectId(data.parent)
      : null;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.area !== undefined) updateData.area = data.area;
  if (data.postcode !== undefined)
    updateData.postcode = data.postcode.toUpperCase();
  if (data.deliveryOptions !== undefined)
    updateData.deliveryOptions = data.deliveryOptions;
  if (data.deliveryAreas !== undefined)
    updateData.deliveryAreas = data.deliveryAreas;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  return Location.findByIdAndUpdate(id, updateData, { new: true });
};

// Delete location (soft delete)
export const deleteLocation = async (id: string): Promise<ILocation | null> => {
  return Location.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

// Get all locations
export const getLocations = async (
  filters: ILocationFilters
): Promise<ILocation[]> => {
  const query: any = {};

  if (filters.type) query.type = filters.type;
  if (filters.country) query.country = filters.country;
  if (filters.state) query.state = filters.state;
  if (filters.city) query.city = filters.city;
  if (filters.area) query.area = filters.area;
  if (filters.postcode) query.postcode = filters.postcode;

  if (filters.parent === "null") {
    query.parent = null;
  } else if (filters.parent) {
    query.parent = new mongoose.Types.ObjectId(filters.parent);
  }

  if (filters.hasDeliveryAreas === "true")
    query["deliveryAreas.0"] = { $exists: true };
  if (filters.hasDeliveryAreas === "false")
    query["deliveryAreas.0"] = { $exists: false };

  if (filters.isActive !== undefined)
    query.isActive = filters.isActive === "true";

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { state: { $regex: filters.search, $options: "i" } },
      { city: { $regex: filters.search, $options: "i" } },
      { area: { $regex: filters.search, $options: "i" } },
      { postcode: { $regex: filters.search, $options: "i" } },
    ];
  }

  return Location.find(query)
    .populate("parent")
    .populate("children")
    .sort({ type: 1, name: 1 });
};

// Check delivery availability
export const checkDeliveryAvailability = async (
  postcode: string,
  orderAmount: number = 0
): Promise<IDeliveryCheckResult> => {
  const normalizedPostcode = postcode.toUpperCase();

  // Check in postcode field
  const location = await Location.findOne({
    postcode: normalizedPostcode,
    isActive: true,
  });

  if (location) {
    const meetsMinOrder =
      orderAmount >= (location.deliveryOptions?.minOrder || 0);
    const deliveryFee = location.deliveryOptions?.fee || 0;

    return {
      available:
        meetsMinOrder && (location.deliveryOptions?.isAvailable ?? true),
      location: {
        name: location.name,
        type: location.type,
        state: location.state,
        city: location.city,
      },
      deliveryOptions: location.deliveryOptions,
      meetsMinOrder,
      message: meetsMinOrder
        ? `Delivery ${
            location.deliveryOptions?.isFree ? "free" : `£${deliveryFee}`
          }`
        : `Minimum order £${location.deliveryOptions?.minOrder || 0} required`,
    };
  }

  // Check in delivery areas
  const locationWithArea = await Location.findOne({
    "deliveryAreas.postcode": normalizedPostcode,
    "deliveryAreas.isActive": true,
    isActive: true,
  });

  if (!locationWithArea) {
    return {
      available: false,
      message: "Delivery not available for this postcode",
    };
  }

  const deliveryArea = locationWithArea.deliveryAreas.find(
    (area) => area.postcode === normalizedPostcode && area.isActive
  );

  if (!deliveryArea) {
    return {
      available: false,
      message: "Delivery area not found",
    };
  }

  const meetsMinOrder = orderAmount >= deliveryArea.minOrder;

  return {
    available: meetsMinOrder,
    location: {
      name: locationWithArea.name,
      type: locationWithArea.type,
      state: locationWithArea.state,
      city: locationWithArea.city,
    },
    deliveryArea,
    deliveryOptions: locationWithArea.deliveryOptions,
    meetsMinOrder,
    message: meetsMinOrder
      ? `${
          deliveryArea.isFree ? "Free" : `£${deliveryArea.deliveryFee}`
        } delivery`
      : `Minimum order £${deliveryArea.minOrder} required`,
  };
};

// Add delivery area
export const addDeliveryArea = async (
  locationId: string,
  data: ICreateDeliveryAreaData
): Promise<ILocation | null> => {
  const location = await Location.findById(locationId);
  if (!location) return null;

  const deliveryArea: IDeliveryArea = {
    name: data.name,
    postcode: data.postcode.toUpperCase(),
    deliveryFee: data.deliveryFee,
    isFree: data.isFree ?? data.deliveryFee === 0,
    minOrder: data.minOrder,
    estimatedTime: data.estimatedTime,
    isActive: data.isActive ?? true,
  };

  location.deliveryAreas.push(deliveryArea);
  await location.save();

  return location;
};

// Update delivery area
export const updateDeliveryArea = async (
  locationId: string,
  areaId: string,
  data: IUpdateDeliveryAreaData
): Promise<ILocation | null> => {
  const location = await Location.findById(locationId);
  if (!location) return null;

  const areaIndex = location.deliveryAreas.findIndex(
    (area) => area._id?.toString() === areaId
  );

  if (areaIndex === -1) return null;

  if (data.name !== undefined)
    location.deliveryAreas[areaIndex].name = data.name;
  if (data.postcode !== undefined)
    location.deliveryAreas[areaIndex].postcode = data.postcode.toUpperCase();
  if (data.deliveryFee !== undefined)
    location.deliveryAreas[areaIndex].deliveryFee = data.deliveryFee;
  if (data.isFree !== undefined)
    location.deliveryAreas[areaIndex].isFree = data.isFree;
  if (data.minOrder !== undefined)
    location.deliveryAreas[areaIndex].minOrder = data.minOrder;
  if (data.estimatedTime !== undefined)
    location.deliveryAreas[areaIndex].estimatedTime = data.estimatedTime;
  if (data.isActive !== undefined)
    location.deliveryAreas[areaIndex].isActive = data.isActive;

  await location.save();
  return location;
};

// Delete delivery area
export const deleteDeliveryArea = async (
  locationId: string,
  areaId: string
): Promise<ILocation | null> => {
  const location = await Location.findById(locationId);
  if (!location) return null;

  location.deliveryAreas = location.deliveryAreas.filter(
    (area) => area._id?.toString() !== areaId
  );

  await location.save();
  return location;
};

// Get delivery area
export const getDeliveryAreaById = async (
  locationId: string,
  areaId: string
): Promise<IDeliveryArea | null> => {
  const location = await Location.findById(locationId);
  if (!location) return null;

  return (
    location.deliveryAreas.find((area) => area._id?.toString() === areaId) ||
    null
  );
};

// Get hierarchy
export const getDeliveryHierarchy = async (
  parentId?: string
): Promise<ILocation[]> => {
  const query: any = { isActive: true };

  if (parentId) {
    query.parent = new mongoose.Types.ObjectId(parentId);
  } else {
    query.parent = null;
  }

  return Location.find(query).populate("children").sort({ name: 1 });
};

// Update delivery options
export const updateDeliveryOptions = async (
  locationId: string,
  options: Partial<IDeliveryOptions>
): Promise<ILocation | null> => {
  return Location.findByIdAndUpdate(
    locationId,
    { deliveryOptions: options },
    { new: true }
  );
};
