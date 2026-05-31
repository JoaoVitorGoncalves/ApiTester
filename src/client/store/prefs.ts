import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type Lang = 'pt' | 'en';

const THEME_KEY = 'apiflash.theme';
const LANG_KEY = 'apiflash.lang';

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function readLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'pt' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/** Apply the saved theme before React mounts to avoid a flash. */
export function applyStoredTheme(): void {
  document.documentElement.setAttribute('data-theme', readTheme());
  document.documentElement.lang = readLang() === 'pt' ? 'pt-BR' : 'en';
}

interface PrefsState {
  theme: Theme;
  lang: Lang;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  theme: readTheme(),
  lang: readLang(),
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
}));
