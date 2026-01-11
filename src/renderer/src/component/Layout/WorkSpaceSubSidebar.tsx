import React, {useCallback, useEffect, useMemo, useState} from 'react';

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
  {id: 'zhihu', name: '知乎'},
  {id: 'juejin', name: '掘金'},
  {id: 'csdn', name: 'CSDN'},
  {id: 'segmentfault', name: 'SegmentFault'},
];

function formatLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

export default function WorkSpaceSubSidebar() {
  const activeFilePath = workspaceStore(s => s.activeFilePath);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PublicationDocType[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [updatingAll, setUpdatingAll] = useState(false);

  const isUpdatingAny = useMemo(
    () => updatingAll || Object.values(updatingIds).some(Boolean),
    [updatingAll, updatingIds],
  );

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
      let docs = await col
        .find()
        .where('filePath')
        .eq(activeFilePath)
        .exec();

      // Assume "published everywhere": if empty, seed default platforms.
      if (docs.length === 0) {
        const nowIso = new Date().toISOString();
        await Promise.all(
          DEFAULT_PLATFORMS.map(p =>
            col.upsert({
              id: getPublicationId(activeFilePath, p.id),
              filePath: activeFilePath,
              platformId: p.id,
              platformName: p.name,
              lastSubmittedAt: nowIso,
            }),
          ),
        );
        docs = await col
          .find()
          .where('filePath')
          .eq(activeFilePath)
          .exec();
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

  const updateOne = useCallback(
    async (id: string) => {
      if (!activeFilePath) return;
      setUpdatingIds(prev => ({...prev, [id]: true}));
      try {
        const db = await getDb();
        const doc = await db.publications.findOne(id).exec();
        if (!doc) return;
        const nowIso = new Date().toISOString();
        await db.publications.upsert({...doc.toJSON(), lastSubmittedAt: nowIso});
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setUpdatingIds(prev => ({...prev, [id]: false}));
        await reload();
      }
    },
    [activeFilePath, reload],
  );

  const updateAll = useCallback(async () => {
    if (!activeFilePath || items.length === 0) return;
    setUpdatingAll(true);
    setError(null);
    try {
      const db = await getDb();
      const nowIso = new Date().toISOString();
      await Promise.all(
        items.map(it =>
          db.publications.upsert({...it, lastSubmittedAt: nowIso}),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingAll(false);
      await reload();
    }
  }, [activeFilePath, items, reload]);

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
        <Button
          size="small"
          variant="contained"
          disabled={!activeFilePath || items.length === 0}
          onClick={() => void updateAll()}
          startIcon={
            updatingAll ? <CircularProgress size={14} color="inherit" /> : null
          }
        >
          一键更新全部
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={!activeFilePath}
          onClick={() => void reload()}
          startIcon={
            loading ? <CircularProgress size={14} color="inherit" /> : null
          }
        >
          刷新
        </Button>
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
            <Card key={it.id} variant="outlined">
              <CardContent className="space-y-1">
                <Typography variant="subtitle2" noWrap>
                  {it.platformName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  平台 ID：{it.platformId}
                </Typography>
                <Typography variant="body2">
                  最后提交：{formatLocal(it.lastSubmittedAt)}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  disabled={isUpdatingAny}
                  onClick={() => void updateOne(it.id)}
                  startIcon={
                    updatingIds[it.id] ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : null
                  }
                >
                  更新
                </Button>
              </CardActions>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

