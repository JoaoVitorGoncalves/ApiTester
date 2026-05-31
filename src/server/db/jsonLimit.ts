const MAX_JSON_BYTES = 2 * 1024 * 1024;

export function assertJsonSize(value: unknown, label: string): void {
  const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (bytes > MAX_JSON_BYTES) {
    throw new Error(`${label} exceeds maximum size of ${MAX_JSON_BYTES} bytes.`);
  }
}
