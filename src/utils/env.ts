import dotenv from "dotenv";

dotenv.config();

export const PORT: number = Number(process.env.PORT) || 3000;
export const NODE_ENV: string = process.env.NODE_ENV || "development";

// Database
export const DATABASE_URL: string = process.env.DATABASE_URL || "";
export const PGHOST: string = process.env.PGHOST || "localhost";
export const PGPORT: number = Number(process.env.PGPORT) || 5432;
export const PGUSER: string = process.env.PGUSER || "postgres";
export const PGPASSWORD: string = process.env.PGPASSWORD || "postgres";
export const PGDATABASE: string = process.env.PGDATABASE || "whatsapp_api";
export const PGSSL: boolean = process.env.PGSSL === "true";

// WhatsApp Client
export const SESSION_NAME: string = process.env.SESSION_NAME || "whatsapp_session";
export const PUPPETEER_EXECUTABLE_PATH: string | undefined = process.env.PUPPETEER_EXECUTABLE_PATH;

// Security
export const API_KEY: string | undefined = process.env.API_KEY || undefined;
