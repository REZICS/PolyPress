import {contextBridge, ipcRenderer} from 'electron';
import { nativeDropEventHandler } from './workspace.handler';

export type WorkspaceTreeNode = {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'dir';
  children?: WorkspaceTreeNode[];
};

const api = {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  workspace: {
    getCwd: (): Promise<string> => ipcRenderer.invoke('workspace:getCwd'),
    selectDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke('workspace:selectDirectory'),
    nativeDropEventHandler: (): Promise<void> => nativeDropEventHandler(),
    coerceToDir: (path: string): Promise<string | null> =>
      ipcRenderer.invoke('workspace:coerceToDir', {path}),
    listTree: (
      path: string,
      options?: {
        maxDepth?: number;
        maxEntries?: number;
      },
    ): Promise<WorkspaceTreeNode> =>
      ipcRenderer.invoke('workspace:listTree', {path, ...options}),
    readText: (
      path: string,
      options?: {maxBytes?: number},
    ): Promise<{
      text: string;
      truncated: boolean;
      bytesRead: number;
      totalBytes: number;
    }> => ipcRenderer.invoke('workspace:readText', {path, ...options}),
  },
};

contextBridge.exposeInMainWorld('api', api);
