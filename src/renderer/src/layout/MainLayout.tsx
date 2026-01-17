import React, {useMemo, useState} from 'react';
import {Link, useLocation} from 'wouter';
import {Menu, Moon, Sun} from 'lucide-react';

import {Button} from '@mui/material';
import {Sidebar} from '@/component/ui/sidebar';
import {cn} from '@/lib/utils';
import {appStore} from '@/store/appStore';
import {workspaceStore} from '@/store/workspaceStore';
import WorkSpaceMenu from '@/component/Layout/WorkSpaceMenu';
import HomeIcon from '@mui/icons-material/Home';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

import FeaturedPlayListIcon from '@mui/icons-material/FeaturedPlayList';

type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
};

export interface MainLayoutProps extends React.PropsWithChildren {
  headerRight?: React.ReactNode;
  /**
   * Custom sidebar content (desktop + mobile).
   * - `ReactNode`: render directly
   * - `(opts) => ReactNode`: useful when you need `onNavigate` for mobile close
   */
  SidebarContentProps?:
    | React.ReactNode
    | ((opts: {onNavigate?: () => void}) => React.ReactNode);
  subSidebarContentProps?:
    | React.ReactNode
    | ((opts: {onNavigate?: () => void}) => React.ReactNode);
}

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}): React.ReactElement {
  const [location] = useLocation();

  const navItems: NavItem[] = useMemo(
    () => [
      {label: 'Home', href: '/', exact: true},
      {label: 'WorkSpace', href: '/workspace', exact: true},
      {label: 'Theme', href: '/theme', exact: true},
      {label: 'About', href: '/about', exact: true},
    ],
    [],
  );

  return (
    <div className="h-full w-full">
      {/* <div className="h-11 px-3 flex items-center border-b">
        <div className="text-sm font-semibold tracking-tight">PolyPress</div>
      </div> */}

      <div className="p-2">
        <div className="text-xs font-medium text-muted-foreground px-2 py-2">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map(item => {
            const isActive = item.exact
              ? location === item.href
              : location.startsWith(item.href);
            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive}
                onNavigate={onNavigate}
              />
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function MainLayout({
  children,
  headerRight,
  SidebarContentProps,
  subSidebarContentProps,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [subSidebarOpen, setSubSidebarOpen] = useState(true);
  function toggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }
  function toggleSubSidebar() {
    setSubSidebarOpen(!subSidebarOpen);
  }
  const theme = appStore(s => s.theme);
  const setTheme = appStore(s => s.setTheme);
  const workspaceRoot = workspaceStore(s => s.rootPath);
  const recentWorkspaces = workspaceStore(s => s.recentPaths);
  const openWorkspace = workspaceStore(s => s.openWorkspace);
  const clearRecent = workspaceStore(s => s.clearRecent);

  const [_location, navigate] = useLocation();

  const handleOnSelect = (path: string) => {
    openWorkspace(path);
    navigate(`/workspace?path=${path}`);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const renderSidebar = (onNavigate?: () => void) => {
    if (typeof SidebarContentProps === 'function') {
      return SidebarContentProps({onNavigate});
    }
    if (SidebarContentProps) return SidebarContentProps;
    return <SidebarContent onNavigate={onNavigate} />;
  };

  const renderSubSidebar = (onNavigate?: () => void) => {
    if (typeof subSidebarContentProps === 'function') {
      return subSidebarContentProps({onNavigate});
    }
    if (subSidebarContentProps) return subSidebarContentProps;
    return null;
  };

  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Thin header */}
      <header className="h-11 shrink-0 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-9999 fixed top-0 left-0 right-0">
        <div className="h-full px-3 flex items-center gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <WorkSpaceMenu
              startIcon={<FeaturedPlayListIcon />}
              label={workspaceRoot ?? '工作区'}
              recentPaths={recentWorkspaces}
              onSelect={handleOnSelect}
              onClearRecent={() => clearRecent()}
            />
            <Button
              variant="text"
              className="truncate text-md"
              startIcon={<HomeIcon />}
            >
              <Link href="/">Home</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
            <Button variant="text" size="small" onClick={toggleSidebar}>
              <ArrowLeftIcon />
            </Button>
            <Button variant="text" size="small" onClick={toggleSubSidebar}>
              <ArrowRightIcon />
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-11" />

      <div className="flex flex-1 min-h-0">
        {/* Body */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          mode="inline"
          width="288px"
          className={cn('border-r bg-background')}
        >
          <div className="h-11" />
          <div className="h-full overflow-y-auto">
            {renderSidebar(() => setSidebarOpen(false))}
          </div>
        </Sidebar>
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
        <Sidebar
          isOpen={subSidebarOpen}
          onClose={() => setSubSidebarOpen(false)}
          mode="inline"
          width="350px"
          className={cn('border-l bg-background')}
          position="right"
        >
          <div className="h-11" />
          <div className="h-full overflow-y-auto">
            {renderSubSidebar(() => setSubSidebarOpen(false))}
          </div>
        </Sidebar>
      </div>
    </div>
  );
}
