import { Response } from 'express';

export const ApiResponse = (
    res: Response,
    statusCode: number,
    message: string,
    data: any = null
) => {
    const response: any = {
        status: statusCode,
        message,
    };

    if (data) {
        response.data = data;
    }

    res.status(statusCode).json(response);
};