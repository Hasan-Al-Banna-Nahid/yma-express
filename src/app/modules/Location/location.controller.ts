import { LocationModel } from "./location.model";
import { Request, Response } from "express";
import mongoose from "mongoose";
import * as LocationService from "./location.service";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";

// Create location
export const createLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, type, country, state, city, postcode } = req.body;

    // Validate required fields
    if (!name || !type || !country || !state) {
      throw new ApiError(
        "Missing required fields: name, type, country, state are required",
        400
      );
    }

    // Check for duplicate location
    const existingLocation = await LocationModel.findOne({
      $or: [
        // Same name in same city/state
        {
          name: { $regex: new RegExp(`^${name}$`, "i") },
          state: { $regex: new RegExp(`^${state}$`, "i") },
          ...(city && { city: { $regex: new RegExp(`^${city}$`, "i") } }),
        },
        // Same postcode (if provided)
        ...(postcode ? [{ postcode: postcode.toUpperCase() }] : []),
      ],
      isActive: true,
    });

    if (existingLocation) {
      let errorMessage = `Location with name "${name}" already exists in ${
        city || state
      }`;

      if (postcode && existingLocation.postcode === postcode.toUpperCase()) {
        errorMessage = `Location with postcode "${postcode}" already exists`;
      }

      throw new ApiError(errorMessage, 400);
    }

    // Process the rest of the data
    let validatedDeliveryAreas: any[] = [];
    if (req.body.deliveryAreas && Array.isArray(req.body.deliveryAreas)) {
      const postcodeSet = new Set();

      for (const area of req.body.deliveryAreas) {
        if (!area.postcode) {
          throw new ApiError("Delivery area must have a postcode", 400);
        }

        // Handle comma-separated postcodes
        const postcodes = area.postcode
          .split(",")
          .map((p: string) => p.trim().toUpperCase());

        for (const singlePostcode of postcodes) {
          if (postcodeSet.has(singlePostcode)) {
            throw new ApiError(
              `Duplicate postcode "${singlePostcode}" in delivery areas`,
              400
            );
          }
          postcodeSet.add(singlePostcode);

          validatedDeliveryAreas.push({
            name: area.name || `Delivery - ${singlePostcode}`,
            postcode: singlePostcode,
            deliveryFee: area.deliveryFee || 0,
            isFree: area.isFree ?? area.deliveryFee === 0,
            minOrder: area.minOrder || 0,
            estimatedTime: area.estimatedTime || 60,
            isActive: area.isActive ?? true,
          });
        }
      }
    }

    // Create location
    const location = await LocationModel.create({
      name,
      type,
      country,
      state,
      city: city || "",
      area: req.body.area || "",
      postcode: postcode ? postcode.toUpperCase() : "",
      parent: req.body.parent
        ? new mongoose.Types.ObjectId(req.body.parent)
        : null,
      deliveryAreas: validatedDeliveryAreas,
      deliveryOptions: req.body.deliveryOptions || {
        isAvailable: true,
        isFree: false,
        fee: 0,
        minOrder: 0,
        estimatedTime: 60,
        radius: 5000,
      },
      description: req.body.description || "",
      isActive: req.body.isActive ?? true,
      metadata: req.body.metadata || {},
    });

    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  }
);

// Get all locations
export const getLocationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const locations = await LocationService.getLocations(req.query);

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations,
    });
  }
);

// Get single location
export const getLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.getLocationById(req.params.id);

    if (!location) {
      throw new ApiError("Location not found", 404);
    }

    res.status(200).json({
      success: true,
      data: location,
    });
  }
);

// Update location
export const updateLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, postcode, state, city } = req.body;

    // Check for duplicate location when updating
    if (name || postcode || state || city) {
      const existingLocation =
        await LocationService.checkDuplicateLocationOnUpdate(id, {
          name,
          postcode,
          state,
          city,
        });

      if (existingLocation) {
        throw new ApiError(
          `Location with name "${name}" or postcode "${postcode}" already exists in ${city}, ${state}`,
          400
        );
      }
    }

    const location = await LocationService.updateLocation(id, req.body);

    if (!location) {
      throw new ApiError("Location not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  }
);

// Delete location
export const deleteLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.deleteLocation(req.params.id);

    if (!location) {
      throw new ApiError("Location not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Location deleted successfully",
      data: location,
    });
  }
);

// Check delivery
export const checkDeliveryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { postcode, orderAmount = 0 } = req.query;

    if (!postcode) {
      throw new ApiError("Postcode is required", 400);
    }

    const amount = Number(orderAmount) || 0;
    const result = await LocationService.checkDeliveryAvailability(
      postcode as string,
      amount
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }
);

// Add delivery area
export const addDeliveryAreaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { postcode } = req.body;

    // Check if delivery area with same postcode already exists
    const existingArea = await LocationService.checkDuplicateDeliveryArea(
      id,
      postcode
    );

    if (existingArea) {
      throw new ApiError(
        `Delivery area with postcode "${postcode}" already exists for this location`,
        400
      );
    }

    const location = await LocationService.addDeliveryArea(id, req.body);

    if (!location) {
      throw new ApiError("Location not found", 404);
    }

    res.status(201).json({
      success: true,
      message: "Delivery area added successfully",
      data: location,
    });
  }
);

// Update delivery area
export const updateDeliveryAreaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id, areaId } = req.params;
    const { postcode } = req.body;

    // Check for duplicate delivery area postcode on update
    if (postcode) {
      const existingArea =
        await LocationService.checkDuplicateDeliveryAreaOnUpdate(
          id,
          areaId,
          postcode
        );

      if (existingArea) {
        throw new ApiError(
          `Delivery area with postcode "${postcode}" already exists for this location`,
          400
        );
      }
    }

    const location = await LocationService.updateDeliveryArea(
      id,
      areaId,
      req.body
    );

    if (!location) {
      throw new ApiError("Location or delivery area not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Delivery area updated successfully",
      data: location,
    });
  }
);

// Delete delivery area
export const deleteDeliveryAreaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.deleteDeliveryArea(
      req.params.id,
      req.params.areaId
    );

    if (!location) {
      throw new ApiError("Location or delivery area not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Delivery area deleted successfully",
      data: location,
    });
  }
);

// Get delivery area
export const getDeliveryAreaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const deliveryArea = await LocationService.getDeliveryAreaById(
      req.params.id,
      req.params.areaId
    );

    if (!deliveryArea) {
      throw new ApiError("Delivery area not found", 404);
    }

    res.status(200).json({
      success: true,
      data: deliveryArea,
    });
  }
);

// Get hierarchy
export const getDeliveryHierarchyHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const hierarchy = await LocationService.getDeliveryHierarchy(
      req.query.parent as string
    );

    res.status(200).json({
      success: true,
      count: hierarchy.length,
      data: hierarchy,
    });
  }
);
