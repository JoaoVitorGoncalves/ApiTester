import { Hono } from 'hono';
import { validateAuthInput } from '../../core/authValidation';
import { signToken, verifyToken } from '../auth/jwt';
import { findUserById, loginUser, registerUser } from '../auth/users';
import { requireDb } from '../db/middleware';

const app = new Hono();

app.use('*', requireDb);

function authResponse(user: { id: string; name: string; workspaceId: string }, token: string) {
  return {
    token,
    user: { id: user.id, name: user.name },
    workspaceId: user.workspaceId,
  };
}

app.post('/register', async (c) => {
  let body: { name?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const input = { name: body.name ?? '', password: body.password ?? '' };
  const validationError = validateAuthInput(input);
  if (validationError) return c.json({ error: validationError }, 400);

  try {
    const user = await registerUser(input.name, input.password);
    const token = await signToken({
      sub: user.id,
      workspaceId: user.workspaceId,
      name: user.name,
    });
    return c.json(authResponse(user, token), 201);
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: string }).code === 'NAME_TAKEN') {
      return c.json({ error: 'This name is already taken.' }, 409);
    }
    if (err instanceof Error && err.message.includes('JWT_SECRET')) {
      return c.json({ error: 'Server auth is not configured.' }, 503);
    }
    throw err;
  }
});

app.post('/login', async (c) => {
  let body: { name?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const input = { name: body.name ?? '', password: body.password ?? '' };
  const validationError = validateAuthInput(input);
  if (validationError) return c.json({ error: validationError }, 400);

  try {
    const user = await loginUser(input.name, input.password);
    if (!user) return c.json({ error: 'Invalid name or password.' }, 401);
    const token = await signToken({
      sub: user.id,
      workspaceId: user.workspaceId,
      name: user.name,
    });
    return c.json(authResponse(user, token));
  } catch (err) {
    if (err instanceof Error && err.message.includes('JWT_SECRET')) {
      return c.json({ error: 'Server auth is not configured.' }, 503);
    }
    throw err;
  }
});

app.get('/me', async (c) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'Unauthorized.' }, 401);

  const claims = await verifyToken(token);
  if (!claims) return c.json({ error: 'Invalid or expired token.' }, 401);

  const user = await findUserById(claims.sub);
  if (!user) return c.json({ error: 'User not found.' }, 401);

  return c.json({
    user: { id: user.id, name: user.name },
    workspaceId: user.workspaceId,
  });
});

export default app;
