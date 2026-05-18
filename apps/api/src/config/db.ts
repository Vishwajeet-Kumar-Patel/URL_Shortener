import { prisma } from "./prisma";

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.info("PostgreSQL connected successfully");
  } catch (error) {
    console.error("Database connection failed", error);
    throw error;
  }
};
