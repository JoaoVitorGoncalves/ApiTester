import { useMemo } from 'react';
import { BODYLESS_METHODS, type BodyMode } from '@core/types';
import { formatJson, minifyJson, validateJson } from '@core/json';
import { useT } from '../i18n';
import { useRequestStore } from '../store/requestStore';
import { KeyValueEditor } from './KeyValueEditor';
import { CheckIcon, CloseIcon } from './icons';
import { Button, cx } from './ui';

const MODES: BodyMode[] = ['none', 'json', 'text', 'form'];

export function BodyEditor() {
  const { t } = useT();
  const method = useRequestStore((s) => s.spec.method);
  const body = useRequestStore((s) => s.spec.body);
  const setBody = useRequestStore((s) => s.setBody);
  const setBodyMode = useRequestStore((s) => s.setBodyMode);

  const jsonCheck = useMemo(
    () => (body.mode === 'json' ? validateJson(body.raw) : null),
    [body],
  );

  const bodyless = BODYLESS_METHODS.has(method);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setBodyMode(mode)}
              className={cx(
                'af-interactive rounded-md px-3 py-1.5 text-xs font-medium',
                body.mode === mode ? 'bg-accent-soft text-accent' : 'text-text-dim hover:text-text',
              )}
            >
              {t(`body.${mode}` as const)}
            </button>
          ))}
        </div>

        {body.mode === 'json' && (
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
                const r = formatJson(body.raw);
                if (r.ok) setBody({ mode: 'json', raw: r.result });
              }}
            >
              {t('body.format')}
            </Button>
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              disabled={!jsonCheck?.valid}
              onClick={() => {
                const r = minifyJson(body.raw);
                if (r.ok) setBody({ mode: 'json', raw: r.result });
              }}
            >
              {t('body.minify')}
            </Button>
          </div>
        )}
      </div>

      {bodyless && body.mode !== 'none' && (
        <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-text-dim">
          {t('body.bodyless', { method })}
        </p>
      )}

      {body.mode === 'none' && <p className="px-1 py-6 text-center text-xs text-text-faint">{t('body.empty')}</p>}

      {body.mode === 'json' && (
        <div className="flex flex-col gap-2">
          <textarea
            value={body.raw}
            onChange={(e) => setBody({ mode: 'json', raw: e.target.value })}
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

      {body.mode === 'text' && (
        <textarea
          value={body.raw}
          onChange={(e) => setBody({ mode: 'text', raw: e.target.value })}
          placeholder={t('body.text_placeholder')}
          spellCheck={false}
          className="af-input min-h-[220px] resize-y font-mono text-[13px] leading-relaxed"
        />
      )}

      {body.mode === 'form' && (
        <KeyValueEditor
          rows={body.rows}
          onChange={(rows) => setBody({ mode: 'form', rows })}
          emptyHint={t('kv.empty_form')}
        />
      )}
    </div>
  );
}
