import { app } from "./app.js";
import { initializeRuntime } from "./bootstrap/startup.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

const boot = async () => {
  await initializeRuntime();

  const server = app.listen(env.port, () => {
    console.log(`SIMS Hospital backend running on http://127.0.0.1:${env.port}`);
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
  console.error("Backend startup failed", error);
  process.exit(1);
});
