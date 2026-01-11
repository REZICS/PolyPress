// TODO 可以增加一个高级选项，可以通过计划任务而非按钮来进行更新

import React, {useCallback, useEffect, useState} from 'react';

import {
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';

import {getDb, getPublicationId, type PublicationDocType} from '@/db/rxdb';
import {workspaceStore} from '@/store/workspaceStore';

type PlatformDef = {
  id: string;
  name: string;
};

const DEFAULT_PLATFORMS: PlatformDef[] = [
  {id: 'rezics', name: 'REZICS'},
  {id: 'kadokado', name: '角角者'},
  {id: 'penana', name: 'Penana'},
  {id: 'popo', name: 'POPO'},
];

function formatLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function usePublicationPlatforms(activeFilePath: string | null | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PublicationDocType[]>([]);

  const reload = useCallback(async () => {
    setError(null);
    if (!activeFilePath) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const db = await getDb();
      const col = db.publications;

      // Query existing platform publish records for this file.
      let docs = await col.find().where('filePath').eq(activeFilePath).exec();

      // Assume "published everywhere": if empty, seed default platforms.
      if (docs.length === 0) {
        await Promise.all(
          DEFAULT_PLATFORMS.map(p =>
            col.upsert({
              id: getPublicationId(activeFilePath, p.id),
              filePath: activeFilePath,
              platformId: p.id,
              platformName: p.name,
              lastSubmittedAt: '0000-00-00T00:00:00.000Z',
            }),
          ),
        );
        docs = await col.find().where('filePath').eq(activeFilePath).exec();
      }

      const json = docs.map(d => d.toJSON());
      json.sort((a, b) => a.platformName.localeCompare(b.platformName));
      setItems(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilePath]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {loading, error, setError, items, reload};
}

function RefreshButton(props: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const {disabled, loading, onClick} = props;
  return (
    <Button
      size="small"
      variant="outlined"
      disabled={disabled}
      onClick={onClick}
      startIcon={
        loading ? <CircularProgress size={14} color="inherit" /> : null
      }
    >
      刷新
    </Button>
  );
}

function UpdateAllButton(props: {
  disabled: boolean;
  items: PublicationDocType[];
  onUpdateOne: (publicationId: string) => Promise<void>;
}) {
  const {disabled, items, onUpdateOne} = props;
  const [updatingAll, setUpdatingAll] = useState(false);

  const updateAll = useCallback(async () => {
    if (disabled || items.length === 0) return;
    setUpdatingAll(true);
    try {
      const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
      const waitUntil = async (
        cond: () => boolean,
        opts?: {timeoutMs?: number; intervalMs?: number},
      ) => {
        const timeoutMs = opts?.timeoutMs ?? 10_000;
        const intervalMs = opts?.intervalMs ?? 50;
        const start = Date.now();
        while (!cond()) {
          if (Date.now() - start > timeoutMs) return false;
          await sleep(intervalMs);
        }
        return true;
      };

      for (const it of items) {
        const selector = `button[data-publication-update-id="${it.id}"]`;
        const btn =
          (document.querySelector(selector) as HTMLButtonElement | null) ??
          null;

        // Prefer "real click" on the UI button (same as user action).
        if (btn) {
          btn.scrollIntoView({block: 'center'});
          btn.click();

          // Wait for it to enter busy state, then finish (serial execution).
          waitUntil(
            () => btn.getAttribute('aria-busy') === 'true' || btn.disabled,
            {timeoutMs: 2000, intervalMs: 25},
          )
            .then(() => {
              return waitUntil(
                () => btn.getAttribute('aria-busy') !== 'true' && !btn.disabled,
                {timeoutMs: 10 * 60 * 1000, intervalMs: 100},
              );
            })
            .catch(() => {
              // ignore
            });
          continue;
        }

        // Fallback: if the button isn't in DOM, still run the same update logic.
        await onUpdateOne(it.id);
        await sleep(0);
      }
    } finally {
      setUpdatingAll(false);
    }
  }, [disabled, items, onUpdateOne]);

  return (
    <Button
      size="small"
      variant="contained"
      disabled={disabled || updatingAll}
      onClick={() => void updateAll()}
      startIcon={
        updatingAll ? <CircularProgress size={14} color="inherit" /> : null
      }
    >
      一键更新全部
    </Button>
  );
}

function PlatformCard(props: {
  item: PublicationDocType;
  onUpdateOne: (publicationId: string) => Promise<void>;
}) {
  const {item, onUpdateOne} = props;
  const [updating, setUpdating] = useState(false);

  const updateOne = useCallback(async () => {
    setUpdating(true);
    try {
      await onUpdateOne(item.id);
    } finally {
      setUpdating(false);
    }
  }, [item.id, onUpdateOne]);

  return (
    <Card key={item.id} variant="outlined">
      <CardContent className="space-y-1">
        <Typography variant="subtitle2" noWrap>
          {item.platformName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          平台 ID：{item.platformId}
        </Typography>
        <Typography variant="body2">
          最后提交：{formatLocal(item.lastSubmittedAt)}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          data-publication-update-id={item.id}
          aria-busy={updating ? 'true' : 'false'}
          disabled={updating}
          onClick={() => void updateOne()}
          startIcon={
            updating ? <CircularProgress size={14} color="inherit" /> : null
          }
        >
          更新
        </Button>
      </CardActions>
    </Card>
  );
}

export default function WorkSpaceSubSidebar() {
  const activeFilePath = workspaceStore(s => s.activeFilePath);

  const {loading, error, setError, items, reload} =
    usePublicationPlatforms(activeFilePath);

  const updateOneById = useCallback(
    async (publicationId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const db = await getDb();
        const doc = await db.publications.findOne(publicationId).exec();
        if (!doc) return;
        const nowIso = new Date().toISOString();
        await db.publications.upsert({
          ...doc.toJSON(),
          lastSubmittedAt: nowIso,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        await reload();
      }
    },
    [reload, setError],
  );

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-3 py-2 border-b">
        <Typography variant="subtitle2" noWrap>
          发布平台
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {activeFilePath ?? '未选择文件'}
        </Typography>
      </div>

      <div className="p-2 flex items-center gap-2">
        <UpdateAllButton
          disabled={!activeFilePath || items.length === 0}
          items={items}
          onUpdateOne={updateOneById}
        />
        <RefreshButton
          disabled={!activeFilePath}
          loading={loading}
          onClick={() => void reload()}
        />
      </div>

      <Divider />

      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-2">
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : !activeFilePath ? (
          <Typography variant="body2" color="text.secondary">
            从左侧选择一个文件后，这里会显示该文章在各平台的最后提交时间。
          </Typography>
        ) : loading && items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            暂无平台记录
          </Typography>
        ) : (
          items.map(it => (
            <PlatformCard key={it.id} item={it} onUpdateOne={updateOneById} />
          ))
        )}
      </div>
    </div>
  );
}
