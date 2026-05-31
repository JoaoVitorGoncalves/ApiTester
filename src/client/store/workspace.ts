const GUEST_WORKSPACE_KEY = 'apiflash.guestWorkspaceId';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Ephemeral workspace per browser tab session (guest mode). */
export function getOrCreateGuestWorkspaceId(): string {
  const stored = sessionStorage.getItem(GUEST_WORKSPACE_KEY);
  if (stored && isUuid(stored)) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(GUEST_WORKSPACE_KEY, id);
  return id;
}

export function clearGuestWorkspaceId(): void {
  sessionStorage.removeItem(GUEST_WORKSPACE_KEY);
}
