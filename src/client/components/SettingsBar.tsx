import { useT } from '../i18n';
import { usePrefs } from '../store/prefs';
import { useRequestStore } from '../store/requestStore';
import { Toggle } from './ui';

export function SettingsBar() {
  const { t } = useT();
  const spec = useRequestStore((s) => s.spec);
  const setTimeout = useRequestStore((s) => s.setTimeout);
  const setFollowRedirects = useRequestStore((s) => s.setFollowRedirects);
  const setUseProxy = useRequestStore((s) => s.setUseProxy);
  const saveHistory = usePrefs((s) => s.saveHistory);
  const setSaveHistory = usePrefs((s) => s.setSaveHistory);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border bg-surface/40 px-4 py-2.5">
      <label className="flex items-center gap-2 text-xs text-text-dim">
        <span className="font-medium">{t('settings.timeout')}</span>
        <input
          type="number"
          min={1000}
          step={1000}
          value={spec.timeoutMs}
          onChange={(e) => setTimeout(Math.max(1000, Number(e.target.value) || 1000))}
          className="af-input w-24 px-2 py-1 font-mono text-xs"
        />
        <span className="text-text-faint">ms</span>
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-text-dim">
        <Toggle checked={spec.followRedirects} onChange={setFollowRedirects} label={t('settings.follow_redirects')} />
        <span className="font-medium">{t('settings.follow_redirects')}</span>
      </label>

      <div className="flex items-center gap-2 text-xs text-text-dim">
        <Toggle checked={spec.useProxy} onChange={setUseProxy} label={t('settings.use_proxy')} />
        <span className="font-medium">{t('settings.use_proxy')}</span>
        <span className="hidden text-text-faint sm:inline">
          {spec.useProxy ? t('settings.proxy_on_hint') : t('settings.proxy_off_hint')}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-dim">
        <Toggle checked={saveHistory} onChange={setSaveHistory} label={t('settings.save_history')} />
        <span className="font-medium">{t('settings.save_history')}</span>
        <span className="hidden text-text-faint sm:inline">
          {saveHistory ? t('settings.save_history_hint') : t('settings.anonymous_hint')}
        </span>
      </div>
    </div>
  );
}
