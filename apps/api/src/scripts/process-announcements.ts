import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../config/env";
import { notificationService } from "../modules/notifications/notification.service";

dotenv.config();

const run = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  const result = await notificationService.processAnnouncementJobs(100);
  console.info(
    `Announcement jobs processed: processed=${result.processed}, sent=${result.sent}, failed=${result.failed}`
  );
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Announcement job processing failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
