export const ROLES = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  ADVERTISER: "ADVERTISER"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  BANNED: "BANNED",
  DELETED: "DELETED"
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const URL_STATUS = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED"
} as const;

export type UrlStatus = (typeof URL_STATUS)[keyof typeof URL_STATUS];

export const URL_AD_MODE = {
  DIRECT: "DIRECT",
  MONETIZED: "MONETIZED"
} as const;

export type UrlAdMode = (typeof URL_AD_MODE)[keyof typeof URL_AD_MODE];

export const EMAIL_EVENT_TYPE = {
  URL_PAUSED: "URL_PAUSED",
  URL_ACTIVATED: "URL_ACTIVATED",
  URL_DELETED: "URL_DELETED",
  ADMIN_ANNOUNCEMENT: "ADMIN_ANNOUNCEMENT"
} as const;

export type EmailEventType =
  (typeof EMAIL_EVENT_TYPE)[keyof typeof EMAIL_EVENT_TYPE];

export const EMAIL_DELIVERY_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED"
} as const;

export type EmailDeliveryStatus =
  (typeof EMAIL_DELIVERY_STATUS)[keyof typeof EMAIL_DELIVERY_STATUS];

export const PLAN_INTERVAL = {
  FREE: "FREE",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY"
} as const;

export type PlanInterval = (typeof PLAN_INTERVAL)[keyof typeof PLAN_INTERVAL];

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING: "PENDING",
  CANCELED: "CANCELED",
  EXPIRED: "EXPIRED",
  PAST_DUE: "PAST_DUE"
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const INVOICE_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELED: "CANCELED"
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const INVOICE_TYPE = {
  PLAN_PURCHASE: "PLAN_PURCHASE",
  CAMPAIGN: "CAMPAIGN",
  WALLET_TOPUP: "WALLET_TOPUP"
} as const;

export type InvoiceType = (typeof INVOICE_TYPE)[keyof typeof INVOICE_TYPE];

export const PAYMENT_PROVIDER = {
  RAZORPAY: "RAZORPAY"
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const WALLET_TX_TYPE = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT"
} as const;

export type WalletTxType = (typeof WALLET_TX_TYPE)[keyof typeof WALLET_TX_TYPE];

export const WALLET_TX_SOURCE = {
  EARNING: "EARNING",
  WITHDRAWAL: "WITHDRAWAL",
  TOPUP: "TOPUP",
  ADJUSTMENT: "ADJUSTMENT",
  REFERRAL_EARNING: "REFERRAL_EARNING"
} as const;

export type WalletTxSource = (typeof WALLET_TX_SOURCE)[keyof typeof WALLET_TX_SOURCE];

export const WITHDRAWAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID"
} as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS];

export const CAMPAIGN_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ENDED: "ENDED"
} as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export const CAMPAIGN_TYPE = {
  INTERSTITIAL: "INTERSTITIAL",
  BANNER: "BANNER",
  POPUP: "POPUP",
  DIRECT: "DIRECT"
} as const;

export type CampaignType = (typeof CAMPAIGN_TYPE)[keyof typeof CAMPAIGN_TYPE];

export const TARGET_DEVICE = {
  ALL: "ALL",
  DESKTOP: "DESKTOP",
  MOBILE: "MOBILE"
} as const;

export type TargetDevice = (typeof TARGET_DEVICE)[keyof typeof TARGET_DEVICE];

export type MongoId = string;
