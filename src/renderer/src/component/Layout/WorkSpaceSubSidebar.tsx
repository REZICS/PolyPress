// TODO 可以增加一个高级选项，可以通过计划任务而非按钮来进行更新

import React, {useCallback, useEffect, useRef, useState} from 'react';

import {
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';

import DialogContainer from '@/component/Common/Overlay/DialogContainer';
import {workspaceStore} from '@/store/workspaceStore';
import {useAlertStore} from '@/store/windowAlertStore';
import {fileStore} from '@/store/fileStore';

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

type PublicationItem = {
  id: string;
  filePath: string;
  platformId: string;
  platformName: string;
  lastLocalSubmittedAt: string;
  metadataJson: string;
};

function formatLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function safeParseMetadata(metadataJson: string): {remoteUrl?: string} {
  const s = String(metadataJson ?? '').trim();
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const remoteUrlRaw = (v as Record<string, unknown>)['remoteUrl'];
    const remoteUrl =
      typeof remoteUrlRaw === 'string' ? remoteUrlRaw.trim() : '';
    return remoteUrl ? {remoteUrl} : {};
  } catch {
    return {};
  }
}

function sortByDefaultPlatforms(items: PublicationItem[]): PublicationItem[] {
  const idx = new Map<string, number>();
  DEFAULT_PLATFORMS.forEach((p, i) => idx.set(p.id, i));
  return [...items].sort((a, b) => {
    const ai = idx.get(a.platformId);
    const bi = idx.get(b.platformId);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.platformId.localeCompare(b.platformId);
  });
}

