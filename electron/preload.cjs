// Preload exposes narrow SQLite operations without renderer filesystem access.
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dentoraDb", {
  collectionExists: (name) =>
    ipcRenderer.invoke("db:collection:exists", name),
  readCollection: (name) => ipcRenderer.invoke("db:collection:read", name),
  replaceCollection: (name, records) =>
    ipcRenderer.invoke("db:collection:replace", name, records),
  upsertRecord: (name, id, record) =>
    ipcRenderer.invoke("db:record:upsert", name, id, record),
  deleteRecord: (name, id) =>
    ipcRenderer.invoke("db:record:delete", name, id),
  readDocument: (key) => ipcRenderer.invoke("db:document:read", key),
  writeDocument: (key, value) =>
    ipcRenderer.invoke("db:document:write", key, value),
});
