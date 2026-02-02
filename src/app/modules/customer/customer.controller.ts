import { NextFunction, Request, Response } from "express";
import { CustomerService } from "./customer.service";

export class CustomerController {
  static async getCustomers(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await CustomerService.getCustomers(query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Server error while fetching customers",
      });
    }
  }

  static async getCustomerDetail(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const detail = await CustomerService.getCustomerDetail(customerId);

      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (error: any) {
      res.status(error.message.includes("not found") ? 404 : 500).json({
        success: false,
        message: error.message || "Error fetching customer detail",
      });
    }
  }

  static async prepareReorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId, itemsToReorder } = req.body;

      // Validate request body
      if (!customerId) {
        return res
          .status(400)
          .json({ success: false, message: "Customer ID is required" });
      }

      if (
        !itemsToReorder ||
        !Array.isArray(itemsToReorder) ||
        itemsToReorder.length === 0
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Items to reorder are required" });
      }

      // Call service
      const reorderData = await CustomerService.prepareReorder({
        customerId,
        itemsToReorder,
      });

      return res.status(200).json({
        success: true,
        message: "Reorder prepared and email sent successfully",
        data: reorderData,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to prepare reorder",
      });
    }
  }
}
