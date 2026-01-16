import {useCallback, useState} from 'react';
import {workspaceStore} from '@/store/workspaceStore';

export type UseWorkspaceOpenerOptions = {
  /**
   * If provided, overrides workspaceStore.openWorkspace
   */
  onOpenWorkspace?: (dirPath: string) => void;

  /**
   * Called after workspace is successfully opened
   */
  afterOpen?: (dirPath: string) => void;

  /**
   * Custom error message when path cannot be resolved to a directory
   */
  invalidPathMessage?: string;
};

export type UseWorkspaceOpenerResult = {
  /**
   * Last error message, if any
   */
  error: string | null;

  /**
   * Manually clear or override error
   */
  setError: (error: string | null) => void;

  /**
   * Open workspace from a raw path (drag/drop, recent list, etc.)
   */
  openFromPath: (rawPath: string) => Promise<void>;

  /**
   * Open workspace by showing native folder picker
   */
  pickFolder: () => Promise<void>;
};

export function useWorkspaceOpener(
  options: UseWorkspaceOpenerOptions = {},
): UseWorkspaceOpenerResult {
  const {
    onOpenWorkspace,
    afterOpen,
    invalidPathMessage = '无法识别该路径（请直接拖入文件夹，或使用“选择文件夹”按钮）',
  } = options;

  const openWorkspaceFromStore = workspaceStore(s => s.openWorkspace);
  const openWorkspace = onOpenWorkspace ?? openWorkspaceFromStore;

  const [error, setError] = useState<string | null>(null);

  const openFromPath = useCallback(
    async (rawPath: string) => {
      setError(null);

      if (!rawPath) {
        setError(invalidPathMessage);
        return;
      }

      let dir: string | null;
      try {
        dir = await window.api.workspace.coerceToDir(rawPath);
      } catch (e) {
        console.error('coerceToDir failed:', e);
        setError(invalidPathMessage);
        return;
      }

      if (!dir) {
        setError(invalidPathMessage);
        return;
      }

      try {
        openWorkspace(dir);
        afterOpen?.(dir);
      } catch (e) {
        console.error('openWorkspace failed:', e);
        setError('打开工作区时发生错误');
      }
    },
    [afterOpen, invalidPathMessage, openWorkspace],
  );

  const pickFolder = useCallback(async () => {
    setError(null);

    let selected: string | null;
    try {
      selected = await window.api.workspace.selectDirectory();
    } catch (e) {
      console.error('selectDirectory failed:', e);
      setError('无法打开文件夹选择器');
      return;
    }

    if (!selected) return;

    await openFromPath(selected);
  }, [openFromPath]);

  return {
    error,
    setError,
    openFromPath,
    pickFolder,
  };
}
