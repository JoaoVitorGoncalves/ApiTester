import { useState } from 'react';
import { webhookInboxUrl } from '../api/webhooks';
import { useT } from '../i18n';
import { copyText } from '../lib/clipboard';
import { CheckIcon, ChevronDownIcon, CopyIcon } from './icons';
import { cx } from './ui';

export function WebhookNetworkTutorial() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173';
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const examples = [
    { title: t('webhooks.tutorial.local'), code: `${baseUrl}/api/webhooks/inbox/{id}` },
    {
      title: t('webhooks.tutorial.lan'),
      code: `http://192.168.1.10:5173/api/webhooks/inbox/{id}\n# npm run dev — bind host 0.0.0.0; allow port in Windows Firewall`,
    },
    {
      title: t('webhooks.tutorial.tunnel'),
      code: `ngrok http 5173\n# URL: https://abc.ngrok.io/api/webhooks/inbox/{id}\n\ncloudflared tunnel --url http://127.0.0.1:5173\nnpx localtunnel --port 5173`,
    },
    {
      title: t('webhooks.tutorial.prod'),
      code: `https://your-domain.example/api/webhooks/inbox/{id}\n# npm run preview — default port 8787 (PORT env)`,
    },
  ];

  async function copyExample(code: string, idx: number) {
    if (await copyText(code)) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1400);
    }
  }

  return (
    <div className="mx-1 mb-2 rounded-lg border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="af-interactive flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-medium text-text-dim hover:text-text"
      >
        <ChevronDownIcon
          width={14}
          height={14}
          className={cx('af-expand-icon shrink-0 text-text-faint', !open && '-rotate-90')}
        />
        {t('webhooks.tutorial.title')}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-2.5 py-2.5">
          <p className="text-2xs leading-relaxed text-text-faint">
            {t('webhooks.base_url')}: <span className="font-mono text-text-dim">{baseUrl}</span>
          </p>
          {isLocalhost && (
            <p className="rounded-md border border-warn/30 bg-warn/10 px-2 py-1.5 text-2xs text-text-dim">
              {t('webhooks.localhost_warn')}
            </p>
          )}
          {examples.map((ex, idx) => (
            <div key={ex.title}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-2xs font-semibold text-text-dim">{ex.title}</span>
                <button
                  type="button"
                  onClick={() => void copyExample(ex.code, idx)}
                  className="af-interactive inline-flex items-center gap-1 text-2xs text-text-faint hover:text-text"
                >
                  {copiedIdx === idx ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}
                  {copiedIdx === idx ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-surface-2 px-2 py-1.5 font-mono text-2xs text-text-dim">
                {ex.code}
              </pre>
            </div>
          ))}
          <p className="text-2xs text-text-faint">{t('webhooks.tutorial.secret_hint')}</p>
        </div>
      )}
    </div>
  );
}

export function WebhookUrlCopy({ webhookId }: { webhookId: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const url = webhookInboxUrl(webhookId);

  async function onCopy() {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      title={url}
      className="af-interactive inline-flex max-w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-2xs text-text-faint hover:bg-surface-2 hover:text-text"
    >
      {copied ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}
      {copied ? t('common.copied') : t('webhooks.copy_url')}
    </button>
  );
}
