import { prisma } from "../config/prisma";

type VisitorQualificationEntity = Awaited<ReturnType<typeof prisma.visitorQualification.findFirst>>;

export class VisitorQualificationRepository {
  async claimUniqueCompletion(input: {
    ipHash: string;
    fingerprintHash?: string;
    shortCode: string;
    redirectSessionId: string;
    memberId?: string;
  }): Promise<{ isDuplicate: boolean; record: NonNullable<VisitorQualificationEntity> }> {
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const existing = await prisma.visitorQualification.findFirst({
      where: {
        OR: [
          { ipHash: input.ipHash, expiresAt: { gt: new Date() } },
          ...(input.fingerprintHash ? [{ fingerprintHash: input.fingerprintHash, expiresAt: { gt: new Date() } }] : [])
        ]
      },
      orderBy: { expiresAt: "desc" }
    });

    if (existing) {
      const duplicate = await prisma.visitorQualification.upsert({
        where: { redirectSessionId: input.redirectSessionId },
        create: {
          ipHash: input.ipHash,
          fingerprintHash: input.fingerprintHash,
          shortCode: input.shortCode,
          redirectSessionId: input.redirectSessionId,
          memberId: input.memberId,
          firstCompletedAt: new Date(),
          expiresAt,
          isDuplicate: true
        },
        update: {}
      });

      return { isDuplicate: true, record: duplicate };
    }

    const record = await prisma.visitorQualification.create({ data: {
      ipHash: input.ipHash,
      fingerprintHash: input.fingerprintHash,
      shortCode: input.shortCode,
      redirectSessionId: input.redirectSessionId,
      memberId: input.memberId,
      firstCompletedAt: new Date(),
      expiresAt,
      isDuplicate: false
    }});

    return { isDuplicate: false, record };
  }
}

export const visitorQualificationRepository = new VisitorQualificationRepository();
