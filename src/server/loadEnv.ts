import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Load `.env` from the project root (not process.cwd — Vite/Hono may run elsewhere). */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

config({ path: resolve(projectRoot, '.env') });
config({ path: resolve(projectRoot, '.env.local'), override: true });
