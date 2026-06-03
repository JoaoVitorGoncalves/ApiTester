import { useEffect, useState } from 'react';
import type { RequestSpec, WebhookEndpoint } from '@core/types';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../store/auth';
import { useLibrary } from '../store/library';
import { useWebhooks } from '../store/webhooks';
import { useRequestStore } from '../store/requestStore';
import { confirmDialog, promptDialog, secretDialog } from '../lib/dialog';
import { relativeTime, statusColor } from '../lib/format';
import { MethodBadge } from './MethodBadge';
import { WebhookUrlCopy } from './WebhookTutorial';
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from './icons';
import { CountBadge, Tabs, cx } from './ui';

type TabId = 'history' | 'collections' | 'webhooks';

const rowActionBtn =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-faint hover:text-text max-lg:flex lg:hidden lg:group-hover:inline-flex';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  const [tab, setTab] = useState<TabId>('history');
  const history = useLibrary((s) => s.history);
  const collections = useLibrary((s) => s.collections);
  const endpoints = useWebhooks((s) => s.endpoints);
  const dbStatus = useLibrary((s) => s.dbStatus);
  const authMode = useAuth((s) => s.mode);
  const setPanelActive = useWebhooks((s) => s.setPanelActive);

  useEffect(() => {
    setPanelActive(tab === 'webhooks');
  }, [tab, setPanelActive]);

  const footerKey: TranslationKey =
    dbStatus === 'ok'
      ? authMode === 'guest'
        ? 'sidebar.guest_session'
        : 'sidebar.server_storage'
      : 'sidebar.db_unavailable';

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-surface/40">
      <div className="shrink-0 px-2 pt-2 sm:px-3">
        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'history', label: <>{t('sidebar.history')}<CountBadge count={history.length} /></> },
            { id: 'collections', label: <>{t('sidebar.collections')}<CountBadge count={collections.length} /></> },
            { id: 'webhooks', label: <>{t('sidebar.webhooks')}<CountBadge count={endpoints.length} /></> },
          ]}
        />
      </div>
      <div
        className={cx(
          'min-h-0 flex-1',
          tab === 'webhooks' ? 'flex flex-col overflow-hidden' : 'scroll-thin overflow-y-auto p-2',
        )}
      >
        {tab === 'history' ? (
          <HistoryList onNavigate={onNavigate} />
        ) : tab === 'collections' ? (
          <CollectionsList onNavigate={onNavigate} />
        ) : (
          <WebhooksSidebar onNavigate={onNavigate} />
        )}
      </div>
      <p className="shrink-0 border-t border-border px-3 py-2 text-2xs leading-snug text-text-faint">{t(footerKey)}</p>
    </aside>
  );
}

function HistoryList({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useT();
  const history = useLibrary((s) => s.history);
  const clearAll = useLibrary((s) => s.clearAllHistory);
  const loadFromHistory = useRequestStore((s) => s.loadFromHistory);
  const dbStatus = useLibrary((s) => s.dbStatus);

  if (dbStatus !== 'ok') {
    return <Empty text={t('sidebar.db_unavailable')} />;
  }

  if (history.length === 0) {
    return <Empty text={t('sidebar.empty_history')} />;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end px-1 pb-1">
        <button
          type="button"
          onClick={async () => {
            const ok = await confirmDialog(t('sidebar.clear_history_confirm'), {
              title: t('sidebar.clear'),
              danger: true,
              confirmLabel: t('sidebar.clear'),
            });
            if (ok) void clearAll();
          }}
          className="text-2xs font-medium text-text-faint transition-colors hover:text-danger"
        >
          {t('sidebar.clear')}
        </button>
      </div>
      {history.map((entry) => (
        <button
          key={entry.id}
          onClick={() => {
            loadFromHistory(entry);
            onNavigate?.();
          }}
          title={entry.url}
          className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
        >
          <MethodBadge method={entry.method} className="w-12 shrink-0 text-right" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-dim group-hover:text-text">
            {entry.url.replace(/^https?:\/\//, '') || '—'}
          </span>
          <span className="shrink-0 font-mono text-2xs" style={{ color: statusColor(entry.status) }}>
            {entry.status}
          </span>
          <span className="hidden w-10 shrink-0 text-right text-2xs text-text-faint sm:inline">
            {relativeTime(entry.at, lang)}
          </span>
        </button>
      ))}
    </div>
  );
}

function CollectionsList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  const collections = useLibrary((s) => s.collections);
  const dbStatus = useLibrary((s) => s.dbStatus);

  if (dbStatus !== 'ok') {
    return <Empty text={t('sidebar.db_unavailable')} />;
  }
  const createCollection = useLibrary((s) => s.createCollection);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="px-1">
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) void createCollection(name.trim());
              setName('');
              setCreating(false);
            }}
            className="flex gap-1.5"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setCreating(false)}
              placeholder={t('sidebar.collection_name')}
              className="af-input px-2 py-1 text-xs"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <PlusIcon width={14} height={14} />
            {t('sidebar.new_collection')}
          </button>
        )}
      </div>

      {collections.length === 0 ? (
        <Empty text={t('sidebar.empty_collections')} />
      ) : (
        collections.map((c) => <CollectionItem key={c.id} id={c.id} onNavigate={onNavigate} />)
      )}
    </div>
  );
}

