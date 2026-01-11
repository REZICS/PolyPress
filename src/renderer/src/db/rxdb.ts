import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
} from 'rxdb';
import {getRxStorageDexie} from 'rxdb/plugins/storage-dexie';
import {RxDBUpdatePlugin} from 'rxdb/plugins/update';
import {wrappedValidateAjvStorage} from 'rxdb/plugins/validate-ajv';
import {RxDBDevModePlugin} from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

export type PublicationDocType = {
  id: string;
  filePath: string;
  platformId: string;
  platformName: string;
  /**
   * ISO string in local device time (stored as string).
   */
  lastSubmittedAt: string;
};

export type PolyPressCollections = {
  publications: RxCollection<PublicationDocType>;
};

export type PolyPressDb = RxDatabase<PolyPressCollections>;

const publicationSchema: RxJsonSchema<PublicationDocType> = {
  title: 'publication',
  version: 0,
  description: 'Stores local publish metadata for a file on a platform.',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {type: 'string', maxLength: 1024},
    filePath: {type: 'string', maxLength: 2048},
    platformId: {
      type: 'string',
      maxLength: 1024,
    },
    platformName: {
      type: 'string',
      maxLength: 1024,
    },
    lastSubmittedAt: {type: 'string'},
  },
  required: ['id', 'filePath', 'platformId', 'platformName', 'lastSubmittedAt'],
  indexes: ['filePath', 'platformId'],
};

let pluginsAdded = false;
function ensurePlugins() {
  if (pluginsAdded) return;
  pluginsAdded = true;
  addRxPlugin(RxDBUpdatePlugin);
  addRxPlugin(RxDBDevModePlugin);
  addRxPlugin(RxDBQueryBuilderPlugin);
}

let dbPromise: Promise<PolyPressDb> | null = null;

export function getPublicationId(filePath: string, platformId: string): string {
  // Keep it readable & stable, avoid raw path delimiters.
  return `${platformId}::${encodeURIComponent(filePath)}`;
}

export function getDb(): Promise<PolyPressDb> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    ensurePlugins();

    const db = await createRxDatabase<PolyPressCollections>({
      name: 'polypress',
      storage: wrappedValidateAjvStorage({storage: getRxStorageDexie()}),
      multiInstance: false,
      ignoreDuplicate: true,
    });

    await db.addCollections({
      publications: {
        schema: publicationSchema,
      },
    });

    return db;
  })();
  return dbPromise;
}
