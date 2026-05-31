import { useCallback } from 'react';
import { usePrefs, type Lang } from '../store/prefs';
import { en, type TranslationKey } from './en';
import { pt } from './pt';

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, pt };

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: TranslationKey, params?: Record<string, string | number>): string {
  let value: string = dictionaries[lang][key] ?? en[key] ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement));
    }
  }
  return value;
}

/** Hook returning a `t()` bound to the active language. Re-renders on change. */
export function useT(): { t: Translate; lang: Lang } {
  const lang = usePrefs((s) => s.lang);
  const t = useCallback<Translate>(
    (key, params) => translate(lang, key, params),
    [lang],
  );
  return { t, lang };
}

export type { TranslationKey };
