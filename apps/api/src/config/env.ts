import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Ensure API env files are loaded even when server is started from monorepo root.
const apiEnvPath = path.resolve(__dirname, "../../.env");
const apiLocalEnvPath = path.resolve(__dirname, "../../.env.local");
const shouldOverrideShellEnv = process.env.NODE_ENV !== "production";
dotenv.config({ path: apiEnvPath, override: shouldOverrideShellEnv });
dotenv.config({ path: apiLocalEnvPath, override: shouldOverrideShellEnv });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLIENT_ORIGIN: z.string().url("CLIENT_ORIGIN must be a valid URL").transform((val) => val.replace(/\/$/, "")),
  APP_PUBLIC_URL: z.string().url("APP_PUBLIC_URL must be a valid URL"),
  APP_ANON_OWNER_ID: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "APP_ANON_OWNER_ID must be a 24-char hex string")
    .default("000000000000000000000000"),
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  SMTP_FROM_EMAIL: z.string().email("SMTP_FROM_EMAIL must be a valid email"),
  SMTP_FROM_NAME: z.string().min(1).default("Link Shortener"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_CALLBACK_URL: z.string().url("GOOGLE_CALLBACK_URL must be a valid URL"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_API_BASE: z
    .string()
    .url("RAZORPAY_API_BASE must be a valid URL")
    .default("https://api.razorpay.com/v1"),
  CONTACT_TO_EMAIL: z.string().email("CONTACT_TO_EMAIL must be a valid email").optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsedEnv.data;
