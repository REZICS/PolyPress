import React, {useCallback, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {Button} from '@mui/material';

import {cn} from '@/lib/utils';
import {workspaceStore} from '@/store/workspaceStore';

type DroppedFile = File & {path?: string};

export type DropzoneProps = {
  className?: string;
  disabled?: boolean;
  /**
   * Called once a valid directory path is resolved.
   * If not provided, it will update `workspaceStore`.
   */
  onOpenWorkspace?: (dirPath: string) => void;
};

export default function Dropzone({
  className,
  disabled,
  onOpenWorkspace,
}: DropzoneProps) {
  const openWorkspaceFromStore = workspaceStore(s => s.openWorkspace);
  const openWorkspace = onOpenWorkspace ?? openWorkspaceFromStore;

  const [error, setError] = useState<string | null>(null);

  const handlePath = useCallback(
    async (rawPath: string) => {
      setError(null);
      const dir = await window.api.workspace.coerceToDir(rawPath);
      if (!dir) {
        setError('无法识别该路径（请直接拖入文件夹，或使用“选择文件夹”按钮）');
        return;
      }
      openWorkspace(dir);
    },
    [openWorkspace],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const first = acceptedFiles[0] as DroppedFile | undefined;
      const p = first?.path;
      if (!p) {
        setError('拖入的对象没有可用路径（请直接拖入文件夹）');
        return;
      }
      await handlePath(p);
    },
    [handlePath],
  );

  const pickFolder = useCallback(async () => {
    setError(null);
    const selected = await window.api.workspace.selectDirectory();
    if (!selected) return;
    openWorkspace(selected);
  }, [openWorkspace]);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    // Electron drop gives us `event.dataTransfer.files` with absolute `.path`.
    getFilesFromEvent: async (event: any) => {
      if (event?.dataTransfer?.files) {
        return Array.from(event.dataTransfer.files);
      }
      return [];
    },
  });

  return (
    <div
      {...getRootProps({
        className: cn(
          'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragActive
            ? 'border-primary bg-accent/30'
            : 'border-muted-foreground/25 hover:border-muted-foreground/40',
          disabled ? 'opacity-50 pointer-events-none' : null,
          className,
        ),
      })}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-2">
        <FolderOpenIcon fontSize="large" />
        <div className="text-sm">
          {isDragActive
            ? '松开以打开该文件夹为工作区'
            : '拖入文件夹，或点击按钮选择文件夹以打开工作区'}
        </div>

        <Button
          variant="outlined"
          size="small"
          onClick={e => {
            e.stopPropagation();
            void pickFolder();
          }}
        >
          选择文件夹
        </Button>

        {error ? <div className="text-xs text-red-500">{error}</div> : null}
      </div>
    </div>
  );
}

