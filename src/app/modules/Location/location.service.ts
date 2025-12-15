// src/services/location.service.ts
import Location, { ILocationModel } from "./location.model";
import { ILocation } from "./location.interface";

export const createLocation = async (
  payload: ILocation
): Promise<ILocationModel> => {
  const location = await Location.create({
    name: payload.name,
    type: payload.type,
    parent: payload.parent || null,
    country: payload.country,
    state: payload.state,
    city: payload.city,
    fullAddress: payload.fullAddress,
    coordinates: {
      lat: payload.coordinates.lat,
      lng: payload.coordinates.lng,
    },
    description: payload.description,
    isActive: payload.isActive ?? true,
  });

  return location;
};

export const getLocationById = async (
  id: string
): Promise<ILocationModel | null> => {
  const location = await Location.findById(id).populate("children");
  return location;
};

export const updateLocation = async (
  id: string,
  data: Partial<ILocation>
): Promise<ILocationModel | null> => {
  const updated = await Location.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  return updated;
};

export const deleteLocation = async (
  id: string
): Promise<ILocationModel | null> => {
  const deleted = await Location.findByIdAndDelete(id);
  return deleted;
};

// Dynamic query list with filters, pagination, and search
export const getLocations = async (query: any) => {
  const { page = 1, limit = 10, search, type, country, state, city } = query;

  const filter: any = {};
  if (type) filter.type = type;
  if (country) filter.country = country;
  if (state) filter.state = state;
  if (city) filter.city = city;
  if (search) filter.$text = { $search: search };

  const locations = await Location.find(filter)
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .populate("children");

  const total = await Location.countDocuments(filter);

  return { locations, total, page: +page, limit: +limit };
};
