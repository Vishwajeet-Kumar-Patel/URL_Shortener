import nodemailer from "nodemailer";
import { env } from "../config/env";
import { adminSettingRepository } from "../repositories/admin-setting.repository";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedKey: string | null = null;

const resolveSmtpConfig = async (): Promise<SmtpConfig> => {
  const settings = await adminSettingRepository.getSettings();
  const smtp = settings.smtp ?? {};

  return {
    host: smtp.host ?? env.SMTP_HOST,
    port: smtp.port ?? env.SMTP_PORT,
    secure: smtp.secure ?? env.SMTP_SECURE,
    user: smtp.user ?? env.SMTP_USER,
    pass: smtp.pass ?? env.SMTP_PASS,
    fromEmail: smtp.fromEmail ?? env.SMTP_FROM_EMAIL,
    fromName: smtp.fromName ?? env.SMTP_FROM_NAME
  };
};

const getTransporter = async (): Promise<{ transporter: nodemailer.Transporter; config: SmtpConfig }> => {
  const config = await resolveSmtpConfig();
  const normalizedSecure =
    config.port === 587 ? false : config.port === 465 ? true : config.secure;
  const normalizedConfig: SmtpConfig = { ...config, secure: normalizedSecure };
  const key = JSON.stringify(normalizedConfig);

  if (!cachedTransporter || cachedKey !== key) {
    const auth =
      normalizedConfig.user && normalizedConfig.pass
        ? { user: normalizedConfig.user, pass: normalizedConfig.pass }
        : undefined;

    cachedTransporter = nodemailer.createTransport({
      host: normalizedConfig.host,
      port: normalizedConfig.port,
      secure: normalizedConfig.secure,
      auth,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    cachedKey = key;
  }

  return { transporter: cachedTransporter, config: normalizedConfig };
};

export const sendEmail = async (input: SendEmailInput): Promise<nodemailer.SentMessageInfo> => {
  const { transporter, config } = await getTransporter();

  return transporter.sendMail({
    from: `${config.fromName} <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });
};
