import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../config/env";
import { nanoid } from "nanoid";
import { UserModel } from "../models/user.model";
import { PlanModel } from "../models/plan.model";
import { ShortUrlModel } from "../models/short-url.model";
import { ClickLogModel } from "../models/click-log.model";
import { RedirectSessionModel } from "../models/redirect-session.model";
import { AnonymousSessionModel } from "../models/anonymous-session.model";
import { WithdrawalModel } from "../models/withdrawal.model";
import { referralRepository } from "../repositories/referral.repository";
import { walletService } from "../modules/wallet/wallet.service";
import { WALLET_TX_SOURCE, WITHDRAWAL_STATUS } from "../types/common";
import { hashPassword } from "../utils/hash";
import { PAYOUT_PER_QUALIFIED_CLICK } from "../config/constants";
import mongooseTypes from "mongoose";

dotenv.config();

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function upsertPlan(name: string, price: number, interval = "MONTHLY") {
  await PlanModel.findOneAndUpdate(
    { name },
    {
      $set: {
        name,
        price,
        currency: "INR",
        interval,
        description: `${name} plan`,
        isActive: true,
        isDefault: name.toLowerCase() === "free",
        limits: {
          maxLinks: name.toLowerCase() === "free" ? 100 : 10000,
          analyticsAccess: true,
          customAlias: name.toLowerCase() !== "free",
          campaignAccess: name.toLowerCase() !== "free",
          payoutLimit: name.toLowerCase() === "free" ? 0 : 100000
        }
      }
    },
    { upsert: true }
  );
}

async function createOrUpdateMember(email: string, password = "password123") {
  const existing = await UserModel.findOne({ email });
  if (existing) return existing;
  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    email,
    passwordHash,
    name: "Demo Member",
    role: "MEMBER",
    status: "ACTIVE",
    isEmailVerified: true
  } as any);
  return user;
}

