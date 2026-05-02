import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { ShortUrlModel } from "../models/short-url.model";
import { ClickLogModel } from "../models/click-log.model";
import { WalletModel } from "../models/wallet.model";
import { WalletLedgerModel } from "../models/wallet-ledger.model";
import { MemberMetricsModel } from "../models/member-metrics.model";
import { AnonymousSessionModel } from "../models/anonymous-session.model";
// import { RedirectSessionModel } from "../models/redirect-session.model"; // Unused
import { ReferralModel } from "../models/referral.model";
import { ROLES, USER_STATUS, URL_STATUS, URL_AD_MODE, WALLET_TX_SOURCE, WALLET_TX_TYPE } from "../types/common";
import { hashPassword, hashToken } from "../utils/hash";
import { generateShortCode } from "../utils/nanoid";

dotenv.config();

const SEED_EMAILS = [
  "admin@purplemerit.com",
  "partner1@gmail.com",
  "partner2@gmail.com",
  "partner3@gmail.com",
  "partner4@gmail.com",
  "partner5@gmail.com"
];

const SAMPLE_URLS = [
  "https://unsplash.com/photos/mountain-landscape-lSO_vN_4N_E",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://medium.com/topic/technology",
  "https://github.com/trending",
  "https://www.producthunt.com/",
  "https://news.ycombinator.com/",
  "https://www.theverge.com/tech",
  "https://techcrunch.com/"
];

const COUNTRIES = ["IN", "US", "GB", "CA", "DE", "FR", "AU", "JP"];
const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"];
const OS = ["Windows", "MacOS", "iOS", "Android"];

const seedDemoData = async (): Promise<void> => {
  console.info("Starting demo data seeding...");
  await mongoose.connect(env.MONGODB_URI);

  // 1. Seed Users
  const users = [];
  const passwordHash = await hashPassword("DemoPass123!");

  for (let i = 0; i < SEED_EMAILS.length; i++) {
    const email = SEED_EMAILS[i];
    const role = i === 0 ? ROLES.ADMIN : ROLES.MEMBER;
    const name = i === 0 ? "System Admin" : `Partner Member ${i}`;
    
    const user = await UserModel.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          passwordHash,
          role,
          status: USER_STATUS.ACTIVE,
          isEmailVerified: true
        }
      },
      { upsert: true, new: true }
    ).exec();
    users.push(user);
    
    // Ensure Wallet exists
    await WalletModel.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { balance: 0, currency: "INR" } },
      { upsert: true }
    ).exec();

    // Ensure Referral Profile
    if (role === ROLES.MEMBER) {
      await ReferralModel.findOneAndUpdate(
        { ownerId: user._id },
        { $setOnInsert: { code: `REF${i}${Math.floor(Math.random() * 1000)}`, totalReferred: 0, totalEarnings: 0 } },
        { upsert: true }
      ).exec();
      
      await MemberMetricsModel.findOneAndUpdate(
        { memberId: user._id },
        { $setOnInsert: { totalAnonymousUsersBrought: 0, totalAnonymousLinksGenerated: 0, totalEarnings: 0 } },
        { upsert: true }
      ).exec();
    }
  }

  const admin = users[0];
  const members = users.slice(1);

  // 2. Seed Anonymous Sessions (Referred by members)
  console.info("Seeding anonymous sessions...");
  const anonSessions = [];
  for (let i = 0; i < 20; i++) {
    const referrer = members[i % members.length];
    const sessionToken = `anon_session_${i}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const session = await AnonymousSessionModel.create({
      sessionToken,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      ipHash: hashToken(`192.168.1.${i}`),
      memberId: referrer._id,
      isValid: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    anonSessions.push(session);
    
    // Update metrics
    await MemberMetricsModel.updateOne(
      { memberId: referrer._id },
      { $inc: { totalAnonymousUsersBrought: 1 } }
    );
  }

  // 3. Seed Short URLs
  console.info("Seeding short URLs...");
  const shortUrls = [];
  
  // Member URLs
  for (const member of members) {
    for (let i = 0; i < 5; i++) {
      const originalUrl = SAMPLE_URLS[Math.floor(Math.random() * SAMPLE_URLS.length)];
      const url = await ShortUrlModel.create({
        ownerId: member._id,
        shortCode: generateShortCode(),
        originalUrl,
        normalizedUrl: originalUrl,
        status: URL_STATUS.ACTIVE,
        adMode: URL_AD_MODE.DIRECT,
        clickCount: 0
      });
      shortUrls.push(url);
    }
  }

  // Anonymous URLs (Referred)
  for (const session of anonSessions) {
    const originalUrl = SAMPLE_URLS[Math.floor(Math.random() * SAMPLE_URLS.length)];
    const url = await ShortUrlModel.create({
      ownerId: admin._id, // Owned by system
      createdByMemberId: session.memberId,
      anonymousSessionId: session._id,
      shortCode: generateShortCode(),
      originalUrl,
      normalizedUrl: originalUrl,
      status: URL_STATUS.ACTIVE,
      adMode: URL_AD_MODE.MONETIZED,
      clickCount: 0
    });
    shortUrls.push(url);
    
    // Update metrics
    await MemberMetricsModel.updateOne(
      { memberId: session.memberId },
      { $inc: { totalAnonymousLinksGenerated: 1 } }
    );
  }

  // 4. Seed Clicks and Redirect Sessions
  console.info("Seeding clicks and analytics...");
  for (const url of shortUrls) {
    const clickCount = Math.floor(Math.random() * 50) + 10;
    for (let i = 0; i < clickCount; i++) {
      const isQualified = Math.random() > 0.3;
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
      const os = OS[Math.floor(Math.random() * OS.length)];
      
      const click = await ClickLogModel.create({
        urlId: url._id,
        shortCode: url.shortCode,
        ownerId: url.ownerId,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        ipAddress: `1.2.3.${Math.floor(Math.random() * 255)}`,
        ipHash: hashToken(`ip_${i}_${url.shortCode}`),
        userAgent: `${browser} on ${os}`,
        browser,
        os,
        country,
        isUnique: true,
        isQualified,
        qualificationReason: isQualified ? "completed_funnel" : "timer_not_reached"
      });

      if (isQualified) {
        await ShortUrlModel.updateOne({ _id: url._id }, { $inc: { clickCount: 1 } });
        
        // If it's a referred URL, payout goes to the creator member
        const recipientId = url.createdByMemberId || url.ownerId;
        const wallet = await WalletModel.findOne({ userId: recipientId });
        const currentBalance = wallet?.balance ?? 0;
        const amount = 0.50; // Mock rate

        await WalletLedgerModel.create({
          walletId: wallet?._id,
          userId: recipientId,
          amount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + amount,
          type: WALLET_TX_TYPE.CREDIT,
          source: WALLET_TX_SOURCE.EARNING,
          referenceId: `click:${click._id}`,
          description: `Monetized click payout for ${url.shortCode}`,
          status: "COMPLETED"
        });

        await WalletModel.updateOne({ userId: recipientId }, { $inc: { balance: amount } });
        await MemberMetricsModel.updateOne(
          { memberId: recipientId },
          { $inc: { totalEarnings: amount, totalQualifiedClicks: 1 } }
        );
      }
    }
  }

  console.info("Seeding complete!");
  await mongoose.disconnect();
};

seedDemoData().catch(async (err) => {
  console.error("Seeding failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
