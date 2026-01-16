import React, {useCallback, useEffect, useState} from 'react';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {Button} from '@mui/material';

import {cn} from '@/lib/utils';
import {workspaceStore} from '@/store/workspaceStore';
import {useWorkspaceOpener} from '@/hook/useWorkspaceOpener';

export type DropzoneProps = {
  className?: string;
  disabled?: boolean;
  /**
   * Called once a valid directory path is resolved.
   * If not provided, it will update `workspaceStore`.
   */
  onOpenWorkspace?: (dirPath: string) => void;
  afterDropProcess?: (dirPath: string) => void;
};

export default function Dropzone({
  className,
  disabled,
  onOpenWorkspace,
  afterDropProcess,
}: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    void window.api.workspace.nativeDropEventHandler();
  }, []);

  const {error, setError, openFromPath, pickFolder} = useWorkspaceOpener({
    onOpenWorkspace,
    afterOpen: afterDropProcess,
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string[]>;
      const paths = ce.detail ?? [];
      const first = paths[0];
      if (!first) {
        setError('拖入的对象没有可用路径（请直接拖入文件夹）');
        return;
      }
      void openFromPath(first);
    };
    window.addEventListener('native-drop', handler as EventListener);
    return () =>
      window.removeEventListener('native-drop', handler as EventListener);
  }, [openFromPath]);

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDragActive
          ? 'border-primary bg-accent/30'
          : 'border-muted-foreground/25 hover:border-muted-foreground/40',
        disabled ? 'opacity-50 pointer-events-none' : null,
        className,
      )}
      onDragEnter={e => {
        if (disabled) return;
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragOver={e => {
        if (disabled) return;
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={e => {
        if (disabled) return;
        e.preventDefault();
        setIsDragActive(false);
      }}
      onDrop={e => {
        if (disabled) return;
        e.preventDefault();
        setIsDragActive(false);
        // Actual path extraction happens in preload; renderer only listens to `native-drop`.
      }}
    >
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
