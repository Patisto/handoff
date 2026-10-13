import type { ReactNode } from 'react';
import { AlertCircle, ArrowUpRight, Layers, LoaderCircle } from 'lucide-react';
import { cn, initials, label } from '../lib/utils';
import { Button } from './ui/button';
export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#31303b] font-medium text-[#ccc5ef]',
        size === 'lg' ? 'h-10 w-10 text-xs' : 'h-6 w-6 text-[9px]',
      )}
    >
      {initials(name)}
    </span>
  );
}
export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full border',
        status === 'APPROVED'
          ? 'border-accent bg-accent'
          : status === 'IN_REVIEW'
            ? 'border-accent bg-accent/30'
            : status === 'IN_PROGRESS'
              ? 'border-[#b6b1c7] bg-[#b6b1c7]/30'
              : status === 'REJECTED'
                ? 'border-rose-400/70 bg-rose-400/10'
                : 'border-muted/70',
      )}
    />
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="badge">
      <StatusDot status={status} />
      {label(status)}
    </span>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted"
    >
      <LoaderCircle size={18} className="animate-spin" />
      Loading your workspace…
    </div>
  );
}
export function ErrorState({
  retry,
  message = 'We couldn’t load this view.',
}: {
  retry?: () => void;
  message?: string;
}) {
  return (
    <div role="alert" className="panel m-5 flex flex-col items-center gap-3 p-8 text-center">
      <AlertCircle className="text-muted" />
      <p>{message}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-4 rounded-xl border border-border bg-white/[.025] p-3">
        <Layers size={20} className="text-muted" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mb-5 mt-2 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[29px]">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted md:text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
    >
      {children}
      <ArrowUpRight size={13} />
    </button>
  );
}
