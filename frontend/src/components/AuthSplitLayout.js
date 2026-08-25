import Link from 'next/link';
import MergeGraph from './MergeGraph';

export default function AuthSplitLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.06]" />
        <Link
          href="/"
          className="relative font-display text-lg font-semibold tracking-tight text-white"
        >
          CollabSphere
        </Link>
        <div className="relative">
          <MergeGraph className="w-full max-w-md text-white" />
          <p className="mt-6 max-w-sm font-mono text-sm leading-relaxed text-white/60">
            tasks, chat, files, and issues — one branch, merged.
          </p>
        </div>
        <p className="relative font-mono text-xs text-white/30">
          built for teams who ship together
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-block font-display text-lg font-semibold tracking-tight text-ink lg:hidden"
          >
            CollabSphere
          </Link>
          {eyebrow && (
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-brand">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
