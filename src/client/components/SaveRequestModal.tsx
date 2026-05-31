import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { useLibrary } from '../store/library';
import { useRequestStore } from '../store/requestStore';
import { Button, Modal, Select, TextInput } from './ui';

const NEW = '__new__';

export function SaveRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const spec = useRequestStore((s) => s.spec);
  const collections = useLibrary((s) => s.collections);
  const createCollection = useLibrary((s) => s.createCollection);
  const saveRequest = useLibrary((s) => s.saveRequest);

  const [name, setName] = useState('');
  const [target, setTarget] = useState<string>(NEW);
  const [newCollection, setNewCollection] = useState('');

  useEffect(() => {
    if (open) {
      const fallbackName = spec.url ? spec.url.replace(/^https?:\/\//, '').slice(0, 48) : '';
      setName(fallbackName);
      setTarget(collections[0]?.id ?? NEW);
      setNewCollection('');
    }
  }, [open, spec.url, collections]);

  async function onSave() {
    let collectionId = target;
    if (target === NEW) {
      const created = await createCollection(newCollection || t('common.untitled'));
      collectionId = created.id;
    }
    await saveRequest(collectionId, name || t('common.untitled'), spec);
    onClose();
  }

  const canSave = target !== NEW || newCollection.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('request.save_title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void onSave()} disabled={!canSave}>
            {t('request.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wide text-text-faint">
            {t('request.save_name')}
          </span>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wide text-text-faint">
            {t('request.save_target')}
          </span>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW}>{t('request.save_new')}</option>
          </Select>
        </label>

        {target === NEW && (
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-faint">
              {t('sidebar.collection_name')}
            </span>
            <TextInput
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              placeholder={t('sidebar.collection_name')}
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
