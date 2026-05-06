import { HydratedDocument } from "mongoose";
import { MemberEarningModel, type MemberEarningDocument } from "../models/member-earning.model";

type MemberEarningEntity = HydratedDocument<MemberEarningDocument>;

export class MemberEarningRepository {
  async createLedgerEntry(input: {
    memberId: string;
    shortLinkId: string;
    redirectSessionId: string;
    amount: number;
    visitorIpHash: string;
  }): Promise<MemberEarningEntity | null> {
    try {
      return await MemberEarningModel.create(input);
    } catch {
      return null;
    }
  }

  async existsForSession(redirectSessionId: string): Promise<boolean> {
    const existing = await MemberEarningModel.exists({ redirectSessionId });
    return Boolean(existing);
  }
}

export const memberEarningRepository = new MemberEarningRepository();
