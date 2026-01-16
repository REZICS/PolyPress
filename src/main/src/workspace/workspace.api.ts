import type {BrowserWindow, Dialog, IpcMain} from 'electron';
import {dirname, resolve} from 'node:path';
import {stat} from 'node:fs/promises';
import {
  selectDirectory,
  coerceToDir,
  workspaceListTreeHandler,
  workspaceReadTextHandler,
} from './workspace.service';

export type WorkspaceTreeNode = {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'dir';
  children?: WorkspaceTreeNode[];
};

export type WorkspaceApiArgs = {
  ipcMain: IpcMain;
  dialog: Dialog;
  BrowserWindow: typeof BrowserWindow;
  getMainWindow: () => BrowserWindow | null;
};

export function registerWorkspaceApiHandlers(args: WorkspaceApiArgs) {
  const {ipcMain} = args;

  // Workspace APIs (via preload -> ipcRenderer.invoke)
  ipcMain.handle('workspace:getCwd', () => process.cwd());

  ipcMain.handle(
    'workspace:selectDirectory',
    async (_event) => {
      return selectDirectory(args);
    }
  );

  ipcMain.handle('workspace:coerceToDir', coerceToDir);

  // Heavy handlers: register here, implementation lives in service.
  ipcMain.handle('workspace:listTree', workspaceListTreeHandler);
  ipcMain.handle('workspace:readText', workspaceReadTextHandler);
}
