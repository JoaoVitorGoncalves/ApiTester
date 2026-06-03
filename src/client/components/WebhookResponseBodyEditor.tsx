import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatJson, minifyJson, validateJson } from '@core/json';
import { useT } from '../i18n';
import { CheckIcon, CloseIcon } from './icons';
import { Button, cx } from './ui';

type ResponseBodyMode = 'none' | 'json' | 'text';

function parseStoredBody(body: string | null): { mode: ResponseBodyMode; raw: string } {
  if (body == null || body.trim() === '') return { mode: 'none', raw: '' };
  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return { mode: 'json', raw: body };
  }
  return { mode: 'text', raw: body };
}

function toStoredBody(mode: ResponseBodyMode, raw: string): string | null {
  if (mode === 'none') return null;
  return raw;
}

const MODES: ResponseBodyMode[] = ['none', 'json', 'text'];

export function WebhookResponseBodyEditor({
  value,
  disabled,
  onSave,
}: {
  value: string | null;
  disabled?: boolean;
  onSave: (body: string | null) => void;
}) {
  const { t } = useT();
  const [mode, setMode] = useState<ResponseBodyMode>('none');
  const [raw, setRaw] = useState('');

  useEffect(() => {
    const parsed = parseStoredBody(value);
    setMode(parsed.mode);
    setRaw(parsed.raw);
  }, [value]);

  const jsonCheck = useMemo(
    () => (mode === 'json' ? validateJson(raw) : null),
    [mode, raw],
  );

  const persist = useCallback(
    (nextMode: ResponseBodyMode, nextRaw: string) => {
      const stored = toStoredBody(nextMode, nextRaw);
      if (stored === value || (stored == null && (value == null || value === ''))) return;
      if (nextMode === 'json' && nextRaw.trim()) {
        const check = validateJson(nextRaw);
        if (!check.valid && !check.empty) return;
      }
      onSave(stored);
    },
    [onSave, value],
  );

  const setModeAndPersist = useCallback(
    (nextMode: ResponseBodyMode) => {
      setMode(nextMode);
      if (nextMode === 'none') {
        setRaw('');
        persist('none', '');
        return;
      }
      if (nextMode === 'json' && !raw.trim()) {
        setRaw('{\n  \n}');
      }
    },
    [persist, raw],
  );

  return (
    <div className={cx('flex flex-col gap-3', disabled && 'pointer-events-none opacity-50')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => setModeAndPersist(m)}
              className={cx(
                'af-interactive rounded-md px-3 py-1.5 text-xs font-medium',
                mode === m ? 'bg-accent-soft text-accent' : 'text-text-dim hover:text-text',
              )}
            >
              {t(`body.${m}` as const)}
            </button>
          ))}
        </div>

        {mode === 'json' && (
          <div className="flex items-center gap-2">
            {jsonCheck && !jsonCheck.empty && (
              <span
                className="inline-flex items-center gap-1 text-2xs font-medium"
                style={{ color: jsonCheck.valid ? 'var(--ok)' : 'var(--danger)' }}
              >
                {jsonCheck.valid ? <CheckIcon width={13} height={13} /> : <CloseIcon width={13} height={13} />}
                {jsonCheck.valid ? t('body.valid_json') : t('body.invalid_json')}
              </span>
            )}
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              disabled={!jsonCheck?.valid}
              onClick={() => {
                const r = formatJson(raw);
                if (r.ok) {
                  setRaw(r.result);
                  persist('json', r.result);
                }
              }}
            >
              {t('body.format')}
            </Button>
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              disabled={!jsonCheck?.valid}
              onClick={() => {
                const r = minifyJson(raw);
                if (r.ok) {
                  setRaw(r.result);
                  persist('json', r.result);
                }
              }}
            >
              {t('body.minify')}
            </Button>
          </div>
        )}
      </div>

      {disabled && (
        <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-dim">
          {t('webhooks.response_body_204')}
        </p>
      )}

      {mode === 'none' && !disabled && (
        <p className="px-1 py-6 text-center text-xs text-text-faint">{t('webhooks.response_body_default')}</p>
      )}

      {mode === 'json' && !disabled && (
        <div className="flex flex-col gap-2">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={() => persist('json', raw)}
            placeholder={t('body.json_placeholder')}
            spellCheck={false}
            className={cx(
              'af-input min-h-[220px] resize-y font-mono text-[13px] leading-relaxed',
              !!jsonCheck && !jsonCheck.valid && !jsonCheck.empty && 'border-danger/60 focus:border-danger',
            )}
          />
          {jsonCheck && !jsonCheck.valid && !jsonCheck.empty && (
            <p className="font-mono text-2xs text-danger">{jsonCheck.error}</p>
          )}
        </div>
      )}

      {mode === 'text' && !disabled && (
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => persist('text', raw)}
          placeholder={t('body.text_placeholder')}
          spellCheck={false}
          className="af-input min-h-[220px] resize-y font-mono text-[13px] leading-relaxed"
        />
      )}
    </div>
  );
}
