import { HydratedDocument } from "mongoose";
import { VisitorQualificationModel, type VisitorQualificationDocument } from "../models/visitor-qualification.model";

type VisitorQualificationEntity = HydratedDocument<VisitorQualificationDocument>;

export class VisitorQualificationRepository {
  async claimUniqueCompletion(input: {
    ipHash: string;
    fingerprintHash?: string;
    shortCode: string;
    redirectSessionId: string;
    memberId?: string;
  }): Promise<{ isDuplicate: boolean; record: VisitorQualificationEntity }> {
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const existing = await VisitorQualificationModel.findOne({
      $or: [
        { ipHash: input.ipHash, expiresAt: { $gt: new Date() } },
        ...(input.fingerprintHash ? [{ fingerprintHash: input.fingerprintHash, expiresAt: { $gt: new Date() } }] : [])
      ]
    }).sort({ expiresAt: -1 }).exec();

    if (existing) {
      const duplicate = await VisitorQualificationModel.findOneAndUpdate(
        { redirectSessionId: input.redirectSessionId },
        {
          $setOnInsert: {
            ipHash: input.ipHash,
            fingerprintHash: input.fingerprintHash,
            shortCode: input.shortCode,
            redirectSessionId: input.redirectSessionId,
            memberId: input.memberId,
            firstCompletedAt: new Date(),
            expiresAt,
            isDuplicate: true
          }
        },
        { upsert: true, new: true }
      ).exec();

      return { isDuplicate: true, record: duplicate as VisitorQualificationEntity };
    }

    const record = await VisitorQualificationModel.create({
      ipHash: input.ipHash,
      fingerprintHash: input.fingerprintHash,
      shortCode: input.shortCode,
      redirectSessionId: input.redirectSessionId,
      memberId: input.memberId,
      firstCompletedAt: new Date(),
      expiresAt,
      isDuplicate: false
    });

    return { isDuplicate: false, record };
  }
}

export const visitorQualificationRepository = new VisitorQualificationRepository();
