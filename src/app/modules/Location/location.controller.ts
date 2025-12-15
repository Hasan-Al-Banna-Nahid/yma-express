// src/controllers/location.controller.ts
import { Request, Response } from "express";
import * as LocationService from "./location.service";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/apiResponse";

export const createLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.createLocation(req.body);

    res.status(201).json({
      status: "success",
      data: location,
    });
  }
);

// Get all locations (dynamic + pagination)
export const getLocationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await LocationService.getLocations(req.query);
    ApiResponse(res, 200, "Locations fetched successfully", result);
  }
);

// Get location by ID
export const getLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.getLocationById(req.params.id);
    if (!location) return ApiResponse(res, 404, "Location not found");
    ApiResponse(res, 200, "Location fetched successfully", location);
  }
);

// Update location
export const updateLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await LocationService.updateLocation(
      req.params.id,
      req.body
    );
    if (!updated) return ApiResponse(res, 404, "Location not found");
    ApiResponse(res, 200, "Location updated successfully", updated);
  }
);

// Delete location
export const deleteLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const deleted = await LocationService.deleteLocation(req.params.id);
    if (!deleted) return ApiResponse(res, 404, "Location not found");
    ApiResponse(res, 200, "Location deleted successfully", deleted);
  }
);
