import { create } from 'zustand';
import { loginApi, meApi, registerApi, type AuthUser } from '../api/auth';
import { ApiError } from '../api/library';
import { clearGuestWorkspaceId, getOrCreateGuestWorkspaceId } from './workspace';

export type AuthMode = 'unknown' | 'guest' | 'user';

const TOKEN_KEY = 'apiflash.authToken';
const GUEST_MODE_KEY = 'apiflash.guestMode';

interface AuthState {
  mode: AuthMode;
  token: string | null;
  user: AuthUser | null;
  workspaceId: string | null;
  bootstrapping: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (name: string, password: string) => Promise<void>;
  register: (name: string, password: string) => Promise<void>;
  enterGuest: () => void;
  logout: () => void;
  clearError: () => void;
}

function applyAuth(
  set: (partial: Partial<AuthState>) => void,
  data: { token: string; user: AuthUser; workspaceId: string },
) {
  localStorage.setItem(TOKEN_KEY, data.token);
  sessionStorage.removeItem(GUEST_MODE_KEY);
  clearGuestWorkspaceId();
  set({
    mode: 'user',
    token: data.token,
    user: data.user,
    workspaceId: data.workspaceId,
    error: null,
  });
}

export const useAuth = create<AuthState>((set, get) => ({
  mode: 'unknown',
  token: null,
  user: null,
  workspaceId: null,
  bootstrapping: true,
  error: null,

  bootstrap: async () => {
    if (!get().bootstrapping && get().mode !== 'unknown') return;
    set({ bootstrapping: true, error: null });

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const data = await meApi(token);
        set({
          mode: 'user',
          token,
          user: data.user,
          workspaceId: data.workspaceId,
          bootstrapping: false,
          error: null,
        });
        return;
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    if (sessionStorage.getItem(GUEST_MODE_KEY) === '1') {
      const guestWs = getOrCreateGuestWorkspaceId();
      set({
        mode: 'guest',
        token: null,
        user: null,
        workspaceId: guestWs,
        bootstrapping: false,
      });
      return;
    }

    set({
      mode: 'unknown',
      token: null,
      user: null,
      workspaceId: null,
      bootstrapping: false,
    });
  },

  login: async (name, password) => {
    set({ error: null });
    try {
      const data = await loginApi(name, password);
      applyAuth(set, data);
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Login failed.' });
    }
  },

  register: async (name, password) => {
    set({ error: null });
    try {
      const data = await registerApi(name, password);
      applyAuth(set, data);
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Registration failed.' });
    }
  },

  enterGuest: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.setItem(GUEST_MODE_KEY, '1');
    const guestWs = getOrCreateGuestWorkspaceId();
    set({
      mode: 'guest',
      token: null,
      user: null,
      workspaceId: guestWs,
      error: null,
      bootstrapping: false,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(GUEST_MODE_KEY);
    clearGuestWorkspaceId();
    set({
      mode: 'unknown',
      token: null,
      user: null,
      workspaceId: null,
      error: null,
      bootstrapping: false,
    });
  },

  clearError: () => set({ error: null }),
}));
