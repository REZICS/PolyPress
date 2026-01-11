import {app, BrowserWindow, Menu, ipcMain} from 'electron';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {menuTemplate} from './config/menuTemplate';
import windowStateKeeper from 'electron-window-state';
import {open, readdir, stat} from 'node:fs/promises';
import * as jschardet from 'jschardet';
import * as iconv from 'iconv-lite';

const __dirname = dirname(fileURLToPath(import.meta.url));

import 'dotenv/config';

let mainWindow: BrowserWindow | null = null;

type WorkspaceTreeNode = {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'dir';
  children?: WorkspaceTreeNode[];
};

function isPathInside(parentDir: string, candidatePath: string): boolean {
  const parent = resolve(parentDir);
  const candidate = resolve(candidatePath);
  return candidate === parent || candidate.startsWith(parent + sep);
}

async function buildWorkspaceTree(
  rootDir: string,
  options?: {maxDepth?: number; maxEntries?: number},
): Promise<WorkspaceTreeNode> {
  const maxDepth = Math.max(0, options?.maxDepth ?? 50);
  const maxEntries = Math.max(1, options?.maxEntries ?? 100_000);
  let entriesCount = 0;

  const walk = async (absPath: string, depth: number): Promise<WorkspaceTreeNode> => {
    const name = absPath === rootDir ? absPath : absPath.split(sep).pop() ?? absPath;

    const node: WorkspaceTreeNode = {
      id: absPath,
      name,
      path: absPath,
      kind: 'dir',
      children: [],
    };

    if (depth >= maxDepth) {
      return node;
    }

    let dirEntries;
    try {
      dirEntries = await readdir(absPath, {withFileTypes: true});
    } catch {
      // no permission / broken link / etc.
      return node;
    }

    // Stable ordering: dirs first then files, alpha
    dirEntries.sort((a, b) => {
      const aDir = a.isDirectory() ? 0 : 1;
      const bDir = b.isDirectory() ? 0 : 1;
      if (aDir !== bDir) return aDir - bDir;
      return a.name.localeCompare(b.name);
    });

    for (const entry of dirEntries) {
      if (entriesCount >= maxEntries) break;
      const childPath = resolve(absPath, entry.name);

      // Avoid walking outside root in case of weird names/symlinks.
      if (!isPathInside(rootDir, childPath)) continue;

      if (entry.isDirectory()) {
        entriesCount += 1;
        node.children!.push(await walk(childPath, depth + 1));
        continue;
      }

      if (entry.isFile()) {
        entriesCount += 1;
        node.children!.push({
          id: childPath,
          name: entry.name,
          path: childPath,
          kind: 'file',
        });
      }
    }

    return node;
  };

  return walk(resolve(rootDir), 0);
}

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

  // Workspace APIs (via preload -> ipcRenderer.invoke)
  ipcMain.handle('workspace:getCwd', () => process.cwd());

  ipcMain.handle(
    'workspace:listTree',
    async (_event, args: {path: string; options?: {maxDepth?: number; maxEntries?: number}}) => {
      const root = resolve(process.cwd());
      return await buildWorkspaceTree(args.path, args.options);
    },
  );

  ipcMain.handle(
    'workspace:readText',
    async (_event, args: {path: string; maxBytes?: number}) => {
      const root = resolve(process.cwd());
      const target = resolve(args.path);

      const maxBytes = Math.max(1024, args.maxBytes ?? 2 * 1024 * 1024);
      const fileStat = await stat(target);
      if (!fileStat.isFile()) {
        throw new Error('Not a file.');
      }

      const truncated = fileStat.size > maxBytes;
      const fh = await open(target, 'r');
      try {
        const bytesToRead = truncated ? maxBytes : fileStat.size;
        const buf = Buffer.allocUnsafe(bytesToRead);
        const {bytesRead} = await fh.read(buf, 0, bytesToRead, 0);
        const sliced = buf.subarray(0, bytesRead);

        const detected = jschardet.detect(sliced);
        const encoding = detected.encoding?.toLowerCase().trim() || 'utf-8';
        let text: string;
        try {
          text = iconv.decode(sliced, encoding);
        } catch {
          // Fallback if encoding is unknown/unsupported.
          text = sliced.toString('utf8');
        }
        // Strip BOM if present.
        text = text.replace(/^\uFEFF/, '');

        return {
          text,
          truncated,
          bytesRead: sliced.byteLength,
          totalBytes: fileStat.size,
        };
      } finally {
        await fh.close();
      }
    },
  );

  createWindow(mainWindowState);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(mainWindowState);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
