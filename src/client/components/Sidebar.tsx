import { useState } from 'react';
import type { RequestSpec } from '@core/types';
import { useT } from '../i18n';
import { useLibrary } from '../store/library';
import { useRequestStore } from '../store/requestStore';
import { relativeTime, statusColor } from '../lib/format';
import { MethodBadge } from './MethodBadge';
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from './icons';
import { CountBadge, Tabs, cx } from './ui';

type TabId = 'history' | 'collections';

export function Sidebar() {
  const { t } = useT();
  const [tab, setTab] = useState<TabId>('history');
  const history = useLibrary((s) => s.history);
  const collections = useLibrary((s) => s.collections);
  const dbStatus = useLibrary((s) => s.dbStatus);

  return (
    <aside className="flex min-h-0 w-full flex-col bg-surface/40">
      <div className="px-3 pt-2">
        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'history', label: <>{t('sidebar.history')}<CountBadge count={history.length} /></> },
            { id: 'collections', label: <>{t('sidebar.collections')}<CountBadge count={collections.length} /></> },
          ]}
        />
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        {tab === 'history' ? <HistoryList /> : <CollectionsList />}
      </div>
      <p className="border-t border-border px-3 py-2 text-2xs leading-snug text-text-faint">
        {dbStatus === 'ok' ? t('sidebar.server_storage') : t('sidebar.db_unavailable')}
      </p>
    </aside>
  );
}

function HistoryList() {
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
          onClick={() => {
            if (window.confirm(t('sidebar.clear_history_confirm'))) void clearAll();
          }}
          className="text-2xs font-medium text-text-faint transition-colors hover:text-danger"
        >
          {t('sidebar.clear')}
        </button>
      </div>
      {history.map((entry) => (
        <button
          key={entry.id}
          onClick={() => loadFromHistory(entry)}
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
          <span className="w-10 shrink-0 text-right text-2xs text-text-faint">
            {relativeTime(entry.at, lang)}
          </span>
        </button>
      ))}
    </div>
  );
}

function CollectionsList() {
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
        collections.map((c) => <CollectionItem key={c.id} id={c.id} />)
      )}
    </div>
  );
}

function CollectionItem({ id }: { id: string }) {
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
          onClick={() => {
            const next = window.prompt(t('sidebar.rename'), collection.name);
            if (next != null) void renameCollection(id, next);
          }}
          className="hidden h-6 w-6 items-center justify-center rounded text-text-faint hover:text-text group-hover:flex"
        >
          <PencilIcon width={13} height={13} />
        </button>
        <button
          type="button"
          aria-label={t('sidebar.delete')}
          title={t('sidebar.delete')}
          onClick={() => void deleteCollection(id)}
          className="hidden h-6 w-6 items-center justify-center rounded text-text-faint hover:text-danger group-hover:flex"
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
              onLoad={() => loadSpec(req.spec)}
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
        className="hidden h-5 w-5 items-center justify-center rounded text-text-faint hover:text-danger group-hover:flex"
      >
        <TrashIcon width={12} height={12} />
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-2 py-6 text-center text-xs leading-relaxed text-text-faint">{text}</p>;
}
