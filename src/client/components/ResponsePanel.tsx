import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { copyText } from '../lib/clipboard';
import { formatBytes, formatDuration, prettyMaybeJson, statusColor } from '../lib/format';
import { useRequestStore } from '../store/requestStore';
import { BoltIcon, CheckIcon, CopyIcon } from './icons';
import { headersText, MiniToggle, Stat } from './panelBits';
import { Tabs } from './ui';

type TabId = 'body' | 'headers';

export function ResponsePanel() {
  const { t } = useT();
  const response = useRequestStore((s) => s.response);
  const sending = useRequestStore((s) => s.sending);
  const [tab, setTab] = useState<TabId>('body');
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const prettyBody = useMemo(
    () => (response ? prettyMaybeJson(response.body, response.contentType) : ''),
    [response],
  );
  const shownBody = pretty ? prettyBody : response?.body ?? '';
  const canPretty = response ? prettyBody !== response.body : false;

  async function onCopy() {
    const text = tab === 'body' ? shownBody : headersText(response?.headers ?? {});
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  if (!response && !sending) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <BoltIcon width={22} height={22} />
        </div>
        <h2 className="text-sm font-semibold text-text">{t('response.empty_title')}</h2>
        <p className="max-w-xs text-xs text-text-faint">{t('response.empty_hint')}</p>
      </section>
    );
  }

  if (sending) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-8">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-pulse-bar rounded-full bg-accent"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-text-faint">{t('response.waiting')}</p>
      </section>
    );
  }

  const res = response!;
  const isError = res.status === 0;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold" style={{ color: statusColor(res.status) }}>
            {isError ? '—' : res.status}
          </span>
          <span className="text-sm text-text-dim">{isError ? t('response.failed') : res.statusText}</span>
        </div>
        {!isError && (
          <>
            <Stat label={t('response.duration')} value={formatDuration(res.durationMs)} />
            <Stat label={t('response.size')} value={formatBytes(res.sizeBytes)} />
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-2xs font-medium text-text-faint">
              {res.viaProxy ? t('response.via_proxy') : t('response.direct')}
            </span>
          </>
        )}
      </header>

      {isError ? (
        <div className="px-4 pb-4">
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-text-dim">
            {res.error}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-3">
            <Tabs
              active={tab}
              onSelect={(id) => setTab(id as TabId)}
              tabs={[
                { id: 'body', label: t('response.body') },
                {
                  id: 'headers',
                  label: (
                    <>
                      {t('response.headers')}
                      <span className="ml-1.5 text-text-faint">{Object.keys(res.headers).length}</span>
                    </>
                  ),
                },
              ]}
            />
            <div className="flex items-center gap-1">
              {tab === 'body' && canPretty && (
                <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
                  <MiniToggle active={pretty} onClick={() => setPretty(true)}>
                    {t('response.pretty')}
                  </MiniToggle>
                  <MiniToggle active={!pretty} onClick={() => setPretty(false)}>
                    {t('response.raw')}
                  </MiniToggle>
                </div>
              )}
              <button
                type="button"
                onClick={onCopy}
                className="af-interactive inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-dim hover:bg-surface-2 hover:text-text"
              >
                {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
                {copied ? t('response.copied') : t('response.copy')}
              </button>
            </div>
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-auto px-4 pb-4">
            {tab === 'body' ? (
              shownBody ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-text">
                  <code>{shownBody}</code>
                </pre>
              ) : (
                <p className="py-6 text-center text-xs text-text-faint">{t('body.empty')}</p>
              )
            ) : Object.keys(res.headers).length ? (
              <dl className="flex flex-col">
                {Object.entries(res.headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(120px,0.4fr)_minmax(0,1fr)] gap-3 border-b border-border/60 py-2 font-mono text-[13px]"
                  >
                    <dt className="break-words font-semibold text-accent">{key}</dt>
                    <dd className="break-words text-text-dim">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="py-6 text-center text-xs text-text-faint">{t('response.no_headers')}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
