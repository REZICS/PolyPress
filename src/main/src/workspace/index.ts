import type {BrowserWindow, Dialog, IpcMain} from 'electron';
import {registerWorkspaceApiHandlers} from './workspace.api';

export function registerWorkspaceIpcHandlers(args: {
  ipcMain: IpcMain;
  dialog: Dialog;
  BrowserWindow: typeof BrowserWindow;
  getMainWindow: () => BrowserWindow | null;
}) {
  // Register short/simple handlers + ipcMain.handle(...) bindings from API
  registerWorkspaceApiHandlers(args);
}
