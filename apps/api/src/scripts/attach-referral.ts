import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../config/env";
import { referralRepository } from "../repositories/referral.repository";
import { userRepository } from "../repositories/user.repository";

dotenv.config();

const readArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
};

const run = async (): Promise<void> => {
  const email = (readArg("email") ?? process.env.REPAIR_REFERRAL_EMAIL ?? "").trim().toLowerCase();
  const referralCode = (readArg("code") ?? process.env.REPAIR_REFERRAL_CODE ?? "").trim().toUpperCase();

  if (!email || !referralCode) {
    throw new Error(
      "Usage: npm run referrals:attach -- --email=user@example.com --code=REFCODE (or set REPAIR_REFERRAL_EMAIL and REPAIR_REFERRAL_CODE)"
    );
  }

  await mongoose.connect(env.MONGODB_URI);

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  const profile = await referralRepository.findByCode(referralCode);
  if (!profile) {
    throw new Error(`Referral code not found: ${referralCode}`);
  }

  if (String(profile.ownerId) === user.id) {
    throw new Error("Cannot attach user to their own referral code");
  }

  const existing = await referralRepository.findByReferredUser(user.id);
  if (existing) {
    if (existing.code === referralCode) {
      console.info(`Already attached: ${email} -> ${referralCode}`);
      await mongoose.disconnect();
      return;
    }
    throw new Error(`User is already attached to another referral code: ${existing.code}`);
  }

  const linked = await referralRepository.attachReferredUser(referralCode, user.id);
  if (!linked) {
    throw new Error("Unable to attach user to referral code");
  }

  console.info(`Attached successfully: ${email} -> ${referralCode}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Referral attach repair failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
