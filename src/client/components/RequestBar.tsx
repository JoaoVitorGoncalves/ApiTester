import { type ClipboardEvent, type KeyboardEvent } from 'react';
import { METHODS } from '@core/types';
import { parseCurl } from '@core/curl/parse';
import { normalizeUrl } from '@core/url';
import { useT } from '../i18n';
import { methodColor } from '../lib/format';
import { useRequestStore } from '../store/requestStore';
import { ChevronDownIcon, ImportIcon, SaveIcon, SendIcon } from './icons';
import { Button, IconButton } from './ui';

export function RequestBar({
  onOpenImport,
  onOpenSave,
}: {
  onOpenImport: () => void;
  onOpenSave: () => void;
}) {
  const { t } = useT();
  const method = useRequestStore((s) => s.spec.method);
  const url = useRequestStore((s) => s.spec.url);
  const sending = useRequestStore((s) => s.sending);
  const setMethod = useRequestStore((s) => s.setMethod);
  const setUrl = useRequestStore((s) => s.setUrl);
  const loadSpec = useRequestStore((s) => s.loadSpec);
  const send = useRequestStore((s) => s.send);
  const cancel = useRequestStore((s) => s.cancel);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && url.trim()) {
      e.preventDefault();
      void send();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (/^\s*curl\s/i.test(text)) {
      e.preventDefault();
      const { spec } = parseCurl(text);
      loadSpec(spec);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-stretch overflow-hidden rounded-lg border border-border bg-surface focus-within:border-accent">
        <div className="relative flex items-center border-r border-border">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
            aria-label="HTTP method"
            className="cursor-pointer appearance-none bg-transparent py-2.5 pl-3.5 pr-8 font-mono text-sm font-bold focus:outline-none"
            style={{ color: methodColor(method) }}
          >
            {METHODS.map((m) => (
              <option key={m} value={m} className="bg-surface font-sans text-text">
                {m}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            width={14}
            height={14}
            className="pointer-events-none absolute right-2.5 text-text-faint"
          />
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => url.trim() && setUrl(normalizeUrl(url))}
          placeholder={t('request.url_placeholder')}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-faint focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <IconButton label={t('curl.import')} onClick={onOpenImport}>
          <ImportIcon />
        </IconButton>
        <IconButton label={t('request.save')} onClick={onOpenSave}>
          <SaveIcon />
        </IconButton>
        {sending ? (
          <Button variant="subtle" onClick={cancel} className="min-w-[104px]">
            {t('request.cancel')}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void send()} disabled={!url.trim()} className="min-w-[104px]">
            <SendIcon width={15} height={15} />
            {t('request.send')}
          </Button>
        )}
      </div>
    </div>
  );
}
