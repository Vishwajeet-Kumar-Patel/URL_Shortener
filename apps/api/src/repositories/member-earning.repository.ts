import { prisma } from "../config/prisma";

export type MemberEarningRecord = {
  id: string;
  memberId: string;
  shortLinkId: string;
  redirectSessionId: string;
  amount: number;
  visitorIpHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export class MemberEarningRepository {
  async createLedgerEntry(input: {
    memberId: string;
    shortLinkId: string;
    redirectSessionId: string;
    amount: number;
    visitorIpHash: string;
  }): Promise<MemberEarningRecord | null> {
    try {
      return (await prisma.memberEarning.create({ data: input })) as MemberEarningRecord;
    } catch {
      return null;
    }
  }

  async existsForSession(redirectSessionId: string): Promise<boolean> {
    return Boolean(await prisma.memberEarning.findUnique({ where: { redirectSessionId }, select: { id: true } }));
  }

  async listByMemberId(memberId: string): Promise<MemberEarningRecord[]> {
    return (await prisma.memberEarning.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } })) as MemberEarningRecord[];
  }
}

export const memberEarningRepository = new MemberEarningRepository();
