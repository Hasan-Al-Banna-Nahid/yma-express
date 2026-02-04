import { Request, Response } from "express";
import { CustomerService } from "./customer.service";

export class CustomerController {
  static async getCustomers(req: Request, res: Response) {
    try {
      // Pass all query params including fromDate and toDate
      const result = await CustomerService.getCustomers(req.query);
      res.status(200).json({ ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getCustomerDetail(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const data = await CustomerService.getCustomerDetail(customerId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async prepareReorder(req: Request, res: Response) {
    try {
      // data now contains { items, totalAmount, customerName, customerId }
      const data = await CustomerService.prepareReorder(req.body);

      res.status(200).json({
        success: true,
        data,
        message: "Reorder prepared and confirmation email sent",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
