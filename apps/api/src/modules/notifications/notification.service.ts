import { Types } from "mongoose";
import { announcementRepository } from "../../repositories/announcement.repository";
import { announcementJobRepository } from "../../repositories/announcement-job.repository";
import { emailLogRepository } from "../../repositories/email-log.repository";
import { userRepository } from "../../repositories/user.repository";
import {
  EMAIL_DELIVERY_STATUS,
  EMAIL_EVENT_TYPE,
  ROLES,
  type Role,
  type EmailEventType,
  type UrlStatus
} from "../../types/common";
import { sendEmail } from "../../utils/email";
import { buildAnnouncementEmailTemplate, buildUrlStatusEmailTemplate } from "./mail.templates";

type NotifyUrlStatusChangeInput = {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  shortCode: string;
  originalUrl: string;
  eventType: EmailEventType;
  status: UrlStatus;
};

export class NotificationService {
  async notifyUrlStatusChange(input: NotifyUrlStatusChangeInput): Promise<void> {
    const template = buildUrlStatusEmailTemplate({
      eventType: input.eventType,
      recipientName: input.recipientName,
      shortCode: input.shortCode,
      originalUrl: input.originalUrl,
      status: input.status
    });

    const log = await emailLogRepository.createEmailLog({
      userId: new Types.ObjectId(input.userId),
      email: input.recipientEmail,
      eventType: input.eventType,
      status: EMAIL_DELIVERY_STATUS.PENDING,
      payload: {
        shortCode: input.shortCode,
        originalUrl: input.originalUrl,
        status: input.status
      }
    });

    try {
      const result = await sendEmail({
        to: input.recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html
      });

      await emailLogRepository.updateDelivery({
        id: log.id,
        status: EMAIL_DELIVERY_STATUS.SENT,
        providerMessageId: result.messageId,
        sentAt: new Date()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email sending error";
      await emailLogRepository.updateDelivery({
        id: log.id,
        status: EMAIL_DELIVERY_STATUS.FAILED,
        error: message
      });
    }
  }

  async enqueueAdminAnnouncement(input: {
    announcementId: string;
    audience: "ALL" | Role;
    activeOnly?: boolean;
    maxRetries?: number;
  }): Promise<{ totalRecipients: number }> {
    const users =
      input.audience === "ALL"
        ? await userRepository.listUsers({ page: 1, limit: 1000000, status: input.activeOnly ? "ACTIVE" : undefined })
        : await userRepository.listUsers({
            page: 1,
            limit: 1000000,
            role: input.audience as typeof ROLES[keyof typeof ROLES],
            status: input.activeOnly ? "ACTIVE" : undefined
          });

    await announcementJobRepository.enqueueMany(
      users.data.map((user) => ({
        announcementId: input.announcementId,
        userId: String(user._id),
        email: user.email,
        maxRetries: input.maxRetries ?? 2
      }))
    );
    return { totalRecipients: users.total };
  }

  async processAnnouncementJobs(batchSize = 50): Promise<{ processed: number; sent: number; failed: number }> {
    const jobs = await announcementJobRepository.claimBatch(batchSize);
    let sent = 0;
    let failed = 0;
    const touchedAnnouncementIds = new Set<string>();

    for (const job of jobs) {
      touchedAnnouncementIds.add(String(job.announcementId));
      const user = await userRepository.findById(String(job.userId));
      const announcement = await announcementRepository.getById(String(job.announcementId));
      if (!user || !announcement) {
        await announcementJobRepository.markFailure(job.id, {
          error: "User or announcement missing",
          nextAttemptAt: new Date(Date.now() + 60_000),
          final: true
        });
        failed += 1;
        continue;
      }

      const template = buildAnnouncementEmailTemplate({
        recipientName: user.name,
        title: announcement.title,
        body: announcement.body
      });
      const log = await emailLogRepository.createEmailLog({
        userId: new Types.ObjectId(String(user._id)),
        email: user.email,
        eventType: EMAIL_EVENT_TYPE.ADMIN_ANNOUNCEMENT,
        status: EMAIL_DELIVERY_STATUS.PENDING,
        payload: { announcementId: announcement.id, title: announcement.title }
      });
      try {
        const result = await sendEmail({
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: template.html
        });
        await emailLogRepository.updateDelivery({
          id: log.id,
          status: EMAIL_DELIVERY_STATUS.SENT,
          providerMessageId: result.messageId,
          sentAt: new Date()
        });
        await announcementJobRepository.markSent(job.id);
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email sending error";
        const nextAttemptAt = new Date(Date.now() + Math.min(15 * 60_000, Math.pow(2, job.attempts + 1) * 30_000));
        await emailLogRepository.updateDelivery({
          id: log.id,
          status: EMAIL_DELIVERY_STATUS.FAILED,
          error: message
        });
        await announcementJobRepository.markFailure(job.id, {
          error: message,
          nextAttemptAt,
          final: job.attempts + 1 > job.maxRetries
        });
        failed += 1;
      }
    }

    for (const announcementId of touchedAnnouncementIds) {
      const stats = await announcementJobRepository.getStatsByAnnouncement(announcementId);
      const pending = await announcementJobRepository.countPendingByAnnouncement(announcementId);
      const status: "DRAFT" | "SENT" | "FAILED" =
        pending > 0 ? "DRAFT" : stats.failed > 0 ? "FAILED" : "SENT";
      await announcementRepository.markDelivery(announcementId, {
        status,
        sentAt: status === "SENT" ? new Date() : undefined,
        totalRecipients: stats.total,
        sentCount: stats.sent,
        failedCount: stats.failed
      });
    }

    return { processed: jobs.length, sent, failed };
  }
}

export const notificationService = new NotificationService();
