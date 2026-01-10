import { Request, Response } from "express";
import * as LocationService from "./location.service";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/apiResponse";
import Location from "./location.model";

export const createLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.createLocation(req.body);

    ApiResponse(res, 201, "Location created successfully", location);
  }
);

export const getLocationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await LocationService.getLocations(req.query);
    ApiResponse(res, 200, "Locations fetched successfully", result);
  }
);

export const getLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const location = await LocationService.getLocationById(req.params.id);
    if (!location) return ApiResponse(res, 404, "Location not found");
    ApiResponse(res, 200, "Location fetched successfully", location);
  }
);

export const updateLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const updated = await LocationService.updateLocation(id, req.body);
    if (!updated) return ApiResponse(res, 404, "Location not found");

    ApiResponse(res, 200, "Location updated successfully", updated);
  }
);

export const deleteLocationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const deleted = await LocationService.deleteLocation(id);
      if (!deleted) return ApiResponse(res, 404, "Location not found");

      ApiResponse(res, 200, "Location deleted successfully", deleted);
    } catch (error: any) {
      ApiResponse(res, 400, error.message);
    }
  }
);

// New endpoint: Check delivery availability
export const checkDeliveryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { postcode, orderAmount } = req.query;

    if (!postcode) {
      return ApiResponse(res, 400, "Postcode is required");
    }

    const result = await LocationService.checkDeliveryAvailability(
      postcode as string,
      orderAmount ? parseFloat(orderAmount as string) : 0
    );

    ApiResponse(res, 200, "Delivery check completed", result);
  }
);

// New endpoint: Get delivery areas tree
export const getDeliveryAreasTreeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { parent = null } = req.query;

    const filter: any = {
      isActive: true,
      "deliveryOptions.isAvailable": true,
    };

    if (parent) {
      filter.parent = parent === "null" ? null : parent;
    }

    const locations = await Location.find(filter)
      .populate(
        "children",
        "name type postcode deliveryOptions.isFree deliveryOptions.fee"
      )
      .sort({ name: 1 });

    // Transform to tree structure
    const buildTree = (
      locations: any[],
      parentId: string | null = null
    ): any[] => {
      return locations
        .filter((loc) => {
          if (parentId === null) return !loc.parent;
          return loc.parent && loc.parent.toString() === parentId;
        })
        .map((loc) => ({
          _id: loc._id,
          name: loc.name,
          type: loc.type,
          postcode: loc.postcode,
          deliveryFee: loc.deliveryOptions.isFree
            ? "Free"
            : `£${loc.deliveryOptions.fee}`,
          children: buildTree(locations, loc._id.toString()),
        }));
    };

    const tree = buildTree(locations);

    ApiResponse(res, 200, "Delivery areas tree fetched", tree);
  }
);
