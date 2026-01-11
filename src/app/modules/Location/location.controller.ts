import { Request, Response } from "express";
import mongoose from "mongoose";
import * as LocationService from "./location.service";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/apiResponse";

// Create location
export const createLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.createLocation(req.body);
    res.status(201).json({ success: true, data: location });
  }
);

// Get all locations
export const getLocationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const locations = await LocationService.getLocations(req.query);
    res.status(200).json({ success: true, data: locations });
  }
);

// Get single location
export const getLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.getLocationById(req.params.id);

    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.status(200).json({ success: true, data: location });
  }
);

// Update location
export const updateLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.updateLocation(
      req.params.id,
      req.body
    );

    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.status(200).json({ success: true, data: location });
  }
);

// Delete location
export const deleteLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.deleteLocation(req.params.id);

    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.status(200).json({ success: true, data: location });
  }
);

// Check delivery
export const checkDeliveryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { postcode, orderAmount = 0 } = req.query;

    if (!postcode) {
      return res
        .status(400)
        .json({ success: false, message: "Postcode is required" });
    }

    const amount = Number(orderAmount) || 0;
    const result = await LocationService.checkDeliveryAvailability(
      postcode as string,
      amount
    );

    res.status(200).json({ success: true, data: result });
  }
);

// Add delivery area
export const addDeliveryAreaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.addDeliveryArea(
      req.params.id,
      req.body
    );

    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.status(201).json({ success: true, data: location });
  }
);

// Update delivery area
export const updateDeliveryAreaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.updateDeliveryArea(
      req.params.id,
      req.params.areaId,
      req.body
    );

    if (!location) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Location or delivery area not found",
        });
    }

    res.status(200).json({ success: true, data: location });
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
      return res
        .status(404)
        .json({
          success: false,
          message: "Location or delivery area not found",
        });
    }

    res.status(200).json({ success: true, data: location });
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
      return res
        .status(404)
        .json({ success: false, message: "Delivery area not found" });
    }

    res.status(200).json({ success: true, data: deliveryArea });
  }
);

// Get hierarchy
export const getDeliveryHierarchyHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const hierarchy = await LocationService.getDeliveryHierarchy(
      req.query.parent as string
    );
    res.status(200).json({ success: true, data: hierarchy });
  }
);
