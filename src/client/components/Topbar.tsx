import { useT } from '../i18n';
import { usePrefs, type Lang } from '../store/prefs';
import { BoltIcon, MoonIcon, SunIcon } from './icons';
import { IconButton, cx } from './ui';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { t } = useT();
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const lang = usePrefs((s) => s.lang);
  const setLang = usePrefs((s) => s.setLang);

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface/60 px-3 py-2.5 backdrop-blur">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-2 hover:text-text lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <BoltIcon width={16} height={16} />
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-tight text-text">apiFlash</span>
          <span className="hidden text-2xs text-text-faint sm:inline">{t('app.tagline')}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5" role="group" aria-label={t('topbar.language')}>
          {(['pt', 'en'] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cx(
                'rounded-md px-2 py-1 text-2xs font-semibold uppercase transition-colors',
                lang === code ? 'bg-accent-soft text-accent' : 'text-text-faint hover:text-text-dim',
              )}
            >
              {code}
            </button>
          ))}
        </div>
        <IconButton label={t('topbar.theme')} onClick={toggleTheme}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
      </div>
    </header>
  );
}
