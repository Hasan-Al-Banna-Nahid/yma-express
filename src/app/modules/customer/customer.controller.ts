import { Request, Response, NextFunction } from "express";
import { CustomerService, CustomerFilterOptions } from "./customer.service";
import mongoose from "mongoose";

export class CustomerController {
  // Get all customers with filters
  static async getAllCustomers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        search,
        phone,
        name,
        email,
        city,
        tags,
        minOrders,
        maxOrders,
        minSpent,
        maxSpent,
        startDate,
        endDate,
        isFavorite,
        page = "1",
        limit = "10",
        sortBy = "lastOrderDate",
        sortOrder = "desc",
      } = req.query;

      const filters: CustomerFilterOptions = {
        search: search as string,
        phone: phone as string,
        name: name as string,
        email: email as string,
        city: city as string,
        tags: tags ? (tags as string).split(",") : undefined,
        minOrders: minOrders ? parseInt(minOrders as string) : undefined,
        maxOrders: maxOrders ? parseInt(maxOrders as string) : undefined,
        minSpent: minSpent ? parseFloat(minSpent as string) : undefined,
        maxSpent: maxSpent ? parseFloat(maxSpent as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        isFavorite:
          isFavorite === "true"
            ? true
            : isFavorite === "false"
            ? false
            : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await CustomerService.getAllCustomers(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get customer by ID with order history
  static async getCustomerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const customerData = await CustomerService.getCustomerById(id);

      if (!customerData) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        data: customerData,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update customer
  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const updatedCustomer = await CustomerService.updateCustomer(
        id,
        updateData
      );

      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedCustomer,
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle favorite status
  static async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const updatedCustomer = await CustomerService.toggleFavorite(id);

      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedCustomer,
        message: `Customer ${
          updatedCustomer.isFavorite ? "added to" : "removed from"
        } favorites`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Add tag to customer
  static async addTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tag } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      if (!tag || typeof tag !== "string") {
        return res.status(400).json({
          success: false,
          message: "Tag is required and must be a string",
        });
      }

      const updatedCustomer = await CustomerService.addTag(id, tag.trim());

      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedCustomer,
        message: "Tag added successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove tag from customer
  static async removeTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tag } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      if (!tag || typeof tag !== "string") {
        return res.status(400).json({
          success: false,
          message: "Tag is required and must be a string",
        });
      }

      const updatedCustomer = await CustomerService.removeTag(id, tag.trim());

      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedCustomer,
        message: "Tag removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Get customer statistics
  static async getCustomerStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const stats = await CustomerService.getCustomerStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Search customers
  static async searchCustomers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { term } = req.query;

      if (!term || typeof term !== "string") {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      const customers = await CustomerService.searchCustomers(term.trim());

      res.status(200).json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete customer
  static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const deleted = await CustomerService.deleteCustomer(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Get customer by user ID
  static async getCustomerByUserId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const customer = await CustomerService.getCustomerByUserId(userId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }
}
