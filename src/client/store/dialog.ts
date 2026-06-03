import { create } from 'zustand';

export type DialogKind = 'confirm' | 'prompt' | 'alert' | 'secret';

export interface DialogState {
  kind: DialogKind;
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  secret?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogStore {
  open: boolean;
  state: DialogState | null;
  resolve: ((value: unknown) => void) | null;
  show: (state: DialogState) => Promise<unknown>;
  close: (value: unknown) => void;
}

export const useDialog = create<DialogStore>((set, get) => ({
  open: false,
  state: null,
  resolve: null,

  show: (state) =>
    new Promise((resolve) => {
      set({ open: true, state, resolve });
    }),

  close: (value) => {
    const { resolve } = get();
    resolve?.(value);
    set({ open: false, state: null, resolve: null });
  },
}));
