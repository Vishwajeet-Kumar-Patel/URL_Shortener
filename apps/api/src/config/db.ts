import mongoose from "mongoose";
import { env } from "./env";
import { prisma } from "./prisma";

export const connectDatabase = async (): Promise<void> => {
  try {
    await Promise.all([prisma.$connect(), mongoose.connect(env.MONGODB_URI)]);
    console.info("PostgreSQL and MongoDB connected successfully");
  } catch (error) {
    console.error("Database connection failed", error);
    throw error;
  }
};
