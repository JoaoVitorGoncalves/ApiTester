import { FormEvent, useState } from 'react';
import { validateAuthInput } from '@core/authValidation';
import { BoltIcon, MoonIcon, SunIcon } from '../components/icons';
import { Button, TextInput, cx } from '../components/ui';
import { useT } from '../i18n';
import { useAuth } from '../store/auth';
import { usePrefs, type Lang } from '../store/prefs';

type Tab = 'login' | 'register';

export function AuthPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const enterGuest = useAuth((s) => s.enterGuest);
  const serverError = useAuth((s) => s.error);
  const clearError = useAuth((s) => s.clearError);

  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const lang = usePrefs((s) => s.lang);
  const setLang = usePrefs((s) => s.setLang);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const validationError = validateAuthInput({ name, password });
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    setSubmitting(true);
    if (tab === 'login') await login(name, password);
    else await register(name, password);
    setSubmitting(false);
  }

  const displayError = localError ?? serverError;

  return (
    <div className="relative flex min-h-[100dvh] animate-fade-in-soft flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-56 w-56 rounded-full bg-accent/5 blur-3xl"
        aria-hidden
      />

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5" role="group" aria-label={t('topbar.language')}>
          {(['pt', 'en'] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cx(
                'af-interactive rounded-md px-2 py-1 text-2xs font-semibold uppercase',
                lang === code ? 'bg-accent-soft text-accent' : 'text-text-faint hover:text-text-dim',
              )}
            >
              {code}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t('topbar.theme')}
          className="af-interactive inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-2 hover:text-text"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/20">
            <BoltIcon width={22} height={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">apiFlash</h1>
            <p className="text-xs text-text-faint">{t('signin.subtitle')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border-strong bg-surface/80 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="af-stagger">
          <div className="mb-6 flex rounded-lg border border-border bg-surface-2 p-0.5">
            {(['login', 'register'] as Tab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setLocalError(null);
                  clearError();
                }}
                className={cx(
                  'af-interactive flex-1 rounded-md py-2 text-sm font-semibold',
                  tab === id ? 'bg-accent text-accent-fg' : 'text-text-dim hover:text-text',
                )}
              >
                {t(id === 'login' ? 'signin.login' : 'signin.register')}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-dim">{t('signin.name')}</span>
              <TextInput
                name="username"
                autoComplete="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="dev_user"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-dim">{t('signin.password')}</span>
              <TextInput
                name="password"
                type="password"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {displayError && (
              <p className="animate-fade-in rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
                {displayError}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting
                ? t('signin.submitting')
                : t(tab === 'login' ? 'signin.login' : 'signin.register')}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <Button type="button" variant="ghost" className="w-full" onClick={() => enterGuest()}>
              {t('signin.guest')}
            </Button>
            <p className="mt-2 text-center text-2xs leading-relaxed text-text-faint">{t('signin.guest_hint')}</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
