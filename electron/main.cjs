/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { createDentoraDatabase } = require("./database.cjs");

const DATA_DIR_NAME = "data";
const DB_FILE_NAME = "dentora.db";
const LEGACY_DB_FILE_NAME = "dentora-db.json";
let dentoraDatabase;

function getDataPath(fileName) {
  const dir = path.join(app.getPath("userData"), DATA_DIR_NAME);
  return path.join(dir, fileName);
}

function registerDatabaseHandlers(database) {
  ipcMain.handle("db:collection:exists", (_event, name) =>
    database.collectionExists(name),
  );
  ipcMain.handle("db:collection:read", (_event, name) =>
    database.readCollection(name),
  );
  ipcMain.handle("db:collection:replace", (_event, name, records) =>
    database.replaceCollection(name, records),
  );
  ipcMain.handle("db:record:upsert", (_event, name, id, record) =>
    database.upsertRecord(name, id, record),
  );
  ipcMain.handle("db:record:delete", (_event, name, id) =>
    database.deleteRecord(name, id),
  );
  ipcMain.handle("db:document:read", (_event, key) =>
    database.readDocument(key),
  );
  ipcMain.handle("db:document:write", (_event, key, value) =>
    database.writeDocument(key, value),
  );
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = path.join(__dirname, "..", "out", "index.html");

  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      "Build files not found",
      "Could not find the Next.js export output. Run 'npm run build:web' first.",
    );
    app.quit();
    return;
  }

  mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
  try {
    dentoraDatabase = createDentoraDatabase({
      databasePath: getDataPath(DB_FILE_NAME),
      legacyJsonPath: getDataPath(LEGACY_DB_FILE_NAME),
    });
    registerDatabaseHandlers(dentoraDatabase);
  } catch (error) {
    console.error("Failed to initialize SQLite database:", error);
    dialog.showErrorBox(
      "Database initialization failed",
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
    return;
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("before-quit", () => {
    dentoraDatabase?.close();
    dentoraDatabase = undefined;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
