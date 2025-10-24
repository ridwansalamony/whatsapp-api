import dotenv from "dotenv";

dotenv.config();

export const DATABASE_URL: string = process.env.DATABASE_URL || "";
export const SESSION_NAME: string = process.env.SESSION_NAME || "";
export const PORT: number = Number(process.env.PORT) || 3000;
