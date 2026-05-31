import type { Method } from '@core/types';
import { methodColor } from '../lib/format';
import { cx } from './ui';

export function MethodBadge({ method, className }: { method: Method; className?: string }) {
  return (
    <span
      className={cx('font-mono text-2xs font-bold uppercase tracking-wide', className)}
      style={{ color: methodColor(method) }}
    >
      {method}
    </span>
  );
}
