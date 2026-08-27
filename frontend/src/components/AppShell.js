'use client';

import { useState, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, Search } from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import Sidebar from './Sidebar';
import Avatar from './ui/Avatar';
import NotificationBell from './notifications/NotificationBell';
import SearchPalette from './search/SearchPalette';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';

const SIDEBAR_COLLAPSED_KEY = 'collabsphere:sidebar-collapsed';
const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

function Shell({ children, title, actions }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  // Cmd/Ctrl+K only — deliberately not "/" too, since that's a normal
  // character people type constantly in comment boxes and chat
  // composers; hijacking it there would be exactly the kind of shortcut
  // conflict the spec's own caveat warns against.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Read the persisted collapse state after mount (avoids an SSR/client
  // markup mismatch, since localStorage doesn't exist on the server).
  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    // The root is a real flex row that fills the viewport exactly and
    // never grows past it — `overflow-hidden` here is what guarantees
    // the *page* (body/html) can never scroll horizontally or vertically,
    // no matter how wide content inside <main> gets. This replaces the
    // old `position: fixed` sidebar + flex spacer combo, which could
    // desync during horizontal scroll (the spacer scrolled away while
    // the fixed sidebar stayed put, letting content slide underneath
    // it). The sidebar is now a genuine flex item — it can't desync
    // because there's nothing to desync from.
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Desktop sidebar — real layout item, animates width, not a
          fixed-position overlay. relative + z-20 keeps it stacked above
          main content even though proper flex layout means they should
          never actually overlap. */}
      <div
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        className="relative z-20 hidden shrink-0 transition-[width] duration-200 ease-in-out lg:block"
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {/* Mobile/tablet overlay drawer — unchanged pattern, always shown
          expanded-style since it's a transient overlay, not persistent
          chrome. z-50 keeps it above the sticky header (z-30). */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[260px]">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column. min-w-0 is the linchpin: without it, a flex child
          refuses to shrink below its content's intrinsic width, so any
          wide descendant (Kanban board, wide table) would push this
          whole column wider than the viewport instead of scrolling
          internally. With it, overflow is contained exactly where each
          component below declares it (see KanbanBoard's own
          `overflow-x-auto`, and TaskTable's). */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 shrink-0 border-b border-line bg-surface/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-md p-1.5 text-ink lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              {title && (
                <h1 className="truncate font-display text-base font-semibold text-ink sm:text-lg">
                  {title}
                </h1>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {actions}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:bg-ink/[0.03] sm:flex"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5" />
                Search
                <kbd className="ml-2 rounded border border-line bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-lg p-2 text-ink hover:bg-ink/5 sm:hidden"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <NotificationBell />
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink/5"
                >
                  <Avatar name={user?.name} size={30} />
                  <span className="hidden text-sm text-ink sm:inline">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                      <div className="px-2.5 py-2">
                        <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
                        <p className="truncate text-xs text-muted">{user?.email}</p>
                      </div>
                      <div className="my-1 border-t border-line" />
                      <button
                        onClick={() => logout.mutate()}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-tint"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* This is the ONLY element that scrolls vertically. Horizontal
            overflow is explicitly hidden here too, as a defensive
            backstop — the real containment happens inside individual
            wide components (Kanban columns, data tables), each with its
            own `overflow-x-auto`, so the scrollbar shows up exactly
            where the wide content is, never at the page level. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function AppShell(props) {
  return (
    <ProtectedRoute>
      <Shell {...props} />
    </ProtectedRoute>
  );
}
