const NAME_RE = /^[a-zA-Z0-9_-]{3,64}$/;

export interface AuthInput {
  name: string;
  password: string;
}

export function validateAuthInput(input: AuthInput): string | null {
  const name = input.name?.trim() ?? '';
  const password = input.password ?? '';
  if (!NAME_RE.test(name)) {
    return 'Name must be 3–64 characters (letters, numbers, _ and - only).';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
}

export function normalizeAuthName(name: string): string {
  return name.trim();
}
