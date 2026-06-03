import './server/loadEnv';
import { Hono } from 'hono';
import { isDbConfigured, pingDb } from './server/db/pool';
import collectionsRoutes from './server/routes/collections';
import historyRoutes from './server/routes/history';
import authRoutes from './server/routes/auth';
import webhooksRoutes from './server/routes/webhooks';
import { proxyHandler } from './server/proxy';

const app = new Hono();

app.get('/api/health', async (c) => {
  const dbConfigured = isDbConfigured();
  const db = dbConfigured ? ((await pingDb()) ? 'ok' : 'down') : 'not_configured';
  return c.json({ ok: true, name: 'apiflash', db });
});

app.post('/api/proxy', proxyHandler);

app.route('/api/auth', authRoutes);
app.route('/api/history', historyRoutes);
app.route('/api/collections', collectionsRoutes);
app.route('/api/webhooks', webhooksRoutes);

export default app;
