import type {IpcMainInvokeEvent} from 'electron';
import {open, readdir, stat} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import * as jschardet from 'jschardet';
import * as iconv from 'iconv-lite';

import type {WorkspaceApiArgs} from './workspace.api';

export type WorkspaceTreeNode = {
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
  let yieldCounter = 0;

  const yieldToEventLoop = async () => {
    // Avoid starving other ipcMain handlers (main process is single-threaded).
    await new Promise<void>(resolve => setImmediate(resolve));
  };

  const walk = async (
    absPath: string,
    depth: number,
  ): Promise<WorkspaceTreeNode> => {
    const name =
      absPath === rootDir ? rootDir : absPath.split(sep).pop() ?? absPath;

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
        yieldCounter += 1;
        if (yieldCounter % 200 === 0) {
          await yieldToEventLoop();
        }
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
        yieldCounter += 1;
        if (yieldCounter % 200 === 0) {
          await yieldToEventLoop();
        }
      }
    }

    return node;
  };

  return walk(resolve(rootDir), 0);
}

export async function selectDirectory(ipcArgs: WorkspaceApiArgs) {
  const {dialog, BrowserWindow, getMainWindow} = ipcArgs;
  const win = BrowserWindow.getFocusedWindow() ?? getMainWindow() ?? undefined;
  const res = await dialog.showOpenDialog(win as any, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled) return null;
  return res.filePaths[0] ?? null;
}

export async function coerceToDir(_event, args: {path: string}) {
  const raw = String(args?.path ?? '').trim();
  if (!raw) return null;
  const target = resolve(raw);
  try {
    const s = await stat(target);
    if (s.isDirectory()) return target;
    if (s.isFile()) return dirname(target);
    return null;
  } catch {
    return null;
  }
}

export async function workspaceListTreeHandler(
  _event: IpcMainInvokeEvent,
  args: {path: string; options?: {maxDepth?: number; maxEntries?: number}},
) {
  const t0 = Date.now();
  console.log('[ipc] workspace:listTree start', args);
  try {
    const res = await buildWorkspaceTree(args.path, args.options);
    console.log('[ipc] workspace:listTree ok', {ms: Date.now() - t0});
    return res;
  } catch (e) {
    console.error('[ipc] workspace:listTree error', e);
    throw e;
  }
}

export async function workspaceReadTextHandler(
  _event: IpcMainInvokeEvent,
  args: {path: string; maxBytes?: number},
) {
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
}
