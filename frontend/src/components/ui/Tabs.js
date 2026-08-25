'use client';

import { cn } from '@/lib/utils';

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors',
            active === tab.key ? 'text-ink' : 'text-muted hover:text-ink'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                active === tab.key ? 'bg-brand-tint text-brand-strong' : 'bg-ink/5 text-muted'
              )}
            >
              {tab.count}
            </span>
          )}
          {active === tab.key && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
          )}
        </button>
      ))}
    </div>
  );
}
