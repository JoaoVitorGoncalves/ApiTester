const WORKSPACE_KEY = 'apiflash.workspaceId';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Stable workspace id per browser until real auth links accounts. */
export function getOrCreateWorkspaceId(): string {
  const stored = localStorage.getItem(WORKSPACE_KEY);
  if (stored && isUuid(stored)) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(WORKSPACE_KEY, id);
  return id;
}
