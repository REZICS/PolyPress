import type {IpcMain} from 'electron';

import {
  listPublicationsByFile,
  setPublicationRemoteUrl,
  touchPublication,
  type ListByFileArgs,
  type SetRemoteUrlArgs,
  type TouchArgs,
} from './publication.service';

export function registerPublicationApiHandlers(args: {ipcMain: IpcMain}) {
  const {ipcMain} = args;

  ipcMain.handle(
    'publication:listByFile',
    async (_event, payload: ListByFileArgs) => {
      const t0 = Date.now();
      console.log('[ipc] publication:listByFile start', payload);
      try {
        const res = await Promise.resolve(listPublicationsByFile(payload));
        console.log('[ipc] publication:listByFile ok', {ms: Date.now() - t0});
        return res;
      } catch (e) {
        console.error('[ipc] publication:listByFile error', e);
        throw e;
      }
    },
  );

  ipcMain.handle('publication:touch', async (_event, payload: TouchArgs) => {
    const t0 = Date.now();
    console.log('[ipc] publication:touch start', payload);
    try {
      const res = await Promise.resolve(touchPublication(payload));
      console.log('[ipc] publication:touch ok', {ms: Date.now() - t0});
      return res;
    } catch (e) {
      console.error('[ipc] publication:touch error', e);
      throw e;
    }
  });

  ipcMain.handle(
    'publication:setRemoteUrl',
    async (_event, payload: SetRemoteUrlArgs) => {
      const t0 = Date.now();
      console.log('[ipc] publication:setRemoteUrl start', payload);
      try {
        const res = await Promise.resolve(setPublicationRemoteUrl(payload));
        console.log('[ipc] publication:setRemoteUrl ok', {ms: Date.now() - t0});
        return res;
      } catch (e) {
        console.error('[ipc] publication:setRemoteUrl error', e);
        throw e;
      }
    },
  );
}

