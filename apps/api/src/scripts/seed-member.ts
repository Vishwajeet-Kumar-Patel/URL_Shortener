import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { ROLES, USER_STATUS } from "../types/common";
import { hashPassword } from "../utils/hash";
import { referralRepository } from "../repositories/referral.repository";

dotenv.config();

const bootstrapMember = async (): Promise<void> => {
  const email = process.env.SEED_MEMBER_EMAIL ?? "vishwajeetkumarpatelmgs@gmail.com";
  const name = process.env.SEED_MEMBER_NAME ?? "Vishwajeet Patel";
  const password = process.env.SEED_MEMBER_PASSWORD ?? "ChangeMe123!";

  await mongoose.connect(env.MONGODB_URI);

  const passwordHash = await hashPassword(password);
  await UserModel.updateOne(
    { email: email.toLowerCase() },
    {
      $set: {
        name,
        passwordHash,
        role: ROLES.MEMBER,
        status: USER_STATUS.ACTIVE,
        isEmailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null
      }
    },
    { upsert: true }
  ).exec();

  // Ensure referral profile exists for this member
  // If user was upserted, find the document id
  const user = await UserModel.findOne({ email: email.toLowerCase() }).exec();
  if (user) {
    await referralRepository.getOrCreateProfile(String(user._id));
  }

  console.info(`Member bootstrap complete for: ${email}`);
  await mongoose.disconnect();
};

bootstrapMember().catch(async (error) => {
  console.error("Member bootstrap failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
