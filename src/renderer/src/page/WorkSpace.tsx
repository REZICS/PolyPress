import React, {useEffect, useMemo, useState} from 'react';

import {CircularProgress, Divider, Pagination, Typography} from '@mui/material';

import MainLayout from '@/layout/MainLayout';
import WorkSpaceSidebar from '@/component/Layout/WorkSpaceSidebar';
import WorkSpaceSubSidebar from '@/component/Layout/WorkSpaceSubSidebar';
import Dropzone from '@/component/Common/File/Dropzone';
import {workspaceStore} from '@/store/workspaceStore';

export default function WorkSpace() {
  const workspaceRoot = workspaceStore(s => s.rootPath);
  const setActiveFilePath = workspaceStore(s => s.setActiveFilePath);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState<string>('');
  const [truncated, setTruncated] = useState(false);
  const [bytesInfo, setBytesInfo] = useState<{bytesRead: number; totalBytes: number} | null>(null);

  const [page, setPage] = useState(1);
  const linesPerPage = 200;

  useEffect(() => {
    // When workspace root changes, clear file selection to avoid stale paths.
    setSelectedPath(null);
    setActiveFilePath(null);
  }, [workspaceRoot]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setError(null);
      setBytesInfo(null);
      setTruncated(false);
      setText('');
      setPage(1);

      if (!selectedPath) return;

      setLoading(true);
      try {
        const res = await window.api.workspace.readText(selectedPath, {
          maxBytes: 4 * 1024 * 1024,
        });
        if (cancelled) return;
        setText(res.text ?? '');
        setTruncated(Boolean(res.truncated));
        setBytesInfo({bytesRead: res.bytesRead, totalBytes: res.totalBytes});
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const lines = useMemo(() => {
    if (!text) return [];
    return text.split(/\r?\n/);
  }, [text]);

  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  const pageText = useMemo(() => {
    if (!lines.length) return '';
    const start = (page - 1) * linesPerPage;
    const end = start + linesPerPage;
    return lines.slice(start, end).join('\n');
  }, [lines, page]);

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  return (
    <MainLayout
      SidebarContentProps={
        <WorkSpaceSidebar
          selectedPath={selectedPath}
          onSelectFile={path => {
            setSelectedPath(path);
            setActiveFilePath(path);
          }}
        />
      }
      subSidebarContentProps={<WorkSpaceSubSidebar />}
    >
      <div className="space-y-3">
        <div>
          <Typography variant="h6">WorkSpace</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {selectedPath ??
              (workspaceRoot
                ? '从左侧选择一个文件来预览文本内容'
                : '请先选择/拖入一个工作区文件夹')}
          </Typography>
        </div>

        <Divider />

        {!workspaceRoot ? <Dropzone /> : null}

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircularProgress size={16} />
            <span>Loading file...</span>
          </div>
        ) : !selectedPath ? (
          <div className="text-sm text-muted-foreground">
            这里是主要内容显示区域：会显示任意文本内容；当文本很长时会自动分页。
          </div>
        ) : (
          <div className="space-y-2">
            {truncated || bytesInfo ? (
              <Typography variant="caption" color="text.secondary">
                {truncated ? '内容过大，已截断预览。' : null}
                {bytesInfo
                  ? `（${bytesInfo.bytesRead}/${bytesInfo.totalBytes} bytes）`
                  : null}
              </Typography>
            ) : null}

            {pageCount > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <Typography variant="caption" color="text.secondary">
                  Page {page} / {pageCount}（{linesPerPage} lines/page）
                </Typography>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_e, v) => setPage(v)}
                  size="small"
                />
              </div>
            ) : null}

            <pre className="whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-sm leading-6 overflow-auto">
              {pageText || '(empty)'}
            </pre>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