async function seed() {
  console.log("Connecting to DB...");
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected.");

  // 1. Upsert demo plans
  console.log("Seeding plans...");
  await upsertPlan("Free", 0, "FREE");
  await upsertPlan("Starter", 199, "MONTHLY");
  await upsertPlan("Pro", 499, "MONTHLY");
  await upsertPlan("Business", 999, "MONTHLY");

  // 2. Ensure member exists
  const memberEmail = process.env.DEMO_MEMBER_EMAIL || "vishwajeetkumarpatelmgs@gmail.com";
  console.log(`Ensuring demo member ${memberEmail}`);
  const member = await createOrUpdateMember(memberEmail);

  // 3. Ensure referral profile exists
  console.log("Ensuring referral profile...");
  const profile = await referralRepository.getOrCreateProfile(String(member._id));
  if (!profile) {
    throw new Error("Failed to create referral profile for demo member");
  }
  const referralCode = profile.code;
  console.log("Referral code:", referralCode);

  // 4. Create a few member-owned short urls (non-anonymous)
  console.log("Creating member-owned short URLs...");
  const sampleTargets = [
    "https://example.com/article/1",
    "https://example.com/article/2",
    "https://example.com/article/3",
    "https://example.com/article/4",
    "https://example.com/article/5"
  ];

  for (const target of sampleTargets) {
    const code = nanoid(8);
    await ShortUrlModel.findOneAndUpdate(
      { shortCode: code },
      {
        $setOnInsert: {
          ownerId: member._id,
          createdByMemberId: member._id,
          originalUrl: target,
          normalizedUrl: target,
          shortCode: code,
          title: "Demo link",
          status: "ACTIVE",
          adMode: "MONETIZED"
        }
      },
      { upsert: true }
    );
  }

  // 5. Create referred users and anonymous sessions and many anonymous short URLs
  console.log("Creating referred users and anonymous sessions...");
  for (let i = 1; i <= 5; i++) {
    const rEmail = `referred+${i}@example.com`;
    let referred = await UserModel.findOne({ email: rEmail });
    if (!referred) {
      const hash = await hashPassword("password123");
      referred = await UserModel.create({
        email: rEmail,
        passwordHash: hash,
        name: `Referred ${i}`,
        role: "MEMBER",
        status: "ACTIVE",
        isEmailVerified: true
      } as any);
    }

    // attach the referred user to referral profile
    try {
      await referralRepository.attachReferredUser(referralCode, String(referred._id));
    } catch (err) {
      // ignore if already attached
    }

    // create anonymous sessions for this referred user
    const anonCount = rand(2, 4);
    for (let a = 0; a < anonCount; a++) {
      await AnonymousSessionModel.create({
        sessionToken: nanoid(40),
        referralCode,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ipHash: nanoid(16),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } as any);

      // create several anonymous short urls which were "created" by the member (so member earns)
      const urlsPerAnon = rand(2, 4);
      for (let u = 0; u < urlsPerAnon; u++) {
        const short = nanoid(8);
        const target = `https://demo.example.com/post/${nanoid(6)}`;
        const ownerId = new mongooseTypes.Types.ObjectId(env.APP_ANON_OWNER_ID);
        const doc = await ShortUrlModel.create({
          ownerId,
          createdByMemberId: member._id,
          originalUrl: target,
          normalizedUrl: target,
          shortCode: short,
          title: "Demo anonymous monetized",
          status: "ACTIVE",
          adMode: "MONETIZED",
          createdAt: new Date()
        } as any);

        // simulate many clicks for this short URL
        const clicks = rand(15, 40);
        for (let c = 0; c < clicks; c++) {
          const isQualified = Math.random() < 0.12; // ~12% qualified
          const click = await ClickLogModel.create({
            urlId: doc._id,
            shortCode: doc.shortCode,
            ownerId: ownerId,
            timestamp: new Date(Date.now() - rand(0, 1000 * 60 * 60 * 24 * 7)),
            ipAddress: `10.0.${rand(0,255)}.${rand(1,254)}`,
            ipHash: nanoid(16),
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            browser: "Chrome",
            os: "Windows",
            deviceType: "DESKTOP",
            referrer: "",
            country: "IN",
            city: "Bengaluru",
            isUnique: true,
            jsEnabled: true,
            cookiesEnabled: true,
            isBot: false,
            isSuspicious: false,
            isQualified: isQualified,
            qualificationReason: isQualified ? "time_spent_and_interaction" : undefined
          } as any);

          if (isQualified) {
            // credit earnings to member using walletService
            try {
              await walletService.credit(String(member._id), PAYOUT_PER_QUALIFIED_CLICK, WALLET_TX_SOURCE.EARNING, `click:${click._id}`, `Qualified payout (code: ${doc.shortCode})`);
            } catch (err) {
              console.warn("wallet credit error", err instanceof Error ? err.message : err);
            }

            // create a redirect session record to simulate completion
            try {
              await RedirectSessionModel.create({
                shortCode: doc.shortCode,
                clickLogId: click._id,
                ipAddress: click.ipAddress,
                ipHash: click.ipHash,
                userAgent: click.userAgent,
                browser: click.browser,
                os: click.os,
                deviceType: click.deviceType,
                referrer: click.referrer,
                country: click.country,
                city: click.city,
                isQualified: true,
                stepTimings: [
                  { step: "open", ts: new Date(Date.now() - 15000) },
                  { step: "viewed", ts: new Date(Date.now() - 5000) }
                ],
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                createdAt: new Date()
              } as any);
            } catch (err) {
              // ignore
            }
          }
        }
      }
    }
  }

  // 6. Guarantee a demo balance and create withdrawal records for dashboard testing
  console.log("Creating withdrawal requests...");
  const walletSummary = await walletService.getSummary(String(member._id));
  if (walletSummary.balance < 500) {
    await walletService.credit(
      String(member._id),
      500 - walletSummary.balance,
      WALLET_TX_SOURCE.ADJUSTMENT,
      "demo-wallet-topup",
      "Demo seed balance top-up"
    );
  }

  const firstWithdrawalAmount = 120;
  const secondWithdrawalAmount = 80;

  try {
    await walletService.requestWithdrawalAtomic(String(member._id), firstWithdrawalAmount);
    await WithdrawalModel.create({
      userId: member._id,
      amount: firstWithdrawalAmount,
      status: WITHDRAWAL_STATUS.PENDING,
      payoutMethod: "UPI",
      payoutAccount: "vishwajeet@upi",
      memo: "Demo withdrawal pending"
    } as any);

    await walletService.releasePending(String(member._id), firstWithdrawalAmount, "demo-payout-processed");
    await WithdrawalModel.create({
      userId: member._id,
      amount: firstWithdrawalAmount,
      status: WITHDRAWAL_STATUS.PAID,
      payoutMethod: "UPI",
      payoutAccount: "vishwajeetcenation@oksbi",
      approvedAt: new Date(),
      processedAt: new Date(),
      memo: "Demo payout processed"
    } as any);

    await walletService.requestWithdrawalAtomic(String(member._id), secondWithdrawalAmount);
    await WithdrawalModel.create({
      userId: member._id,
      amount: secondWithdrawalAmount,
      status: WITHDRAWAL_STATUS.PENDING,
      payoutMethod: "UPI",
      payoutAccount: "vishwajeetcenation@oksbi",
      memo: "Demo withdrawal pending"
    } as any);
  } catch (err) {
    console.warn("withdrawal creation error", err instanceof Error ? err.message : err);
  }

  console.log("Demo seeding complete. Disconnecting...");
  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
