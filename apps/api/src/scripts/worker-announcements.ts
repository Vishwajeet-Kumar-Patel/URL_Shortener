import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../config/env";
import { notificationService } from "../modules/notifications/notification.service";

dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runWorker = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  console.info("Announcement worker started");
  while (true) {
    try {
      const result = await notificationService.processAnnouncementJobs(100);
      if (result.processed > 0) {
        console.info(
          `[announcement-worker] processed=${result.processed} sent=${result.sent} failed=${result.failed}`
        );
      }
    } catch (error) {
      console.error("[announcement-worker] cycle failed", error);
    }
    await sleep(5000);
  }
};

runWorker().catch(async (error) => {
  console.error("Announcement worker failed to start", error);
  await mongoose.disconnect();
  process.exit(1);
});
