import type { Auth } from '@core/types';
import { useT } from '../i18n';
import { useRequestStore } from '../store/requestStore';
import { Select, TextInput, cx } from './ui';

type AuthKind = Auth['kind'];

export function AuthEditor() {
  const { t } = useT();
  const auth = useRequestStore((s) => s.spec.auth);
  const setAuth = useRequestStore((s) => s.setAuth);

  function changeKind(kind: AuthKind) {
    switch (kind) {
      case 'bearer':
        setAuth({ kind: 'bearer', token: auth.kind === 'bearer' ? auth.token : '' });
        break;
      case 'basic':
        setAuth({
          kind: 'basic',
          username: auth.kind === 'basic' ? auth.username : '',
          password: auth.kind === 'basic' ? auth.password : '',
        });
        break;
      case 'apiKey':
        setAuth({
          kind: 'apiKey',
          name: auth.kind === 'apiKey' ? auth.name : 'X-API-Key',
          value: auth.kind === 'apiKey' ? auth.value : '',
          in: auth.kind === 'apiKey' ? auth.in : 'header',
        });
        break;
      default:
        setAuth({ kind: 'none' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Labeled label={t('auth.type')}>
        <div className="relative max-w-xs">
          <Select value={auth.kind} onChange={(e) => changeKind(e.target.value as AuthKind)}>
            <option value="none">{t('auth.none')}</option>
            <option value="bearer">{t('auth.bearer')}</option>
            <option value="basic">{t('auth.basic')}</option>
            <option value="apiKey">{t('auth.apikey')}</option>
          </Select>
          <Chevron />
        </div>
      </Labeled>

      {auth.kind === 'none' && <p className="text-xs text-text-faint">{t('auth.none_hint')}</p>}

      {auth.kind === 'bearer' && (
        <Labeled label={t('auth.token')}>
          <TextInput
            mono
            value={auth.token}
            onChange={(e) => setAuth({ kind: 'bearer', token: e.target.value })}
            placeholder="eyJhbGciOi..."
            autoComplete="off"
          />
        </Labeled>
      )}

      {auth.kind === 'basic' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label={t('auth.username')}>
            <TextInput
              value={auth.username}
              onChange={(e) => setAuth({ ...auth, username: e.target.value })}
              autoComplete="off"
            />
          </Labeled>
          <Labeled label={t('auth.password')}>
            <TextInput
              type="password"
              value={auth.password}
              onChange={(e) => setAuth({ ...auth, password: e.target.value })}
              autoComplete="off"
            />
          </Labeled>
        </div>
      )}

      {auth.kind === 'apiKey' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label={t('auth.key_name')}>
            <TextInput mono value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })} />
          </Labeled>
          <Labeled label={t('auth.key_value')}>
            <TextInput mono value={auth.value} onChange={(e) => setAuth({ ...auth, value: e.target.value })} autoComplete="off" />
          </Labeled>
          <Labeled label={t('auth.add_to')}>
            <div className="relative">
              <Select value={auth.in} onChange={(e) => setAuth({ ...auth, in: e.target.value as 'header' | 'query' })}>
                <option value="header">{t('auth.in_header')}</option>
                <option value="query">{t('auth.in_query')}</option>
              </Select>
              <Chevron />
            </div>
          </Labeled>
        </div>
      )}
    </div>
  );
}

function Labeled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-2xs font-semibold uppercase tracking-wide text-text-faint">{label}</span>
      {children}
    </label>
  );
}

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
