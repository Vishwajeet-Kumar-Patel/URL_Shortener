import { z } from "zod";

export const registerSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128),
    referralCode: z.string().trim().min(4).max(24).optional()
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128)
  })
};

export const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1)
  })
};

export const resendVerificationSchema = {
  body: z.object({
    email: z.string().trim().email().max(255)
  })
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1)
  })
};

export const logoutSchema = {
  body: z.object({
    refreshToken: z.string().min(1)
  })
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().email().max(255)
  })
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128)
  })
};
