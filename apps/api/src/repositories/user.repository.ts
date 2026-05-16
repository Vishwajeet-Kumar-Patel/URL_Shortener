import { prisma } from "../config/prisma";
import { USER_STATUS, type Role, type UserStatus } from "../types/common";

type RefreshTokenRecord = {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date | null;
  ip?: string | null;
  deviceInfo?: string | null;
};

type PrismaUserRow = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  authProvider: string;
  googleId: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  isEmailVerified: boolean;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  lastLoginAt: Date | null;
  refreshTokens: Array<{
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
    ip: string | null;
    deviceInfo: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const includeRefreshTokens = {
  refreshTokens: true
} as const;

export class UserRecord {
  id: string;
  get _id(): string {
    return this.id;
  }
  name: string;
  email: string;
  passwordHash: string;
  authProvider: "LOCAL" | "GOOGLE";
  googleId?: string | null;
  avatarUrl?: string | null;
  role: Role;
  status: UserStatus;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
  refreshTokens: RefreshTokenRecord[];
  createdAt: Date;
  updatedAt: Date;

  constructor(private readonly repository: UserRepository, row: PrismaUserRow) {
    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.passwordHash = row.passwordHash;
    this.authProvider = row.authProvider === "GOOGLE" ? "GOOGLE" : "LOCAL";
    this.googleId = row.googleId;
    this.avatarUrl = row.avatarUrl;
    this.role = row.role;
    this.status = row.status;
    this.isEmailVerified = row.isEmailVerified;
    this.emailVerificationTokenHash = row.emailVerificationTokenHash;
    this.emailVerificationExpiresAt = row.emailVerificationExpiresAt;
    this.passwordResetTokenHash = row.passwordResetTokenHash;
    this.passwordResetExpiresAt = row.passwordResetExpiresAt;
    this.lastLoginAt = row.lastLoginAt;
    this.refreshTokens = row.refreshTokens.map((token) => ({
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      revokedAt: token.revokedAt,
      ip: token.ip,
      deviceInfo: token.deviceInfo
    }));
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  async save(): Promise<this> {
    await this.repository.save(this);
    return this;
  }
}

const toUserRecord = (repository: UserRepository, row: PrismaUserRow): UserRecord => new UserRecord(repository, row);

export class UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await prisma.user.findUnique({ where: { email }, include: includeRefreshTokens });
    return row ? toUserRecord(this, row as PrismaUserRow) : null;
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    authProvider?: "LOCAL" | "GOOGLE";
    googleId?: string;
    avatarUrl?: string;
  }): Promise<UserRecord> {
    const row = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        authProvider: input.authProvider ?? "LOCAL",
        googleId: input.googleId,
        avatarUrl: input.avatarUrl,
        status: USER_STATUS.ACTIVE,
        isEmailVerified: false
      },
      include: includeRefreshTokens
    });

    return toUserRecord(this, row as PrismaUserRow);
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const row = await prisma.user.findUnique({ where: { googleId }, include: includeRefreshTokens });
    return row ? toUserRecord(this, row as PrismaUserRow) : null;
  }

  async findByEmailVerificationToken(tokenHash: string): Promise<UserRecord | null> {
    const row = await prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { gt: new Date() }
      },
      include: includeRefreshTokens
    });

    return row ? toUserRecord(this, row as PrismaUserRow) : null;
  }

  async findByPasswordResetToken(tokenHash: string): Promise<UserRecord | null> {
    const row = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() }
      },
      include: includeRefreshTokens
    });

    return row ? toUserRecord(this, row as PrismaUserRow) : null;
  }

  async findById(userId: string): Promise<UserRecord | null> {
    const row = await prisma.user.findUnique({ where: { id: userId }, include: includeRefreshTokens });
    return row ? toUserRecord(this, row as PrismaUserRow) : null;
  }

  async findByIdWithRefreshToken(userId: string, tokenHash: string): Promise<UserRecord | null> {
    const row = await prisma.user.findFirst({
      where: {
        id: userId,
        refreshTokens: {
          some: {
            tokenHash,
            revokedAt: null,
            expiresAt: { gt: new Date() }
          }
        }
      },
      include: includeRefreshTokens
    });

    return row ? toUserRecord(this, row as PrismaUserRow) : null;
  }

  async listUsers(input: {
    page: number;
    limit: number;
    status?: UserStatus;
    role?: Role;
    search?: string;
  }): Promise<{ data: UserRecord[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (input.status) where.status = input.status;
    if (input.role) where.role = input.role;
    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: "insensitive" } },
        { email: { contains: input.search, mode: "insensitive" } }
      ];
    }

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: input.limit, include: includeRefreshTokens }),
      prisma.user.count({ where })
    ]);

    return {
      data: data.map((row) => toUserRecord(this, row as PrismaUserRow)),
      total
    };
  }

  async updateStatus(userId: string, status: UserStatus): Promise<UserRecord | null> {
    await prisma.userRefreshToken.deleteMany({ where: { userId } });
    const row = await prisma.user.update({ where: { id: userId }, data: { status } });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updateRole(userId: string, role: Role): Promise<UserRecord | null> {
    const row = await prisma.user.update({ where: { id: userId }, data: { role } });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updateProfile(userId: string, input: { name?: string; avatarUrl?: string }): Promise<UserRecord | null> {
    const row = await prisma.user.update({ where: { id: userId }, data: input });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<UserRecord | null> {
    const row = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updateEmailVerification(userId: string, input: {
    tokenHash: string | null;
    expiresAt: Date | null;
    isEmailVerified?: boolean;
  }): Promise<UserRecord | null> {
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: input.tokenHash,
        emailVerificationExpiresAt: input.expiresAt,
        ...(input.isEmailVerified !== undefined ? { isEmailVerified: input.isEmailVerified } : {})
      }
    });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updateEmailReverify(
    userId: string,
    newEmail: string,
    verificationTokenHash: string,
    verificationExpiresAt: Date,
    isEmailVerified: boolean
  ): Promise<UserRecord | null> {
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerificationTokenHash: verificationTokenHash,
        emailVerificationExpiresAt: verificationExpiresAt,
        isEmailVerified
      }
    });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async revertEmailSnapshot(
    userId: string,
    snapshot: { email: string; isEmailVerified: boolean }
  ): Promise<UserRecord | null> {
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        email: snapshot.email,
        isEmailVerified: snapshot.isEmailVerified,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null
      }
    });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updatePasswordReset(userId: string, input: {
    tokenHash: string | null;
    expiresAt: Date | null;
  }): Promise<UserRecord | null> {
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: input.tokenHash,
        passwordResetExpiresAt: input.expiresAt
      }
    });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async updatePasswordAndClearTokens(userId: string, passwordHash: string): Promise<UserRecord | null> {
    await prisma.userRefreshToken.deleteMany({ where: { userId } });
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null
      }
    });
    return toUserRecord(this, (await prisma.user.findUnique({ where: { id: row.id }, include: includeRefreshTokens })) as PrismaUserRow);
  }

  async save(user: UserRecord): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          authProvider: user.authProvider,
          googleId: user.googleId ?? null,
          avatarUrl: user.avatarUrl ?? null,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          emailVerificationTokenHash: user.emailVerificationTokenHash ?? null,
          emailVerificationExpiresAt: user.emailVerificationExpiresAt ?? null,
          passwordResetTokenHash: user.passwordResetTokenHash ?? null,
          passwordResetExpiresAt: user.passwordResetExpiresAt ?? null,
          lastLoginAt: user.lastLoginAt ?? null
        }
      });

      await tx.userRefreshToken.deleteMany({ where: { userId: user.id } });
      if (user.refreshTokens.length > 0) {
        await tx.userRefreshToken.createMany({
          data: user.refreshTokens.map((token) => ({
            userId: user.id,
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            createdAt: token.createdAt,
            revokedAt: token.revokedAt ?? null,
            ip: token.ip ?? null,
            deviceInfo: token.deviceInfo ?? null
          }))
        });
      }
    });
  }
}

export const userRepository = new UserRepository();