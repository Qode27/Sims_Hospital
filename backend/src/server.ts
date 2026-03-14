import { app } from "./app.js";
import { initializeRuntime } from "./bootstrap/startup.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { logError, logInfo } from "./utils/logger.js";

const boot = async () => {
  await initializeRuntime();

  const server = app.listen(env.port, () => {
    logInfo("server.started", { port: env.port, nodeEnv: env.nodeEnv });
  });

  const shutdown = async () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

boot().catch((error) => {
  logError("server.startup_failed", {
    message: error instanceof Error ? error.message : "Unknown startup error",
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
