import { Request, Response } from "express";
import { PromoService } from "./promos.service";
import {
  CreatePromoDTO,
  OrderQueryParams,
  UpdatePromoDTO,
} from "./promos.interface";

const promoService = new PromoService();

export class PromoController {
  // Create promo
  async createPromo(req: Request, res: Response) {
    try {
      const promoData: CreatePromoDTO = req.body;
      const promo = await promoService.createPromo(promoData);

      res.status(201).json({
        success: true,
        data: promo,
        message: "Promo created successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get orders for a specific promo
  async getPromoOrders(req: Request, res: Response) {
    try {
      const promoId = req.params.id;

      // Parse query parameters
      const queryParams: OrderQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        status: req.query.status as string,
      };

      // Parse date filters
      if (req.query.startDate) {
        queryParams.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        queryParams.endDate = new Date(req.query.endDate as string);
      }

      const result = await promoService.getOrdersWithProducts(
        promoId,
        queryParams,
      );

      res.status(200).json({
        // success: true,
        ...result,
        message: "Orders retrieved successfully",
      });
    } catch (error: any) {
      console.error("Error in getPromoOrders:", error);

      if (error.message === "Promo not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Get all promo orders
  async getAllPromoOrders(req: Request, res: Response) {
    try {
      const queryParams: OrderQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        status: req.query.status as string,
      };

      if (req.query.startDate) {
        queryParams.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        queryParams.endDate = new Date(req.query.endDate as string);
      }

      const result = await promoService.getAllPromoOrders(queryParams);

      res.status(200).json({
        // success: true,
        ...result,
        message: "Promo orders retrieved successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get promo performance
  async getPromoPerformance(req: Request, res: Response) {
    try {
      const promoId = req.params.id;
      const result = await promoService.getPromoPerformance(promoId);

      res.status(200).json({
        success: true,
        data: result,
        message: "Promo performance retrieved successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get all promos
  async getAllPromos(req: Request, res: Response) {
    try {
      const promos = await promoService.getAllPromos();

      res.status(200).json({
        success: true,
        count: promos.length,
        data: promos,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get promo by ID
  async getPromoById(req: Request, res: Response) {
    try {
      const promo = await promoService.getPromoById(req.params.id);

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: "Promo not found",
        });
      }

      res.status(200).json({
        success: true,
        data: promo,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update promo
  async updatePromo(req: Request, res: Response) {
    try {
      const updateData: UpdatePromoDTO = req.body;
      const promo = await promoService.updatePromo(req.params.id, updateData);

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: "Promo not found",
        });
      }

      res.status(200).json({
        success: true,
        data: promo,
        message: "Promo updated successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Delete promo
  async deletePromo(req: Request, res: Response) {
    try {
      const promo = await promoService.deletePromo(req.params.id);

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: "Promo not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Promo deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Apply promo
  async applyPromo(req: Request, res: Response) {
    try {
      const { orderAmount, customerId } = req.body;

      const result = await promoService.applyPromo(
        req.params.id,
        orderAmount,
        customerId,
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      res.status(200).json({
        success: true,
        discount: result.discount,
        message: "Promo applied successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get promo statistics
  async getPromoStats(req: Request, res: Response) {
    try {
      const stats = await promoService.getPromoStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get active promos
  async getActivePromos(req: Request, res: Response) {
    try {
      const promos = await promoService.getActivePromos();

      res.status(200).json({
        success: true,
        count: promos.length,
        data: promos,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Validate promo
  async validatePromo(req: Request, res: Response) {
    try {
      const { promoName, orderAmount } = req.body;
      const result = await promoService.validatePromo(promoName, orderAmount);

      res.status(200).json({
        success: true,
        valid: result.valid,
        message: result.message,
        discount: result.discount,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
