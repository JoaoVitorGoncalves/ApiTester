import { ensureTrailingRow } from '@core/rows';
import { createRow, type Row } from '@core/types';
import { useT } from '../i18n';
import { TrashIcon } from './icons';
import { Toggle, cx } from './ui';

/**
 * Editor for enabled/disabled key-value rows. An empty trailing row is kept
 * implicitly: typing into the last row spawns a fresh blank one.
 */
export function KeyValueEditor({
  rows,
  onChange,
  emptyHint,
  keyPlaceholder,
  valuePlaceholder,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  emptyHint: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const { t } = useT();

  const visible = ensureTrailingRow(rows);

  function update(id: string, patch: Partial<Row>) {
    let next = visible.map((r) => (r.id === id ? { ...r, ...patch } : r));
    const last = next[next.length - 1];
    if (last && (last.key !== '' || last.value !== '')) {
      next = [...next, createRow()];
    }
    onChange(next);
  }

  function remove(id: string) {
    const next = visible.filter((r) => r.id !== id);
    onChange(next.length ? next : [createRow()]);
  }

  const hasContent = visible.some((r) => r.key !== '' || r.value !== '');

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1.3fr)_32px] items-center gap-2 px-1 pb-1.5 text-2xs font-semibold uppercase tracking-wide text-text-faint">
        <span />
        <span>{t('kv.key')}</span>
        <span>{t('kv.value')}</span>
        <span />
      </div>

      <div className="flex flex-col gap-1.5">
        {visible.map((row, index) => {
          const isTrailing = index === visible.length - 1 && row.key === '' && row.value === '';
          return (
            <div
              key={row.id}
              className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1.3fr)_32px] items-center gap-2"
            >
              <div className="flex justify-center">
                {!isTrailing && (
                  <Toggle checked={row.enabled} onChange={(v) => update(row.id, { enabled: v })} label={t('kv.toggle')} />
                )}
              </div>
              <input
                value={row.key}
                onChange={(e) => update(row.id, { key: e.target.value })}
                placeholder={keyPlaceholder ?? t('kv.key')}
                spellCheck={false}
                className={cx(
                  'af-input font-mono text-[13px]',
                  !row.enabled && !isTrailing && 'opacity-45',
                )}
              />
              <input
                value={row.value}
                onChange={(e) => update(row.id, { value: e.target.value })}
                placeholder={valuePlaceholder ?? t('kv.value')}
                spellCheck={false}
                className={cx(
                  'af-input font-mono text-[13px]',
                  !row.enabled && !isTrailing && 'opacity-45',
                )}
              />
              <div className="flex justify-center">
                {!isTrailing && (
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    aria-label={t('kv.remove')}
                    title={t('kv.remove')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!hasContent && <p className="px-1 pt-3 text-xs text-text-faint">{emptyHint}</p>}
    </div>
  );
}
