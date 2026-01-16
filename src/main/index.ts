import {app, BrowserWindow, Menu, ipcMain, dialog} from 'electron';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {menuTemplate} from './config/menuTemplate';
import windowStateKeeper from 'electron-window-state';
import {registerWorkspaceIpcHandlers} from './src/workspace';
import {registerPublicationIpcHandlers} from './src/publication';
import {closeAllWorkspaceDbs} from './src/db';

// Electron main is built as ESM (`package.json` has `"type": "module"`).
// Some bundled CommonJS deps (e.g. native addon loaders) still expect `__filename`.
// Define them once at module scope so they exist for inlined CJS wrappers.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import 'dotenv/config';

let mainWindow: BrowserWindow | null = null;

function createWindow(mainWindowState: windowStateKeeper.State) {
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindowState.manage(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    // mainWindow.webContents.openDevTools({mode: 'detach'});
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.polypress.app');
  }

  let mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 1000,
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  registerWorkspaceIpcHandlers({
    ipcMain,
    dialog,
    BrowserWindow,
    getMainWindow: () => mainWindow,
  });

  registerPublicationIpcHandlers({ipcMain});

  createWindow(mainWindowState);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow(mainWindowState);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeAllWorkspaceDbs();
});
