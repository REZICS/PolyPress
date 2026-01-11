import React, {useEffect, useMemo, useRef, useState} from 'react';

import ClearAllIcon from '@mui/icons-material/ClearAll';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {
  Button,
  ClickAwayListener,
  Divider,
  Grow,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Tooltip,
  Typography,
} from '@mui/material';

function basename(p: string): string {
  const normalized = p.replace(/\/+$/g, '').replace(/\\+$/g, '');
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

function safeParseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export type WorkSpaceMenuProps = {
  label?: string;
  startIcon?: React.ReactNode;
  recentPaths?: string[];
  maxItems?: number;
  storageKey?: string;
  onSelect?: (path: string) => void;
  onOpenFolder?: () => void;
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
  buttonClassName?: string;
};

export default function WorkSpaceMenu({
  label = '工作区',
  startIcon,
  recentPaths,
  maxItems = 20,
  storageKey = 'recentWorkspaces',
  onSelect,
  onOpenFolder,
  buttonVariant = 'text',
  buttonClassName,
}: WorkSpaceMenuProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);

  const effectivePaths = useMemo(() => {
    const fromProps =
      recentPaths?.filter(p => typeof p === 'string' && p.trim()) ?? null;
    const list = fromProps ?? paths;
    // de-dupe while keeping order
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const p of list) {
      if (seen.has(p)) continue;
      seen.add(p);
      deduped.push(p);
    }
    return deduped.slice(0, Math.max(0, maxItems));
  }, [maxItems, paths, recentPaths]);

  const reloadFromStorage = () => {
    if (recentPaths) return; // controlled externally
    const next = safeParseStringArray(localStorage.getItem(storageKey));
    setPaths(next);
  };

  const close = () => setOpen(false);
  const toggle = () => {
    setOpen(prev => !prev);
  };

  useEffect(() => {
    if (!open) return;
    reloadFromStorage();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleClear = () => {
    if (recentPaths) {
      // controlled externally; do nothing
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify([]));
    setPaths([]);
  };

  return (
    <div className="relative inline-flex">
      <Button
        ref={buttonRef}
        variant={buttonVariant}
        className={buttonClassName ?? 'truncate text-md'}
        startIcon={startIcon}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
      >
        {label}
      </Button>

      <Popper
        open={open}
        anchorEl={buttonRef.current}
        placement="bottom-start"
        disablePortal={false}
        transition
        style={{zIndex: 1500}}
      >
        {({TransitionProps}) => (
          <ClickAwayListener onClickAway={close}>
            <Grow
              {...TransitionProps}
              timeout={200}
              style={{transformOrigin: 'top left'}}
            >
              <Paper
                elevation={8}
                className="mt-2"
                sx={{minWidth: 320, maxWidth: 520}}
              >
                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Typography variant="subtitle2" noWrap>
                      最近打开
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {effectivePaths.length} 个工作目录
                    </Typography>
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenFolder ? (
                      <Tooltip title="打开目录">
                        <IconButton size="small" onClick={onOpenFolder}>
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title="清空最近列表">
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleClear}
                          disabled={effectivePaths.length === 0}
                        >
                          <ClearAllIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </div>
                </div>

                <Divider />

                <div className="max-h-80 overflow-auto">
                  {effectivePaths.length === 0 ? (
                    <div className="px-3 py-3">
                      <Typography variant="body2" color="text.secondary">
                        暂无最近工作区
                      </Typography>
                    </div>
                  ) : (
                    <List dense disablePadding>
                      {effectivePaths.map(p => (
                        <ListItemButton
                          key={p}
                          onClick={() => {
                            onSelect?.(p);
                            close();
                          }}
                        >
                          <ListItemText
                            primary={basename(p)}
                            secondary={p}
                            primaryTypographyProps={{noWrap: true}}
                            secondaryTypographyProps={{noWrap: true}}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </div>
              </Paper>
            </Grow>
          </ClickAwayListener>
        )}
      </Popper>
    </div>
  );
}
