import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { validationMiddleware } from "../middlewares/validation.middleware";
import { registerSchema } from "../modules/auth/auth.validation";

describe("Auth routes", () => {
  it(
    "POST /register validates payload",
    async () => {
    const app = express();
    app.use(express.json());
    app.post("/auth/register", validationMiddleware(registerSchema), (_req, res) => {
      res.status(201).json({ success: true });
    });

    const res = await request(app).post("/auth/register").send({ email: "demo@x.com" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    },
    20_000
  );
});
