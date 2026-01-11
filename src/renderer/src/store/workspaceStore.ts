import {create} from 'zustand';
import {persist} from 'zustand/middleware';

function uniqKeepOrder(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of list) {
    const v = typeof p === 'string' ? p.trim() : '';
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export type WorkspaceState = {
  rootPath: string | null;
  recentPaths: string[];
  openWorkspace: (path: string) => void;
  setRootPath: (path: string | null) => void;
  clearRecent: () => void;
};

export const workspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      rootPath: null,
      recentPaths: [],
      openWorkspace: (path: string) => {
        const next = path?.trim();
        if (!next) return;
        set({
          rootPath: next,
          recentPaths: uniqKeepOrder([next, ...get().recentPaths]).slice(0, 30),
        });
      },
      setRootPath: (path: string | null) => set({rootPath: path}),
      clearRecent: () => set({recentPaths: []}),
    }),
    {
      name: 'workspaceStore',
      partialize: s => ({rootPath: s.rootPath, recentPaths: s.recentPaths}),
    },
  ),
);

