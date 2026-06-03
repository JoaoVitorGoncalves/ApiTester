import { useDialog, type DialogState } from '../store/dialog';

function show<T>(state: DialogState): Promise<T> {
  return useDialog.getState().show(state) as Promise<T>;
}

export function confirmDialog(
  message: string,
  options?: { title?: string; confirmLabel?: string; danger?: boolean },
): Promise<boolean> {
  return show<boolean>({
    kind: 'confirm',
    title: options?.title ?? '',
    message,
    confirmLabel: options?.confirmLabel,
    danger: options?.danger,
  });
}

export function promptDialog(
  title: string,
  defaultValue = '',
  options?: { label?: string },
): Promise<string | null> {
  return show<string | null>({
    kind: 'prompt',
    title,
    label: options?.label,
    defaultValue,
  });
}

export function alertDialog(title: string, message: string): Promise<void> {
  return show<void>({ kind: 'alert', title, message }).then(() => undefined);
}

export function secretDialog(title: string, message: string, secret: string): Promise<void> {
  return show<void>({ kind: 'secret', title, message, secret }).then(() => undefined);
}
