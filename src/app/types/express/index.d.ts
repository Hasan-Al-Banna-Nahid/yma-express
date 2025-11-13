// src/types/express/index.d.ts
import "express";
import { IUser } from '../../interfaces/user.interface';
import { Secret } from 'jsonwebtoken';

declare module "express-serve-static-core" {
    interface Request {
        user?: {
            id: string;
            role: string;
            email?: string;
            name?: string;
            // add more fields if you attach them in protect()
        };
    }
}




declare global {
    namespace Express {
        /** What passport/your app stores on req.user */
        interface User extends IUser {}

        interface Request {
            /** Now req.user is your IUser (or undefined if not set) */
            user?: IUser;
        }
    }
}

export {}; // ensure this file is treated as a module
declare namespace NodeJS {
    interface ProcessEnv {
      
        expiresIn:number;
        NODE_ENV?: 'development' | 'production' | 'test';
        PORT?: string;

        MONGO_URI: string;

        JWT_SECRET: string;
        JWT_EXPIRES_IN?: string;

        JWT_REFRESH_SECRET: string;
        JWT_REFRESH_EXPIRES_IN?: string;

        BCRYPT_SALT_ROUNDS?: string;

        CORS_ORIGIN?: string;
        FRONTEND_URL?: string;
    }
}