function usePublicationPlatforms(
  workspaceRoot: string | null | undefined,
  activeFilePath: string | null | undefined,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PublicationItem[]>([]);
  const requestSeqRef = useRef(0);
  const reload = useCallback(async () => {
    setError(null);
    const root = String(workspaceRoot ?? '').trim();
    if (!root || !activeFilePath) {
      setItems([]);
      setLoading(false);
      return;
    }

    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
          const t = window.setTimeout(() => {
            reject(new Error(`IPC timeout after ${ms}ms (publication:listByFile)`));
          }, ms);
          p.then(
            v => {
              window.clearTimeout(t);
              resolve(v);
            },
            err => {
              window.clearTimeout(t);
              reject(err);
            },
          );
        });
      };

      const rows = await withTimeout(
        window.api.publication.listByFile({
          workspaceRoot: root,
          filePath: activeFilePath,
        }),
        10_000,
      );
      // Ignore stale responses (activeFilePath/workspaceRoot changed rapidly).
      if (seq !== requestSeqRef.current) return;
      setItems(sortByDefaultPlatforms(rows));
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [activeFilePath, workspaceRoot]);

  useEffect(() => {
    // Debounce to avoid flooding IPC while active file is changing rapidly.
    const t = window.setTimeout(() => {
      void reload();
    }, 200);
    return () => window.clearTimeout(t);
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
  items: PublicationItem[];
  onUpdateOne: (publicationId: string) => Promise<void>;
}) {
  const {disabled, items, onUpdateOne} = props;
  const [updatingAll, setUpdatingAll] = useState(false);

  const updateAll = useCallback(async () => {
    if (disabled || items.length === 0) return;
    setUpdatingAll(true);
    try {
      const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

      for (const it of items) {
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

function UrlEditDialog(props: {
  open: boolean;
  title: string;
  initialUrl: string;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}) {
  const {open, title, initialUrl, onClose, onSave} = props;
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
  }, [initialUrl, open]);

  const save = useCallback(async () => {
    const next = String(url ?? '').trim();
    if (!next) {
      useAlertStore.getState().show('请输入 URL');
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [onClose, onSave, url]);

  return (
    <DialogContainer open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-3">
        <TextField
          label="远端 URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          fullWidth
          size="small"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="text" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={saving}
          >
            保存
          </Button>
        </div>
      </div>
    </DialogContainer>
  );
}

function PlatformCard(props: {
  item: PublicationItem;
  remoteUrl?: string;
  onUpdateOne: (publicationId: string) => Promise<void>;
  onSetRemoteUrl: (publicationId: string, remoteUrl: string) => Promise<void>;
}) {
  const {item, remoteUrl, onUpdateOne, onSetRemoteUrl} = props;
  const [updating, setUpdating] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);

  const updateOne = useCallback(async () => {
    if (!remoteUrl) {
      setEditingUrl(true);
      return;
    }
    setUpdating(true);
    try {
      await onUpdateOne(item.id);
    } finally {
      setUpdating(false);
    }
  }, [item.id, onUpdateOne, remoteUrl]);

  return (
    <Card key={item.id} variant="outlined">
      <CardContent className="space-y-1">
        <Typography variant="subtitle2" noWrap>
          {item.platformName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          平台 ID：{item.platformId}
        </Typography>
        {!remoteUrl ? (
          <Typography variant="body2" color="text.secondary">
            未配置远端 URL
          </Typography>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" noWrap>
              URL：{remoteUrl}
            </Typography>
            <Typography variant="body2">
              最后推送：{formatLocal(item.lastLocalSubmittedAt)}
            </Typography>
          </>
        )}
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
          {remoteUrl ? '更新' : '添加 URL'}
        </Button>
        {remoteUrl ? (
          <Button size="small" onClick={() => setEditingUrl(true)}>
            编辑 URL
          </Button>
        ) : null}
      </CardActions>

      <UrlEditDialog
        open={editingUrl}
        title={`${item.platformName} - 远端 URL`}
        initialUrl={remoteUrl ?? ''}
        onClose={() => setEditingUrl(false)}
        onSave={url => onSetRemoteUrl(item.id, url)}
      />
    </Card>
  );
}

export default function WorkSpaceSubSidebar() {
  const workspaceRoot = workspaceStore(s => s.rootPath);
  const activeFilePath = workspaceStore(s => s.activeFilePath);

  const {loading, error, setError, items, reload} =
    usePublicationPlatforms(workspaceRoot, activeFilePath);

  const updateOneById = useCallback(
    async (publicationId: string) => {
      try {
        const root = String(workspaceRoot ?? '').trim();
        if (!root) throw new Error('workspaceRoot is required.');
        await window.api.publication.touch({workspaceRoot: root, publicationId, contentPath: activeFilePath ?? ''});
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        await reload();
      }
    },
    [reload, setError, workspaceRoot],
  );

  const setRemoteUrl = useCallback(
    async (publicationId: string, remoteUrl: string) => {
      const root = String(workspaceRoot ?? '').trim();
      if (!root) throw new Error('workspaceRoot is required.');
      await window.api.publication.setRemoteUrl({
        workspaceRoot: root,
        publicationId,
        remoteUrl,
      });
      useAlertStore.getState().show('已保存 URL');
      await reload();
    },
    [reload, workspaceRoot],
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
          disabled={!workspaceRoot || !activeFilePath || items.length === 0}
          items={items.filter(it => !!safeParseMetadata(it.metadataJson).remoteUrl)}
          onUpdateOne={updateOneById}
        />
        <RefreshButton
          disabled={!workspaceRoot || !activeFilePath}
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
        ) : !workspaceRoot ? (
          <Typography variant="body2" color="text.secondary">
            请先打开一个工作区
          </Typography>
        ) : !activeFilePath ? (
          <Typography variant="body2" color="text.secondary">
            从左侧选择一个文件后，这里会显示该文章在各平台的配置与推送信息。
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
          items.map(it => {
            const {remoteUrl} = safeParseMetadata(it.metadataJson);
            return (
              <PlatformCard
                key={it.id}
                item={it}
                remoteUrl={remoteUrl}
                onUpdateOne={updateOneById}
                onSetRemoteUrl={setRemoteUrl}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
