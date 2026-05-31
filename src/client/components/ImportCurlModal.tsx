import { useState } from 'react';
import { parseCurl } from '@core/curl/parse';
import { useT } from '../i18n';
import { useRequestStore } from '../store/requestStore';
import { Button, Modal } from './ui';

export function ImportCurlModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const loadSpec = useRequestStore((s) => s.loadSpec);
  const [text, setText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  function reset() {
    setText('');
    setWarnings([]);
  }

  function onImport() {
    if (!text.trim()) return;
    const { spec, warnings: w } = parseCurl(text);
    loadSpec(spec);
    if (w.length > 0) {
      setWarnings(w);
    } else {
      reset();
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t('curl.import_title')}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={onImport} disabled={!text.trim()}>
            {t('curl.import_btn')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-dim">{t('curl.import_hint')}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('curl.import_placeholder')}
          spellCheck={false}
          autoFocus
          className="af-input min-h-[160px] resize-y font-mono text-[13px] leading-relaxed"
        />
        {warnings.length > 0 && (
          <div className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-text-dim">
            <p className="mb-1 font-medium">{t('curl.parse_warnings')}</p>
            <ul className="list-inside list-disc space-y-0.5 font-mono text-2xs">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