function CollectionItem({ id, onNavigate }: { id: string; onNavigate?: () => void }) {
  const { t } = useT();
  const collection = useLibrary((s) => s.collections.find((c) => c.id === id));
  const renameCollection = useLibrary((s) => s.renameCollection);
  const deleteCollection = useLibrary((s) => s.deleteCollection);
  const removeSaved = useLibrary((s) => s.removeSavedRequest);
  const loadSpec = useRequestStore((s) => s.loadSpec);
  const [open, setOpen] = useState(true);

  if (!collection) return null;
  const count = collection.requests.length;

  return (
    <div className="rounded-lg">
      <div className="group flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-surface-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronDownIcon
            width={14}
            height={14}
            className={cx('shrink-0 text-text-faint transition-transform', !open && '-rotate-90')}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text">{collection.name}</span>
          <span className="shrink-0 text-2xs text-text-faint">{count}</span>
        </button>
        <button
          type="button"
          aria-label={t('sidebar.rename')}
          title={t('sidebar.rename')}
          onClick={async () => {
            const next = await promptDialog(t('sidebar.rename'), collection.name, {
              label: t('sidebar.collection_name'),
            });
            if (next != null) void renameCollection(id, next);
          }}
          className={rowActionBtn}
        >
          <PencilIcon width={13} height={13} />
        </button>
        <button
          type="button"
          aria-label={t('sidebar.delete')}
          title={t('sidebar.delete')}
          onClick={async () => {
            const ok = await confirmDialog(t('sidebar.delete_collection_confirm'), {
              title: t('sidebar.delete'),
              danger: true,
              confirmLabel: t('sidebar.delete'),
            });
            if (ok) void deleteCollection(id);
          }}
          className={cx(rowActionBtn, 'hover:text-danger')}
        >
          <TrashIcon width={13} height={13} />
        </button>
      </div>

      {open && count > 0 && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-1.5">
          {collection.requests.map((req) => (
            <SavedRow
              key={req.id}
              name={req.name}
              spec={req.spec}
              onLoad={() => {
                loadSpec(req.spec);
                onNavigate?.();
              }}
              onRemove={() => void removeSaved(id, req.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedRow({
  name,
  spec,
  onLoad,
  onRemove,
}: {
  name: string;
  spec: RequestSpec;
  onLoad: () => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-2">
      <button onClick={onLoad} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={spec.url}>
        <MethodBadge method={spec.method} className="w-10 shrink-0 text-right" />
        <span className="min-w-0 flex-1 truncate text-xs text-text-dim group-hover:text-text">{name}</span>
      </button>
      <button
        type="button"
        aria-label={t('sidebar.delete')}
        title={t('sidebar.delete')}
        onClick={onRemove}
        className={cx(rowActionBtn, 'h-5 w-5 hover:text-danger')}
      >
        <TrashIcon width={12} height={12} />
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-2 py-6 text-center text-xs leading-relaxed text-text-faint">{text}</p>;
}

function WebhooksSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  const dbStatus = useLibrary((s) => s.dbStatus);

  if (dbStatus !== 'ok') {
    return (
      <div className="p-2">
        <Empty text={t('sidebar.db_unavailable')} />
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col overflow-hidden border-b border-border">
        <p className="shrink-0 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-text-faint">
          {t('webhooks.endpoints')}
        </p>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
          <WebhooksEndpointsList onNavigate={onNavigate} />
        </div>
      </section>
      <section className="flex min-h-0 flex-col overflow-hidden">
        <WebhooksReceiptsList onNavigate={onNavigate} />
      </section>
    </div>
  );
}

function WebhooksEndpointsList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  const endpoints = useWebhooks((s) => s.endpoints);
  const selectedWebhookId = useWebhooks((s) => s.selectedWebhookId);
  const selectWebhook = useWebhooks((s) => s.selectWebhook);
  const createEndpoint = useWebhooks((s) => s.createEndpoint);
  const renameEndpoint = useWebhooks((s) => s.renameEndpoint);
  const toggleEndpoint = useWebhooks((s) => s.toggleEndpoint);
  const deleteEndpoint = useWebhooks((s) => s.deleteEndpoint);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [withSecret, setWithSecret] = useState(false);

  useEffect(() => {
    if (endpoints.length === 0 || selectedWebhookId) return;
    void selectWebhook(endpoints[0].id);
  }, [endpoints, selectedWebhookId, selectWebhook]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="px-1">
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              void createEndpoint(name.trim(), withSecret).then(({ secret }) => {
                if (secret) void secretDialog(t('webhooks.secret_created'), t('webhooks.secret_save_hint'), secret);
              });
              setName('');
              setWithSecret(false);
              setCreating(false);
            }}
            className="space-y-2 rounded-lg border border-border bg-surface/60 p-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('webhooks.name')}
              className="af-input w-full px-2 py-1 text-xs"
            />
            <label className="flex items-center gap-2 text-2xs text-text-dim">
              <input
                type="checkbox"
                checked={withSecret}
                onChange={(e) => setWithSecret(e.target.checked)}
                className="rounded border-border"
              />
              {t('webhooks.create_with_secret')}
            </label>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <PlusIcon width={14} height={14} />
            {t('webhooks.new')}
          </button>
        )}
      </div>

      {endpoints.length === 0 ? (
        <Empty text={t('webhooks.empty')} />
      ) : (
        endpoints.map((endpoint) => (
          <WebhookEndpointItem
            key={endpoint.id}
            endpoint={endpoint}
            selected={selectedWebhookId === endpoint.id}
            onSelect={() => {
              void selectWebhook(endpoint.id);
              onNavigate?.();
            }}
            onRename={async () => {
              const next = await promptDialog(t('sidebar.rename'), endpoint.name, {
                label: t('webhooks.name'),
              });
              if (next != null) void renameEndpoint(endpoint.id, next);
            }}
            onToggle={() => void toggleEndpoint(endpoint.id, !endpoint.enabled)}
            onDelete={async () => {
              const ok = await confirmDialog(t('webhooks.delete_confirm'), {
                title: t('sidebar.delete'),
                danger: true,
                confirmLabel: t('sidebar.delete'),
              });
              if (ok) void deleteEndpoint(endpoint.id);
            }}
          />
        ))
      )}
    </div>
  );
}

function WebhookEndpointItem({
  endpoint,
  selected,
  onSelect,
  onRename,
  onToggle,
  onDelete,
}: {
  endpoint: WebhookEndpoint;
  selected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  return (
    <div
      className={cx(
        'group rounded-lg px-1.5 py-1 transition-colors',
        selected ? 'bg-accent-soft/30' : 'hover:bg-surface-2',
      )}
    >
      <div className="flex items-center gap-1">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-text">
          {endpoint.name}
          {!endpoint.enabled && (
            <span className="ml-1 text-2xs font-normal text-text-faint">{t('webhooks.disabled')}</span>
          )}
        </button>
        <WebhookUrlCopy webhookId={endpoint.id} />
        <button
          type="button"
          aria-label={t('sidebar.rename')}
          onClick={onRename}
          className={rowActionBtn}
        >
          <PencilIcon width={13} height={13} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 px-1 text-2xs text-text-faint hover:text-text max-lg:inline lg:hidden lg:group-hover:inline"
        >
          {endpoint.enabled ? t('webhooks.disable') : t('webhooks.enable')}
        </button>
        <button
          type="button"
          aria-label={t('sidebar.delete')}
          onClick={onDelete}
          className={cx(rowActionBtn, 'hover:text-danger')}
        >
          <TrashIcon width={13} height={13} />
        </button>
      </div>
    </div>
  );
}

function WebhooksReceiptsList({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useT();
  const selectedWebhookId = useWebhooks((s) => s.selectedWebhookId);
  const receipts = useWebhooks((s) => s.receipts);
  const selectedReceipt = useWebhooks((s) => s.selectedReceipt);
  const selectReceipt = useWebhooks((s) => s.selectReceipt);
  const clearReceipts = useWebhooks((s) => s.clearReceipts);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <span className="text-2xs font-semibold uppercase tracking-wide text-text-faint">
          {t('webhooks.receipts_title')}
        </span>
        {selectedWebhookId && receipts.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              const ok = await confirmDialog(t('webhooks.clear_receipts_confirm'), {
                title: t('sidebar.clear'),
                danger: true,
                confirmLabel: t('sidebar.clear'),
              });
              if (ok) void clearReceipts(selectedWebhookId);
            }}
            className="text-2xs font-medium text-text-faint transition-colors hover:text-danger"
          >
            {t('sidebar.clear')}
          </button>
        )}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        {!selectedWebhookId ? (
          <Empty text={t('webhooks.receipts_pick_webhook')} />
        ) : receipts.length === 0 ? (
          <Empty text={t('webhooks.receipts_empty')} />
        ) : (
          <div className="flex flex-col gap-0.5">
            {receipts.map((receipt) => (
              <button
                key={receipt.id}
                type="button"
                onClick={() => {
                  void selectReceipt(receipt.id);
                  onNavigate?.();
                }}
                className={cx(
                  'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2',
                  selectedReceipt?.id === receipt.id && 'bg-surface-2',
                )}
              >
                <span className="w-10 shrink-0 text-right font-mono text-2xs font-bold uppercase text-accent">
                  {receipt.method}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-dim group-hover:text-text">
                  {receipt.path}
                </span>
                <span
                  className="shrink-0 font-mono text-2xs"
                  style={{ color: statusColor(receipt.responseStatus) }}
                >
                  {receipt.responseStatus}
                </span>
                <span className="hidden w-9 shrink-0 text-right text-2xs text-text-faint sm:inline">
                  {relativeTime(receipt.receivedAt, lang)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
