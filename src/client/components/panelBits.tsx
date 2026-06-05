import type { ReactNode } from 'react';
import { cx } from './ui';

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-xs">
      <span className="text-text-faint">{label}</span>
      <span className="font-mono font-medium text-text-dim">{value}</span>
    </div>
  );
}

export function MiniToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'af-interactive rounded px-2 py-0.5 text-2xs font-medium',
        active ? 'bg-accent-soft text-accent' : 'text-text-faint hover:text-text-dim',
      )}
    >
      {children}
    </button>
  );
}

export function headersText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}
