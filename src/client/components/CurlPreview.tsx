import { useMemo, useState } from 'react';
import { buildCurl } from '@core/curl/build';
import { useT } from '../i18n';
import { copyText } from '../lib/clipboard';
import { useRequestStore } from '../store/requestStore';
import { CheckIcon, CopyIcon } from './icons';
import { Button } from './ui';

export function CurlPreview() {
  const { t } = useT();
  const spec = useRequestStore((s) => s.spec);
  const [copied, setCopied] = useState(false);

  const curl = useMemo(() => (spec.url.trim() ? buildCurl(spec) : ''), [spec]);

  async function onCopy() {
    if (!curl) return;
    if (await copyText(curl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  if (!curl) {
    return <p className="px-1 py-6 text-center text-xs text-text-faint">{t('curl.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="subtle" className="px-2.5 py-1.5 text-xs" onClick={onCopy}>
          {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
          {copied ? t('common.copied') : t('curl.copy')}
        </Button>
      </div>
      <pre className="scroll-thin overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-[13px] leading-relaxed text-text-dim">
        <code>{curl}</code>
      </pre>
    </div>
  );
}
