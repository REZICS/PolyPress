import React, {useMemo, useState} from 'react';
import {Link, useLocation} from 'wouter';
import {Menu, Moon, Sun} from 'lucide-react';

import {Button} from '@mui/material';
import {Sidebar} from '@/component/ui/sidebar';
import {cn} from '@/lib/utils';
import {appStore} from '@/store/appStore';
import WorkSpaceMenu from '@/component/Layout/WorkSpaceMenu';

import FeaturedPlayListIcon from '@mui/icons-material/FeaturedPlayList';

type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
};

export interface MainLayoutProps extends React.PropsWithChildren {
  title?: string;
  headerRight?: React.ReactNode;
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
  title = 'PolyPress',
  headerRight,
}: MainLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const theme = appStore(s => s.theme);
  const setTheme = appStore(s => s.setTheme);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Thin header */}
      <header className="h-11 shrink-0 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full px-3 flex items-center gap-2">
          {/* Mobile menu */}
          <Button
            size="small"
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>

          <div className="min-w-0 flex-1 flex items-center gap-2">
            <WorkSpaceMenu startIcon={<FeaturedPlayListIcon />} recentPaths={['/Users/liangjun/Documents/workspace/chatgpt-web-vite','/Users/liangjun/Documents/workspace/chatgpt-web-vite2']} />
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
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

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-72 shrink-0 border-r bg-background min-h-0">
          <div className="flex-1 overflow-y-auto">
            <SidebarContent />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <div className="md:hidden">
          <Sidebar
            isOpen={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
            mode="fixed"
            width="288px"
            className={cn('border-r bg-background')}
          >
            <div className="h-full overflow-y-auto">
              <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </Sidebar>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
