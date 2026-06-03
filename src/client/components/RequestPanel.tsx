import { useState } from 'react';
import { useT } from '../i18n';
import { useRequestStore } from '../store/requestStore';
import { AuthEditor } from './AuthEditor';
import { BodyEditor } from './BodyEditor';
import { CurlPreview } from './CurlPreview';
import { ImportCurlModal } from './ImportCurlModal';
import { KeyValueEditor } from './KeyValueEditor';
import { RequestBar } from './RequestBar';
import { SaveRequestModal } from './SaveRequestModal';
import { SettingsBar } from './SettingsBar';
import { CountBadge, Tabs } from './ui';

type TabId = 'params' | 'headers' | 'auth' | 'body' | 'curl';

function countRows(rows: { key: string; enabled: boolean }[]): number {
  return rows.filter((r) => r.enabled && r.key.trim() !== '').length;
}

export function RequestPanel() {
  const { t } = useT();
  const [tab, setTab] = useState<TabId>('params');
  const [importOpen, setImportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const params = useRequestStore((s) => s.spec.params);
  const headers = useRequestStore((s) => s.spec.headers);
  const auth = useRequestStore((s) => s.spec.auth);
  const body = useRequestStore((s) => s.spec.body);
  const setParams = useRequestStore((s) => s.setParams);
  const setHeaders = useRequestStore((s) => s.setHeaders);

  const paramCount = countRows(params);
  const headerCount = countRows(headers);
  const authActive = auth.kind !== 'none';
  const bodyActive = body.mode !== 'none';

  return (
    <section className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
      <RequestBar onOpenImport={() => setImportOpen(true)} onOpenSave={() => setSaveOpen(true)} />

      <div className="px-3">
        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'params', label: <>{t('tab.params')}<CountBadge count={paramCount} /></> },
            { id: 'headers', label: <>{t('tab.headers')}<CountBadge count={headerCount} /></> },
            { id: 'auth', label: <>{t('tab.auth')}{authActive && <CountBadge count={1} />}</> },
            { id: 'body', label: <>{t('tab.body')}{bodyActive && <CountBadge count={1} />}</> },
            { id: 'curl', label: t('tab.curl') },
          ]}
        />
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'params' && (
          <KeyValueEditor rows={params} onChange={setParams} emptyHint={t('kv.empty_params')} />
        )}
        {tab === 'headers' && (
          <KeyValueEditor rows={headers} onChange={setHeaders} emptyHint={t('kv.empty_headers')} />
        )}
        {tab === 'auth' && <AuthEditor />}
        {tab === 'body' && <BodyEditor />}
        {tab === 'curl' && <CurlPreview />}
      </div>

      <SettingsBar />

      <ImportCurlModal open={importOpen} onClose={() => setImportOpen(false)} />
      <SaveRequestModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </section>
  );
}
