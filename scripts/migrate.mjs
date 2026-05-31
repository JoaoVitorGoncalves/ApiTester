import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

function env(name, fallback) {
  const v = process.env[name];
  return v !== undefined && v !== '' ? v : fallback;
}

async function main() {
  const config = {
    host: env('MYSQL_HOST', '127.0.0.1'),
    port: Number(env('MYSQL_PORT', '3306')),
    user: env('MYSQL_USER', 'root'),
    password: env('MYSQL_PASSWORD', ''),
    database: env('MYSQL_DATABASE', 'apiflash'),
    multipleStatements: true,
  };

  const conn = await createConnection(config);
  console.log(`Connected to MySQL at ${config.host}:${config.port}/${config.database}`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [appliedRows] = await conn.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map((r) => r.version));

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    console.log(`apply ${file}...`);
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
    console.log(`done ${file}`);
  }

  await conn.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
