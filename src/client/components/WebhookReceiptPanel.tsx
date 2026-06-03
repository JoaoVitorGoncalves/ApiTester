import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { copyText } from '../lib/clipboard';
import { prettyMaybeJson, statusColor } from '../lib/format';
import { useWebhooks } from '../store/webhooks';
import { CheckIcon, CopyIcon } from './icons';
import { Tabs, cx } from './ui';

type TabId = 'body' | 'headers' | 'query';

export function WebhookReceiptPanel() {
  const { t } = useT();
  const receipt = useWebhooks((s) => s.selectedReceipt);
  const [tab, setTab] = useState<TabId>('body');
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const prettyBody = useMemo(
    () => (receipt?.bodyText ? prettyMaybeJson(receipt.bodyText, 'application/json') : ''),
    [receipt?.bodyText],
  );
  const shownBody = pretty ? prettyBody : receipt?.bodyText ?? '';
  const canPretty = receipt?.bodyText ? prettyBody !== receipt.bodyText : false;
  const fullUrl = useMemo(() => {
    if (!receipt) return '';
    const qs = new URLSearchParams(receipt.query).toString();
    return qs ? `${receipt.path}?${qs}` : receipt.path;
  }, [receipt]);

  async function onCopy() {
    if (!receipt) return;
    let text = '';
    if (tab === 'body') text = shownBody;
    else if (tab === 'headers') text = headersText(receipt.headers);
    else text = queryText(receipt.query);
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  if (!receipt) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-8 text-center">
        <h2 className="text-sm font-semibold text-text">{t('webhooks.receipt_empty_title')}</h2>
        <p className="max-w-xs text-xs text-text-faint">{t('webhooks.receipt_empty_hint')}</p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3">
        <MethodLine method={receipt.method} />
        <span className="font-mono text-lg font-bold" style={{ color: statusColor(receipt.responseStatus) }}>
          {receipt.responseStatus}
        </span>
        <Stat label={t('webhooks.client_ip')} value={receipt.clientIp ?? '—'} />
        <Stat label={t('webhooks.received_at')} value={new Date(receipt.receivedAt).toLocaleString()} />
      </header>

      <div className="px-4 pb-2">
        <p className="break-all font-mono text-xs text-text-dim">{fullUrl}</p>
        {receipt.bodyTruncated && (
          <p className="mt-1 text-2xs text-warn">{t('webhooks.body_truncated')}</p>
        )}
      </div>

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
                  <span className="ml-1.5 text-text-faint">{Object.keys(receipt.headers).length}</span>
                </>
              ),
            },
            {
              id: 'query',
              label: (
                <>
                  {t('tab.params')}
                  <span className="ml-1.5 text-text-faint">{Object.keys(receipt.query).length}</span>
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
        ) : tab === 'headers' ? (
          Object.keys(receipt.headers).length ? (
            <KeyValueList entries={receipt.headers} />
          ) : (
            <p className="py-6 text-center text-xs text-text-faint">{t('response.no_headers')}</p>
          )
        ) : Object.keys(receipt.query).length ? (
          <KeyValueList entries={receipt.query} />
        ) : (
          <p className="py-6 text-center text-xs text-text-faint">{t('kv.empty_params')}</p>
        )}
      </div>
    </section>
  );
}

function MethodLine({ method }: { method: string }) {
  return (
    <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-sm font-bold text-accent">
      {method}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-xs">
      <span className="text-text-faint">{label}</span>
      <span className="font-mono font-medium text-text-dim">{value}</span>
    </div>
  );
}

function KeyValueList({ entries }: { entries: Record<string, string> }) {
  return (
    <dl className="flex flex-col">
      {Object.entries(entries).map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[minmax(120px,0.4fr)_minmax(0,1fr)] gap-3 border-b border-border/60 py-2 font-mono text-[13px]"
        >
          <dt className="break-words font-semibold text-accent">{key}</dt>
          <dd className="break-words text-text-dim">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MiniToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

function headersText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function queryText(query: Record<string, string>): string {
  return Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}
