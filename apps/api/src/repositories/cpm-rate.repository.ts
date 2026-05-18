import { prisma } from "../config/prisma";

type CpmRateEntity = Awaited<ReturnType<typeof prisma.cpmRate.findFirst>>;

export class CpmRateRepository {
  async listAll(): Promise<NonNullable<CpmRateEntity>[]> {
    return prisma.cpmRate.findMany({ orderBy: { countryCode: "asc" } });
  }

  async getByCountryCode(countryCode: string): Promise<NonNullable<CpmRateEntity> | null> {
    return prisma.cpmRate.findUnique({ where: { countryCode: countryCode.trim().toUpperCase() } });
  }

  async upsert(input: {
    countryCode: string;
    cpm: number;
    currency: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<NonNullable<CpmRateEntity>> {
    return prisma.cpmRate.upsert({
      where: { countryCode: input.countryCode.trim().toUpperCase() },
      create: {
        countryCode: input.countryCode.trim().toUpperCase(),
        cpm: input.cpm,
        currency: input.currency.trim().toUpperCase(),
        isActive: input.isActive ?? true,
        notes: input.notes
      },
      update: {
        cpm: input.cpm,
        currency: input.currency.trim().toUpperCase(),
        isActive: input.isActive ?? true,
        notes: input.notes
      }
    });
  }

  async getApplicableRate(countryCode?: string): Promise<NonNullable<CpmRateEntity> | null> {
    const normalized = countryCode?.trim().toUpperCase();
    if (normalized) {
      const exact = await prisma.cpmRate.findFirst({ where: { countryCode: normalized, isActive: true } });
      if (exact) return exact;
    }
    return prisma.cpmRate.findFirst({ where: { countryCode: "DEFAULT", isActive: true } });
  }
}

export const cpmRateRepository = new CpmRateRepository();
