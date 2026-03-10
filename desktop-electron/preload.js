const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("simsDesktop", {
  openInBrowser: () => ipcRenderer.invoke("open-in-browser"),
});
