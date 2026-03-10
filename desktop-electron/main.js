const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");

const PRODUCT_NAME = "SIMS Hospital";
const DEFAULT_PORT = 43110;

let mainWindow = null;
let backendProcess = null;
let backendUrl = null;
let isQuitting = false;
let runtimePaths = null;

const timestamp = () => new Date().toISOString();

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const resolveRuntimePaths = () => {
  const appDataRoot = path.join(app.getPath("appData"), PRODUCT_NAME);
  const dataDir = path.join(appDataRoot, "data");
  const uploadsDir = path.join(appDataRoot, "uploads");
  const logsDir = path.join(appDataRoot, "logs");

  const backendRoot = app.isPackaged
    ? path.join(process.resourcesPath, "backend")
    : path.resolve(__dirname, "..", "backend");

  const backendEntryCandidates = [
    path.join(backendRoot, "dist", "src", "server.js"),
    path.join(backendRoot, "dist", "server.js"),
  ];
  const backendEntry = backendEntryCandidates.find((candidate) => fs.existsSync(candidate))
    ?? backendEntryCandidates[0];

  const frontendDistDir = app.isPackaged
    ? path.join(process.resourcesPath, "frontend", "dist")
    : path.resolve(__dirname, "..", "frontend", "dist");

  const migrationsDir = path.join(backendRoot, "prisma", "migrations");

  return {
    appDataRoot,
    dataDir,
    uploadsDir,
    logsDir,
    backendRoot,
    backendEntry,
    frontendDistDir,
    migrationsDir,
    runtimeConfigFile: path.join(appDataRoot, "runtime-config.json"),
    logFile: path.join(logsDir, "electron.log"),
  };
};

const log = (message) => {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  if (!runtimePaths) {
    return;
  }
  ensureDir(runtimePaths.logsDir);
  fs.appendFileSync(runtimePaths.logFile, `${line}\n`);
};

const toPrismaSqliteUrl = (dbPath) => `file:${dbPath.replace(/\\/g, "/")}`;

const loadOrCreateJwtSecret = () => {
  if (fs.existsSync(runtimePaths.runtimeConfigFile)) {
    try {
      const raw = fs.readFileSync(runtimePaths.runtimeConfigFile, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.jwtSecret === "string" && parsed.jwtSecret.length >= 32) {
        return parsed.jwtSecret;
      }
    } catch (error) {
      log(`Failed to read runtime config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const jwtSecret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(runtimePaths.runtimeConfigFile, JSON.stringify({ jwtSecret }, null, 2), "utf-8");
  return jwtSecret;
};

const checkPortAvailable = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });

const findFreePort = async (startPort) => {
  for (let port = startPort; port < startPort + 1000; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await checkPortAvailable(port);
    if (free) {
      return port;
    }
  }
  throw new Error("No free port available for SIMS Hospital backend.");
};

const waitForBackendReady = async (port, timeoutMs = 40000) => {
  const startedAt = Date.now();

  const ping = () =>
    new Promise((resolve) => {
      const req = http.get(
        {
          host: "127.0.0.1",
          port,
          path: "/api/health",
          timeout: 2000,
        },
        (res) => {
          resolve(res.statusCode === 200);
          res.resume();
        },
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });

  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const healthy = await ping();
    if (healthy) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new Error("Backend did not become healthy in time.");
};

const stopBackend = () => {
  if (backendProcess && !backendProcess.killed) {
    log("Stopping backend process.");
    backendProcess.kill();
  }
  backendProcess = null;
};

const startBackend = async () => {
  const port = await findFreePort(DEFAULT_PORT);
  backendUrl = `http://127.0.0.1:${port}`;

  if (!fs.existsSync(runtimePaths.backendEntry)) {
    throw new Error(`Backend entry not found: ${runtimePaths.backendEntry}`);
  }

  if (!fs.existsSync(runtimePaths.frontendDistDir)) {
    throw new Error(`Frontend build not found: ${runtimePaths.frontendDistDir}`);
  }

  const dbPath = path.join(runtimePaths.dataDir, "sims.db");

  const backendEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: String(port),
    JWT_SECRET: process.env.JWT_SECRET || loadOrCreateJwtSecret(),
    JWT_EXPIRES_IN: "8h",
    DATABASE_URL: toPrismaSqliteUrl(dbPath),
    UPLOAD_DIR_PATH: runtimePaths.uploadsDir,
    UPLOAD_URL_PATH: "uploads",
    CORS_ORIGIN: "*",
    FRONTEND_DIST_DIR: runtimePaths.frontendDistDir,
    MIGRATIONS_DIR: runtimePaths.migrationsDir,
    LOG_DIR: runtimePaths.logsDir,
    ENABLE_FILE_LOGGING: "true",
  };

  log(`Starting backend on ${backendUrl}`);
  backendProcess = spawn(process.execPath, [runtimePaths.backendEntry], {
    cwd: runtimePaths.backendRoot,
    env: backendEnv,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout?.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) {
      log(`[backend] ${text}`);
    }
  });

  backendProcess.stderr?.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) {
      log(`[backend:err] ${text}`);
    }
  });

  backendProcess.on("exit", (code, signal) => {
    log(`Backend exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    backendProcess = null;

    if (!isQuitting) {
      dialog.showErrorBox(
        "SIMS Hospital",
        "Backend process stopped unexpectedly. Please relaunch the application.",
      );
    }
  });

  await waitForBackendReady(port);
  log("Backend health check passed.");
};

const buildMenu = () => {
  const template = [
    {
      label: "SIMS Hospital",
      submenu: [
        {
          label: "Open in Browser",
          click: () => {
            if (backendUrl) {
              shell.openExternal(backendUrl);
            }
          },
        },
        { type: "separator" },
        { role: "quit", label: "Exit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", label: "Reload" },
        { role: "forceReload", label: "Force Reload" },
        { role: "toggleDevTools", label: "Toggle Developer Tools" },
        { type: "separator" },
        { role: "resetZoom", label: "Reset Zoom" },
        { role: "zoomIn", label: "Zoom In" },
        { role: "zoomOut", label: "Zoom Out" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    title: PRODUCT_NAME,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(backendUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const lockAcquired = app.requestSingleInstanceLock();
if (!lockAcquired) {
  app.quit();
}

app.on("second-instance", () => {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
});

ipcMain.handle("open-in-browser", async () => {
  if (backendUrl) {
    await shell.openExternal(backendUrl);
  }
});

app.whenReady().then(async () => {
  app.setName(PRODUCT_NAME);

  runtimePaths = resolveRuntimePaths();
  ensureDir(runtimePaths.appDataRoot);
  ensureDir(runtimePaths.dataDir);
  ensureDir(runtimePaths.uploadsDir);
  ensureDir(runtimePaths.logsDir);

  try {
    await startBackend();
    await createMainWindow();
    buildMenu();

    // Requirement: auto-open in default browser as well.
    await shell.openExternal(backendUrl);
  } catch (error) {
    log(`Startup failed: ${error instanceof Error ? error.message : String(error)}`);
    dialog.showErrorBox(
      "SIMS Hospital startup error",
      error instanceof Error ? error.message : "Unknown startup error",
    );
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendUrl) {
    await createMainWindow();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
