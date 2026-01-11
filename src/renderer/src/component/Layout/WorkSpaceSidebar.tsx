import React, {useEffect, useMemo, useState} from 'react';

import {CircularProgress, Typography} from '@mui/material';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';

import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import Dropzone from '@/component/Common/File/Dropzone';
import {workspaceStore} from '@/store/workspaceStore';

type WorkSpaceSidebarProps = {
  selectedPath?: string | null;
  onSelectFile?: (path: string) => void;
};

function basename(p: string): string {
  const normalized = p.replace(/\/+$/g, '').replace(/\\+$/g, '');
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

function collectFileIds(node: WorkspaceTreeNode | null, out: Set<string>) {
  if (!node) return;
  if (node.kind === 'file') {
    out.add(node.id);
    return;
  }
  for (const child of node.children ?? []) {
    collectFileIds(child, out);
  }
}

export default function WorkSpaceSidebar({
  selectedPath,
  onSelectFile,
}: WorkSpaceSidebarProps) {
  const rootPath = workspaceStore(s => s.rootPath);
  const [cwd, setCwd] = useState<string | null>(null);
  const [tree, setTree] = useState<WorkspaceTreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setError(null);
      setTree(null);
      try {
        const nextCwd = await window.api.workspace.getCwd();
        if (!rootPath) {
          if (cancelled) return;
          setCwd(nextCwd);
          return;
        }

        const nextTree = await window.api.workspace.listTree(rootPath, {
          maxDepth: 50,
          maxEntries: 100000,
        });
        if (cancelled) return;
        setCwd(nextCwd);
        setTree(nextTree);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const fileIds = useMemo(() => {
    const out = new Set<string>();
    collectFileIds(tree, out);
    return out;
  }, [tree]);

  const renderNode = (node: WorkspaceTreeNode) => {
    const isDir = node.kind === 'dir';
    const label = isDir ? basename(node.name) : node.name;
    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={label}
        slots={{
          icon: isDir ? FolderIcon : InsertDriveFileIcon,
        }}
      >
        {isDir ? (node.children ?? []).map(renderNode) : null}
      </TreeItem>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-3 py-2 border-b">
        <Typography variant="subtitle2" noWrap>
          WorkSpace
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {rootPath ?? cwd ?? '...'}
        </Typography>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-2">
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : !rootPath ? (
          <Dropzone className="mt-2" />
        ) : !tree ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircularProgress size={16} />
            <span>Loading workspace tree...</span>
          </div>
        ) : (
          <SimpleTreeView
            defaultExpandedItems={[tree.id]}
            selectedItems={selectedPath ?? null}
            onItemClick={(_event, itemId) => {
              if (fileIds.has(String(itemId))) {
                onSelectFile?.(String(itemId));
              }
            }}
            sx={{
              '& .MuiTreeItem-label': {fontSize: 13},
            }}
          >
            {renderNode(tree)}
          </SimpleTreeView>
        )}
      </div>
    </div>
  );
}

