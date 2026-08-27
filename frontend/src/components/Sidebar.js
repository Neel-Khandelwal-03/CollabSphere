'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  FolderOpen,
  Bell,
  BarChart3,
  Bug,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import Avatar from './ui/Avatar';
import Tooltip from './ui/Tooltip';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workspaces', label: 'Workspaces', icon: Boxes },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/issues', label: 'Issues', icon: Bug },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  // Files (Checkpoint 7) has no dedicated top-level page — it lives as
  // "Files" tabs on Workspace Details and Project Details, matching the
  // workspace/project-scoped file libraries that checkpoint built. This
  // links to the natural entry point rather than inventing a new page,
  // which the instruction for this fix explicitly said not to do.
  { href: '/workspaces', label: 'Files', icon: FolderOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

/**
 * Used both as the fixed desktop sidebar (collapsible, toggle button
 * present) and inside the mobile/tablet overlay drawer (always full
 * width — pass no onToggleCollapse and it simply won't render one).
 */
export default function Sidebar({ collapsed = false, onToggleCollapse, onNavigate }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <nav className="flex h-full flex-col overflow-hidden bg-ink">
      {/* Logo + collapse toggle */}
      <div className={cn('flex items-center gap-2 px-3 py-5', collapsed ? 'justify-center' : 'justify-between')}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden" onClick={onNavigate}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand font-display text-sm font-semibold text-white">
            C
          </span>
          {!collapsed && (
            <span className="truncate font-display text-base font-semibold text-white">
              CollabSphere
            </span>
          )}
        </Link>
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {onToggleCollapse && collapsed && (
        <div className="flex justify-center px-3 pb-2">
          <Tooltip label="Expand sidebar">
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Workspace switcher placeholder */}
      <div className="px-3 pb-3">
        <Tooltip label="Switch workspace" show={collapsed}>
          <Link
            href="/workspaces"
            onClick={onNavigate}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70',
              'transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white',
              collapsed && 'justify-center px-0 py-2'
            )}
          >
            <Boxes className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">Workspace</span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </>
            )}
          </Link>
        </Tooltip>
      </div>

      {/* Primary nav */}
      <div className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, comingSoon }) => {
          const active = !comingSoon && href !== '#' && pathname.startsWith(href);

          if (comingSoon) {
            return (
              <Tooltip key={label} label={`${label} — coming soon`} show={collapsed}>
                <div
                  className={cn(
                    'flex w-full cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-white/25',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && label}
                  </span>
                  {!collapsed && (
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide">
                      soon
                    </span>
                  )}
                </div>
              </Tooltip>
            );
          }

          return (
            <Tooltip key={label} label={label} show={collapsed}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                  'hover:translate-x-0.5',
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
                  collapsed && 'justify-center px-0 hover:translate-x-0'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            </Tooltip>
          );
        })}
      </div>

      {/* Settings */}
      <div className="px-3 pt-2">
        <Tooltip label="Settings" show={collapsed}>
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname.startsWith('/settings') ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center px-0'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && 'Settings'}
          </Link>
        </Tooltip>
      </div>

      {/* User profile + logout, pinned to bottom */}
      <div className="mt-2 border-t border-white/10 px-3 py-3">
        <Tooltip label={`${user?.name || ''} · ${user?.email || ''}`} show={collapsed}>
          <div className={cn('flex items-center gap-2.5 rounded-lg px-1 py-1.5', collapsed && 'justify-center px-0')}>
            <Avatar name={user?.name} size={28} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{user?.name}</p>
                <p className="truncate text-[11px] text-white/40">{user?.email}</p>
              </div>
            )}
          </div>
        </Tooltip>

        <Tooltip label="Log out" show={collapsed}>
          <button
            onClick={() => logout.mutate()}
            className={cn(
              'mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-danger/10 hover:text-danger',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Log out'}
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
