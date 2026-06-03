import { useEffect, useState } from 'react';
import { copyText } from '../lib/clipboard';
import { useT } from '../i18n';
import { useDialog } from '../store/dialog';
import { Button, Modal, TextInput, cx } from './ui';
import { CheckIcon } from './icons';

export function DialogHost() {
  const { t } = useT();
  const open = useDialog((s) => s.open);
  const state = useDialog((s) => s.state);
  const close = useDialog((s) => s.close);

  if (!open || !state) return null;

  if (state.kind === 'prompt') {
    return <PromptDialog state={state} onClose={close} />;
  }

  if (state.kind === 'secret') {
    return <SecretDialog state={state} onClose={close} />;
  }

  if (state.kind === 'alert') {
    return (
      <Modal
        open
        onClose={() => close(undefined)}
        title={state.title}
        footer={
          <Button type="button" variant="primary" onClick={() => close(undefined)}>
            {t('common.close')}
          </Button>
        }
      >
        {state.message && <p className="text-sm leading-relaxed text-text-dim">{state.message}</p>}
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={() => close(false)}
      title={state.title || t('common.confirm')}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            {state.cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={state.danger ? 'danger' : 'primary'}
            onClick={() => close(true)}
          >
            {state.confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      {state.message && <p className="text-sm leading-relaxed text-text-dim">{state.message}</p>}
    </Modal>
  );
}

function PromptDialog({
  state,
  onClose,
}: {
  state: { title: string; label?: string; defaultValue?: string };
  onClose: (value: unknown) => void;
}) {
  const { t } = useT();
  const [value, setValue] = useState(state.defaultValue ?? '');

  useEffect(() => {
    setValue(state.defaultValue ?? '');
  }, [state.defaultValue, state.title]);

  return (
    <Modal
      open
      onClose={() => onClose(null)}
      title={state.title}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onClose(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!value.trim()}
            onClick={() => onClose(value.trim())}
          >
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-2">
        {state.label && <span className="text-xs font-medium text-text-dim">{state.label}</span>}
        <TextInput
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onClose(value.trim());
          }}
          className="w-full"
        />
      </label>
    </Modal>
  );
}

function SecretDialog({
  state,
  onClose,
}: {
  state: { title: string; message?: string; secret?: string };
  onClose: (value: unknown) => void;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!state.secret) return;
    if (await copyText(state.secret)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <Modal
      open
      onClose={() => onClose(undefined)}
      title={state.title}
      footer={
        <>
          <Button type="button" variant="subtle" onClick={() => void onCopy()}>
            {copied ? (
              <>
                <CheckIcon width={14} height={14} />
                {t('common.copied')}
              </>
            ) : (
              t('common.copy')
            )}
          </Button>
          <Button type="button" variant="primary" onClick={() => onClose(undefined)}>
            {t('common.close')}
          </Button>
        </>
      }
    >
      {state.message && <p className="mb-3 text-sm leading-relaxed text-text-dim">{state.message}</p>}
      <pre
        className={cx(
          'scroll-thin max-h-40 overflow-auto rounded-lg border border-border bg-surface-2 p-3',
          'font-mono text-xs leading-relaxed text-text',
        )}
      >
        {state.secret}
      </pre>
      <p className="mt-2 text-2xs text-text-faint">{t('webhooks.secret_copy_hint')}</p>
    </Modal>
  );
}
