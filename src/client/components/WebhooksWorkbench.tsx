import { useCallback, useEffect } from 'react';
import type { WebhookEndpoint } from '@core/types';
import { webhookInboxUrl } from '../api/webhooks';
import { useT } from '../i18n';
import { useLibrary } from '../store/library';
import { useWebhooks } from '../store/webhooks';
import { WebhookNetworkTutorial, WebhookUrlCopy } from './WebhookTutorial';
import { WebhookResponseBodyEditor } from './WebhookResponseBodyEditor';
import { Button, Select, Toggle } from './ui';

const RESPONSE_STATUS_OPTIONS = [200, 204, 400, 404, 500] as const;

export function WebhooksWorkbench() {
  const { t } = useT();
  const dbStatus = useLibrary((s) => s.dbStatus);
  const selectedWebhookId = useWebhooks((s) => s.selectedWebhookId);
  const endpoints = useWebhooks((s) => s.endpoints);
  const selected = endpoints.find((e) => e.id === selectedWebhookId) ?? null;

  useEffect(() => {
    if (endpoints.length === 0 || selectedWebhookId) return;
    void useWebhooks.getState().selectWebhook(endpoints[0].id);
  }, [endpoints, selectedWebhookId]);

  if (dbStatus !== 'ok') {
    return (
      <section className="flex min-h-0 flex-col border-b border-border xl:border-b-0 xl:border-r">
        <WorkbenchHeader />
        <p className="px-4 py-8 text-center text-xs text-text-faint">{t('sidebar.db_unavailable')}</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col border-b border-border xl:border-b-0 xl:border-r">
      <WorkbenchHeader />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
        <WebhookNetworkTutorial />
        {selected ? (
          <EndpointSettings endpoint={selected} />
        ) : (
          <p className="mt-6 py-8 text-center text-xs text-text-faint">{t('webhooks.pick_endpoint')}</p>
        )}
      </div>
    </section>
  );
}

function WorkbenchHeader() {
  const { t } = useT();
  return (
    <header className="border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold text-text">{t('webhooks.config_title')}</h2>
      <p className="mt-0.5 text-2xs text-text-faint">{t('webhooks.config_subtitle')}</p>
    </header>
  );
}

function EndpointSettings({ endpoint }: { endpoint: WebhookEndpoint }) {
  const { t } = useT();
  const updateEndpointSettings = useWebhooks((s) => s.updateEndpointSettings);
  const regenerateSecret = useWebhooks((s) => s.regenerateSecret);
  const clearSecret = useWebhooks((s) => s.clearSecret);

  const inboxUrl = webhookInboxUrl(endpoint.id);
  const is204 = (endpoint.responseStatus ?? 200) === 204;

  const onStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const status = Number(e.target.value);
      const patch: { responseStatus: number; responseBody?: null } = { responseStatus: status };
      if (status === 204) patch.responseBody = null;
      void updateEndpointSettings(endpoint.id, patch);
    },
    [endpoint.id, updateEndpointSettings],
  );

  const onEnabledChange = useCallback(
    (enabled: boolean) => {
      void updateEndpointSettings(endpoint.id, { enabled });
    },
    [endpoint.id, updateEndpointSettings],
  );

  const onBodySave = useCallback(
    (body: string | null) => {
      void updateEndpointSettings(endpoint.id, { responseBody: body });
    },
    [endpoint.id, updateEndpointSettings],
  );

  const onRegenerateSecret = useCallback(() => {
    void regenerateSecret(endpoint.id).then(({ secret }) => {
      if (secret) window.alert(`${t('webhooks.secret_created')}\n\n${secret}`);
    });
  }, [endpoint.id, regenerateSecret, t]);

  const onClearSecret = useCallback(() => {
    if (!window.confirm(t('webhooks.clear_secret_confirm'))) return;
    void clearSecret(endpoint.id);
  }, [clearSecret, endpoint.id, t]);

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-text">{endpoint.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-text-faint">{t('webhooks.enabled_label')}</span>
          <Toggle checked={endpoint.enabled} onChange={onEnabledChange} label={t('webhooks.enabled_label')} />
        </div>
      </div>

      <Field label={t('webhooks.inbox_url')}>
        <p className="break-all font-mono text-2xs text-text-dim">{inboxUrl}</p>
        <div className="mt-1.5">
          <WebhookUrlCopy webhookId={endpoint.id} />
        </div>
      </Field>

      <Field label={t('webhooks.secret')}>
        <p className="text-xs text-text-dim">
          {endpoint.hasSecret ? t('webhooks.secret_configured') : t('webhooks.secret_none')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="subtle" className="text-xs" onClick={onRegenerateSecret}>
            {t('webhooks.regenerate_secret')}
          </Button>
          {endpoint.hasSecret && (
            <Button type="button" variant="danger" className="text-xs" onClick={onClearSecret}>
              {t('webhooks.clear_secret')}
            </Button>
          )}
        </div>
      </Field>

      <Field label={t('webhooks.response_status')}>
        <Select
          value={String(endpoint.responseStatus ?? 200)}
          onChange={onStatusChange}
          className="w-full max-w-[8rem] text-sm"
        >
          {RESPONSE_STATUS_OPTIONS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-2xs text-text-faint">{t('webhooks.response_status_hint')}</p>
      </Field>

      <Field label={t('webhooks.response_body')}>
        <WebhookResponseBodyEditor
          value={endpoint.responseBody}
          disabled={is204}
          onSave={onBodySave}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-text-dim">{label}</span>
      {children}
    </div>
  );
}
