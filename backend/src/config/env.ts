import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const required = ["JWT_SECRET"] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const resolvePathMaybe = (value: string) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value));

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const defaultUploadDir = path.resolve(process.cwd(), "uploads");

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/sims.db";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  databaseUrl,
  uploadDirPath: process.env.UPLOAD_DIR_PATH ? resolvePathMaybe(process.env.UPLOAD_DIR_PATH) : defaultUploadDir,
  uploadUrlPath: process.env.UPLOAD_URL_PATH ?? "uploads",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  frontendDistDir: process.env.FRONTEND_DIST_DIR ? resolvePathMaybe(process.env.FRONTEND_DIST_DIR) : undefined,
  migrationsDir: process.env.MIGRATIONS_DIR ? resolvePathMaybe(process.env.MIGRATIONS_DIR) : path.resolve(process.cwd(), "prisma", "migrations"),
  logDir: process.env.LOG_DIR ? resolvePathMaybe(process.env.LOG_DIR) : path.resolve(process.cwd(), "logs"),
  enableFileLogging: parseBoolean(process.env.ENABLE_FILE_LOGGING, true),
};
