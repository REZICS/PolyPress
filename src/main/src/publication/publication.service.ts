import {eq} from 'drizzle-orm';
import {BrowserWindow} from 'electron';

import {getWorkspaceDb, publications, type PublicationRow} from '../db';
import {openPublicationUpdateWindow} from './publication.updateWindow';

import {workspaceReadTextHandler} from '../workspace/workspace.service';

export type PlatformDef = {
  id: string;
  name: string;
};

export const DEFAULT_PLATFORMS: PlatformDef[] = [
  {id: 'rezics', name: 'REZICS'},
  {id: 'kadokado', name: '角角者'},
  {id: 'penana', name: 'Penana'},
  {id: 'popo', name: 'POPO'},
];

export function getPublicationId(filePath: string, platformId: string): string {
  return `${platformId}::${encodeURIComponent(filePath)}`;
}

export type ListByFileArgs = {
  workspaceRoot: string;
  filePath: string;
};

export type TouchArgs = {
  workspaceRoot: string;
  publicationId: string;
  contentPath: string;
};

export type SetRemoteUrlArgs = {
  workspaceRoot: string;
  publicationId: string;
  remoteUrl: string;
};

function sortStable(items: PublicationRow[]): PublicationRow[] {
  return [...items].sort((a, b) => {
    const n = a.platformName.localeCompare(b.platformName);
    if (n !== 0) return n;
    return a.platformId.localeCompare(b.platformId);
  });
}

export function listPublicationsByFile(args: ListByFileArgs): PublicationRow[] {
  const workspaceRoot = String(args.workspaceRoot ?? '').trim();
  const filePath = String(args.filePath ?? '').trim();
  if (!workspaceRoot) throw new Error('workspaceRoot is required.');
  if (!filePath) return [];

  const {db} = getWorkspaceDb(workspaceRoot);

  // console.log('listPublicationsByFile', {workspaceRoot, filePath});

  let items = db
    .select()
    .from(publications)
    .where(eq(publications.filePath, filePath))
    .all();

  // console.log('listPublicationsByFile items', items);

  // If empty, seed default platforms for this file.
  if (items.length === 0) {
    const seed = DEFAULT_PLATFORMS.map(p => ({
      id: getPublicationId(filePath, p.id),
      filePath,
      platformId: p.id,
      platformName: p.name,
      remoteUrl: '',
      lastLocalSubmittedAt: '0000-00-00T00:00:00.000Z',
      metadataJson: '{}',
    }));

    db.insert(publications).values(seed).onConflictDoNothing().run();

    items = db
      .select()
      .from(publications)
      .where(eq(publications.filePath, filePath))
      .all();
  }

  return sortStable(items);
}

export async function touchPublication(args: TouchArgs): Promise<PublicationRow | null> {
  const workspaceRoot = String(args.workspaceRoot ?? '').trim();
  const publicationId = String(args.publicationId ?? '').trim();
  const contentPath = String(args.contentPath ?? '').trim();
  if (!workspaceRoot) throw new Error('workspaceRoot is required.');
  if (!publicationId) throw new Error('publicationId is required.');
  if (!contentPath) throw new Error('contentPath is required.');

  const {db} = getWorkspaceDb(workspaceRoot);
  const nowIso = new Date().toISOString();

  db.update(publications)
    .set({lastLocalSubmittedAt: nowIso})
    .where(eq(publications.id, publicationId))
    .run();

  const row =
    db
      .select()
      .from(publications)
      .where(eq(publications.id, publicationId))
      .get() ?? null;

  console.log('touchPublication row', row);

  const {text} = await workspaceReadTextHandler(null as any, {path: contentPath});

  // Real "update" entry point: open the dedicated updater window.
  // Keep the DB return value stable; run UI side-effects independently.
  const metadata = safeParseJsonObject(row?.metadataJson ?? '{}');
  try {
    openPublicationUpdateWindow({
      mainWindow: BrowserWindow.getFocusedWindow(),
      url: metadata?.remoteUrl as string || 'about:blank',
      title: `Update: ${row?.platformName ?? ''}`.trim() || 'Update',
      contentText: text,
    });
  } catch (e) {
    console.error('[publication] open update window failed', e);
  }

  return row;
}

function safeParseJsonObject(value: string): Record<string, unknown> {
  const s = String(value ?? '').trim();
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return {};
  } catch {
    return {};
  }
}

export function setPublicationRemoteUrl(
  args: SetRemoteUrlArgs,
): PublicationRow | null {
  const workspaceRoot = String(args.workspaceRoot ?? '').trim();
  const publicationId = String(args.publicationId ?? '').trim();
  const remoteUrl = String(args.remoteUrl ?? '').trim();
  if (!workspaceRoot) throw new Error('workspaceRoot is required.');
  if (!publicationId) throw new Error('publicationId is required.');
  if (!remoteUrl) throw new Error('remoteUrl is required.');

  const {db} = getWorkspaceDb(workspaceRoot);

  const existing =
    db
      .select()
      .from(publications)
      .where(eq(publications.id, publicationId))
      .get() ?? null;
  if (!existing) return null;

  const metadata = safeParseJsonObject(existing.metadataJson);
  metadata['remoteUrl'] = remoteUrl;

  db.update(publications)
    .set({metadataJson: JSON.stringify(metadata)})
    .where(eq(publications.id, publicationId))
    .run();

  const row =
    db
      .select()
      .from(publications)
      .where(eq(publications.id, publicationId))
      .get() ?? null;
  return row;
}

