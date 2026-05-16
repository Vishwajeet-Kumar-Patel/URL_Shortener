import mongoose, { Types } from "mongoose";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

const asRole = (value: unknown): "ADMIN" | "MEMBER" | "ADVERTISER" => {
  if (value === "ADMIN" || value === "ADVERTISER") return value;
  return "MEMBER";
};

const asStatus = (value: unknown): "ACTIVE" | "BANNED" | "DELETED" => {
  if (value === "BANNED" || value === "DELETED") return value;
  return "ACTIVE";
};

const asAuthProvider = (value: unknown): "LOCAL" | "GOOGLE" => {
  return value === "GOOGLE" ? "GOOGLE" : "LOCAL";
};

async function migrateUsersAndOwnership(): Promise<void> {
  console.info("Connecting to MongoDB for user migration...");
  await mongoose.connect(env.MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection db is undefined");
  }

  const usersCollection = db.collection("users");
  const users = await usersCollection.find({}).toArray();
  console.info(`Found ${users.length} MongoDB users`);

  const mongoToPgUserId = new Map<string, string>();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of users) {
    const emailRaw = typeof doc.email === "string" ? doc.email : "";
    const email = emailRaw.trim().toLowerCase();

    if (!email) {
      skipped += 1;
      continue;
    }

    const name = typeof doc.name === "string" && doc.name.trim().length > 0 ? doc.name.trim() : email;
    const passwordHash = typeof doc.passwordHash === "string" && doc.passwordHash.length > 0
      ? doc.passwordHash
      : "$2b$12$9f6BhfQ4WQvH8hM1VOw/uu8hY2D5FzY7n/KmxbXXw95Kj8SU4l3GS";

    const now = new Date();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        name,
        email,
        passwordHash,
        authProvider: asAuthProvider(doc.authProvider),
        googleId: typeof doc.googleId === "string" ? doc.googleId : null,
        avatarUrl: typeof doc.avatarUrl === "string" ? doc.avatarUrl : null,
        role: asRole(doc.role),
        status: asStatus(doc.status),
        isEmailVerified: Boolean(doc.isEmailVerified),
        emailVerificationTokenHash:
          typeof doc.emailVerificationTokenHash === "string" ? doc.emailVerificationTokenHash : null,
        emailVerificationExpiresAt:
          doc.emailVerificationExpiresAt instanceof Date ? doc.emailVerificationExpiresAt : null,
        passwordResetTokenHash:
          typeof doc.passwordResetTokenHash === "string" ? doc.passwordResetTokenHash : null,
        passwordResetExpiresAt:
          doc.passwordResetExpiresAt instanceof Date ? doc.passwordResetExpiresAt : null,
        lastLoginAt: doc.lastLoginAt instanceof Date ? doc.lastLoginAt : null
      },
      update: {
        name,
        passwordHash,
        authProvider: asAuthProvider(doc.authProvider),
        googleId: typeof doc.googleId === "string" ? doc.googleId : null,
        avatarUrl: typeof doc.avatarUrl === "string" ? doc.avatarUrl : null,
        role: asRole(doc.role),
        status: asStatus(doc.status),
        isEmailVerified: Boolean(doc.isEmailVerified),
        emailVerificationTokenHash:
          typeof doc.emailVerificationTokenHash === "string" ? doc.emailVerificationTokenHash : null,
        emailVerificationExpiresAt:
          doc.emailVerificationExpiresAt instanceof Date ? doc.emailVerificationExpiresAt : null,
        passwordResetTokenHash:
          typeof doc.passwordResetTokenHash === "string" ? doc.passwordResetTokenHash : null,
        passwordResetExpiresAt:
          doc.passwordResetExpiresAt instanceof Date ? doc.passwordResetExpiresAt : null,
        lastLoginAt: doc.lastLoginAt instanceof Date ? doc.lastLoginAt : null
      },
      select: { id: true }
    });

    const mongoId = String(doc._id ?? "");
    if (mongoId) {
      mongoToPgUserId.set(mongoId, user.id);
    }

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }

    const refreshTokens = Array.isArray(doc.refreshTokens) ? doc.refreshTokens : [];
    for (const token of refreshTokens) {
      const tokenHash = typeof token?.tokenHash === "string" ? token.tokenHash : "";
      const expiresAt = token?.expiresAt instanceof Date ? token.expiresAt : null;
      if (!tokenHash || !expiresAt) continue;

      await prisma.userRefreshToken.upsert({
        where: {
          userId_tokenHash: {
            userId: user.id,
            tokenHash
          }
        },
        create: {
          userId: user.id,
          tokenHash,
          expiresAt,
          createdAt: token?.createdAt instanceof Date ? token.createdAt : now,
          revokedAt: token?.revokedAt instanceof Date ? token.revokedAt : null,
          ip: typeof token?.ip === "string" ? token.ip : null,
          deviceInfo: typeof token?.deviceInfo === "string" ? token.deviceInfo : null
        },
        update: {
          expiresAt,
          revokedAt: token?.revokedAt instanceof Date ? token.revokedAt : null,
          ip: typeof token?.ip === "string" ? token.ip : null,
          deviceInfo: typeof token?.deviceInfo === "string" ? token.deviceInfo : null
        }
      });
    }
  }

  console.info(`Users migrated. created=${created}, updated=${updated}, skipped=${skipped}`);

  // Remap Mongo owner references from old Mongo user _id to new PostgreSQL user id.
  const shortUrls = db.collection("shorturls");
  const clickLogs = db.collection("clicklogs");
  const campaigns = db.collection("campaigns");

  let remappedOwnerRefs = 0;

  for (const [mongoUserId, pgUserId] of mongoToPgUserId.entries()) {
    if (!Types.ObjectId.isValid(mongoUserId)) continue;
    const sourceId = new Types.ObjectId(mongoUserId);

    const [shortUrlOwnerResult, shortUrlCreatedByResult, clickOwnerResult, campaignOwnerResult] = await Promise.all([
      shortUrls.updateMany({ ownerId: sourceId }, { $set: { ownerId: pgUserId } }),
      shortUrls.updateMany({ createdByMemberId: sourceId }, { $set: { createdByMemberId: pgUserId } }),
      clickLogs.updateMany({ ownerId: sourceId }, { $set: { ownerId: pgUserId } }),
      campaigns.updateMany({ ownerId: sourceId }, { $set: { ownerId: pgUserId } })
    ]);

    remappedOwnerRefs +=
      shortUrlOwnerResult.modifiedCount +
      shortUrlCreatedByResult.modifiedCount +
      clickOwnerResult.modifiedCount +
      campaignOwnerResult.modifiedCount;
  }

  console.info(`Owner references remapped: ${remappedOwnerRefs}`);

  await mongoose.disconnect();
  await prisma.$disconnect();
  console.info("User migration complete");
}

migrateUsersAndOwnership().catch(async (error) => {
  console.error("User migration failed", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  await prisma.$disconnect();
  process.exit(1);
});
