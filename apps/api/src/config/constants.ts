export const APP_NAME = "Role-Based URL Shortener API";
export const API_PREFIX = "/api/v1";
export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 2;
export const UNIQUE_CLICK_WINDOW_HOURS = 24;

// Earning Configuration - UNIFIED CPM SYSTEM
// Platform keeps this margin on CPM earnings
export const PLATFORM_MARGIN_PERCENT = 0.20; // Admin keeps 20%
// Members keep the remainder
export const MEMBER_EARNING_PERCENT = 0.80; // Members keep 80%

// Default CPM rate (when country not found or rate disabled)
export const DEFAULT_CPM_RATE = 2.5; // ₹2.5 or USD equivalent
export const DEFAULT_CURRENCY = "INR";

// CPM calculation precision (decimal places)
export const CPM_CALCULATION_DECIMALS = 6;

// DEPRECATED: Use country-based CPM rates instead
export const PAYOUT_PER_QUALIFIED_CLICK = 0.1; // Legacy constant for seed scripts
