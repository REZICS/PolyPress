import type {IpcMain} from 'electron';
import {registerPublicationApiHandlers} from './publication.api';

export function registerPublicationIpcHandlers(args: {ipcMain: IpcMain}) {
  registerPublicationApiHandlers(args);
}

