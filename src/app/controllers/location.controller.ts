// src/controllers/location.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as locationService from "../services/location.service";

export const createLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const location = await locationService.createLocation(req.body);

    res.status(201).json({
      status: "success",
      data: {
        location,
      },
    });
  }
);

export const getLocations = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { locations, total } = await locationService.getAllLocations(
      req.query
    );

    res.status(200).json({
      status: "success",
      results: locations.length,
      total,
      data: {
        locations,
      },
    });
  }
);

export const getLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const location = await locationService.getLocationById(req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        location,
      },
    });
  }
);

export const getLocationHierarchy = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const hierarchy = await locationService.getLocationHierarchy();

    res.status(200).json({
      status: "success",
      data: {
        hierarchy,
      },
    });
  }
);

export const getLocationsByType = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { type } = req.params;
    const locations = await locationService.getLocationsByType(type);

    res.status(200).json({
      status: "success",
      results: locations.length,
      data: {
        locations,
      },
    });
  }
);

export const getLocationsByParent = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { parentId } = req.params;
    const locations = await locationService.getLocationsByParent(parentId);

    res.status(200).json({
      status: "success",
      results: locations.length,
      data: {
        locations,
      },
    });
  }
);

export const getNearbyLocations = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { lat, lng, maxDistance } = req.query;

    const locations = await locationService.getNearbyLocations(
      Number(lat),
      Number(lng),
      maxDistance ? Number(maxDistance) : 10000
    );

    res.status(200).json({
      status: "success",
      results: locations.length,
      data: {
        locations,
      },
    });
  }
);

export const updateLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const location = await locationService.updateLocation(
      req.params.id,
      req.body
    );

    res.status(200).json({
      status: "success",
      data: {
        location,
      },
    });
  }
);

export const deleteLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await locationService.deleteLocation(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
