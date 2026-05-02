import cors from "cors";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import { API_PREFIX } from "./config/constants";
import { env } from "./config/env";
import { passport } from "./config/passport";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { globalRateLimitMiddleware } from "./middlewares/rate-limit.middleware";
import { redirectRouter } from "./modules/redirect/redirect.routes";
import { apiRouter } from "./routes/api.routes";

export const app = express();
app.set("trust proxy", 1);

const allowedOrigins = [
  env.CLIENT_ORIGIN,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000"
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(helmet());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production"
    }
  })
);
app.use(passport.initialize());
app.use(requestIdMiddleware);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(globalRateLimitMiddleware);

app.use(API_PREFIX, apiRouter);
app.use("/r", redirectRouter);
app.use("/", redirectRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
