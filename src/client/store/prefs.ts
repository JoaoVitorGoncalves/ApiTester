import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type Lang = 'pt' | 'en';

const THEME_KEY = 'apiflash.theme';
const LANG_KEY = 'apiflash.lang';
const SAVE_HISTORY_KEY = 'apiflash.saveHistory';

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function readLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'pt' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

function readSaveHistory(): boolean {
  const stored = localStorage.getItem(SAVE_HISTORY_KEY);
  if (stored === '0' || stored === 'false') return false;
  return true;
}

/** Apply the saved theme before React mounts to avoid a flash. */
export function applyStoredTheme(): void {
  document.documentElement.setAttribute('data-theme', readTheme());
  document.documentElement.lang = readLang() === 'pt' ? 'pt-BR' : 'en';
}

interface PrefsState {
  theme: Theme;
  lang: Lang;
  saveHistory: boolean;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
  setSaveHistory: (value: boolean) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  theme: readTheme(),
  lang: readLang(),
  saveHistory: readSaveHistory(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },
  setLang: (lang) => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    set({ lang });
  },
  setSaveHistory: (value) => {
    localStorage.setItem(SAVE_HISTORY_KEY, value ? '1' : '0');
    set({ saveHistory: value });
  },
}));
