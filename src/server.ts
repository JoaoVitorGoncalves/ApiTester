import { Hono } from 'hono';
import { proxyHandler } from './server/proxy';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true, name: 'apiflash' }));

app.post('/api/proxy', proxyHandler);

export default app;
