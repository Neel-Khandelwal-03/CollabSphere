'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Boxes, FolderKanban, CheckSquare, Bug, Users, FileText, Clock, X } from 'lucide-react';
import { useSearch, getRecentSearches, addRecentSearch, clearRecentSearches } from '@/hooks/useSearch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import Avatar from '@/components/ui/Avatar';

const TYPE_META = {
  workspace: { icon: Boxes, label: 'Workspaces' },
  project: { icon: FolderKanban, label: 'Projects' },
  task: { icon: CheckSquare, label: 'Tasks' },
  issue: { icon: Bug, label: 'Issues' },
  user: { icon: Users, label: 'People' },
  file: { icon: FileText, label: 'Files' },
};
const TYPE_ORDER = ['workspace', 'project', 'task', 'issue', 'file', 'user'];

export default function SearchPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const debounced = useDebouncedValue(query, 300);
  const inputRef = useRef(null);

  const { data: results, isLoading, isFetching } = useSearch(debounced);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    setRecent(getRecentSearches());
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const goTo = (href, term) => {
    addRecentSearch(term);
    onClose();
    router.push(href);
  };

  if (!open) return null;

  const hasQuery = debounced.trim().length > 0;
  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 pt-[12vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces, projects, tasks, issues, people, files..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
          />
          <button onClick={onClose} className="shrink-0 rounded-md p-1 text-muted hover:bg-ink/5" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasQuery && (
            <div>
              {recent.length > 0 && (
                <div className="mb-1 flex items-center justify-between px-2 py-1">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Recent searches</p>
                  <button
                    onClick={() => { clearRecentSearches(); setRecent([]); }}
                    className="text-[11px] text-muted hover:text-ink"
                  >
                    Clear
                  </button>
                </div>
              )}
              {recent.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-ink/[0.03]"
                >
                  <Clock className="h-3.5 w-3.5 text-muted" />
                  {term}
                </button>
              ))}
              {recent.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted">Start typing to search everything you have access to.</p>
              )}
            </div>
          )}

          {hasQuery && (isLoading || isFetching) && (
            <p className="px-2 py-8 text-center text-sm text-muted">Searching...</p>
          )}

          {hasQuery && !isLoading && totalResults === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted">No results for &quot;{debounced}&quot;.</p>
          )}

          {hasQuery && !isLoading && totalResults > 0 && TYPE_ORDER.map((type) => {
            const items = results?.[type] || [];
            if (items.length === 0) return null;
            const { icon: Icon, label } = TYPE_META[type];
            return (
              <div key={type} className="mb-1">
                <p className="px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => goTo(r.href, debounced)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-ink/[0.03]"
                  >
                    {type === 'user' ? (
                      <Avatar name={r.title} src={r.avatarUrl} size={22} />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{r.title}</p>
                      {r.description && <p className="truncate text-xs text-muted">{r.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
