import { env } from "../config/env";
import { prisma } from "../config/prisma";

type SmtpSettings = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
};

export type AdminSettingEntity = {
  id: string;
  key: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowedDomains: string[];
  smtp: SmtpSettings;
  createdAt: Date;
  updatedAt: Date;
};

const buildDefaults = () => ({
  maintenanceMode: false,
  maintenanceMessage: "",
  allowedDomains: [],
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromEmail: env.SMTP_FROM_EMAIL,
    fromName: env.SMTP_FROM_NAME
  } as SmtpSettings
});

const normalizeSmtp = (value: unknown): SmtpSettings => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const input = value as Record<string, unknown>;
  return {
    host: typeof input.host === "string" ? input.host : undefined,
    port: typeof input.port === "number" ? input.port : undefined,
    secure: typeof input.secure === "boolean" ? input.secure : undefined,
    user: typeof input.user === "string" ? input.user : undefined,
    pass: typeof input.pass === "string" ? input.pass : undefined,
    fromEmail: typeof input.fromEmail === "string" ? input.fromEmail : undefined,
    fromName: typeof input.fromName === "string" ? input.fromName : undefined
  };
};

const toEntity = (row: {
  id: string;
  key: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  allowedDomains: string[];
  smtp: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AdminSettingEntity => ({
  id: row.id,
  key: row.key,
  maintenanceMode: row.maintenanceMode,
  maintenanceMessage: row.maintenanceMessage ?? "",
  allowedDomains: row.allowedDomains,
  smtp: normalizeSmtp(row.smtp),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const buildStructuredUpdate = (update: Record<string, unknown>): {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  allowedDomains?: string[];
  smtp?: SmtpSettings;
} => {
  const structured: {
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    allowedDomains?: string[];
    smtp?: SmtpSettings;
  } = {};

  if (typeof update.maintenanceMode === "boolean") {
    structured.maintenanceMode = update.maintenanceMode;
  }
  if (typeof update.maintenanceMessage === "string") {
    structured.maintenanceMessage = update.maintenanceMessage;
  }
  if (Array.isArray(update.allowedDomains)) {
    structured.allowedDomains = update.allowedDomains as string[];
  }

  const smtp: SmtpSettings = {};
  const assignSmtpString = (key: keyof SmtpSettings, sourceKey: string) => {
    if (typeof update[sourceKey] === "string") {
      (smtp as Record<string, string | number | boolean | undefined>)[key] = update[sourceKey] as string;
    }
  };
  assignSmtpString("host", "smtp.host");
  assignSmtpString("user", "smtp.user");
  assignSmtpString("pass", "smtp.pass");
  assignSmtpString("fromEmail", "smtp.fromEmail");
  assignSmtpString("fromName", "smtp.fromName");
  if (typeof update["smtp.port"] === "number") smtp.port = update["smtp.port"] as number;
  if (typeof update["smtp.secure"] === "boolean") smtp.secure = update["smtp.secure"] as boolean;

  if (Object.keys(smtp).length > 0) {
    structured.smtp = smtp;
  }

  return structured;
};

export class AdminSettingRepository {
  async getSettings(): Promise<AdminSettingEntity> {
    const existing = await prisma.adminSetting.findUnique({ where: { key: "default" } });
    if (existing) return toEntity(existing);

    const created = await prisma.adminSetting.create({
      data: {
        key: "default",
        ...buildDefaults()
      }
    });

    return toEntity(created);
  }

  async updateSettings(update: Record<string, unknown>): Promise<AdminSettingEntity> {
    const current = await this.getSettings();
    const structured = buildStructuredUpdate(update);

    const updated = await prisma.adminSetting.update({
      where: { key: "default" },
      data: {
        ...(structured.maintenanceMode !== undefined ? { maintenanceMode: structured.maintenanceMode } : {}),
        ...(structured.maintenanceMessage !== undefined ? { maintenanceMessage: structured.maintenanceMessage } : {}),
        ...(structured.allowedDomains !== undefined ? { allowedDomains: structured.allowedDomains } : {}),
        ...(structured.smtp !== undefined ? { smtp: { ...current.smtp, ...structured.smtp } } : {})
      }
    });

    return toEntity(updated);
  }
}

export const adminSettingRepository = new AdminSettingRepository();
