import * as jose from 'jose';

export interface AuthClaims {
  sub: string;
  workspaceId: string;
  name: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

function expiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '7d';
}

export async function signToken(claims: AuthClaims): Promise<string> {
  return new jose.SignJWT({
    workspaceId: claims.workspaceId,
    name: claims.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn())
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<AuthClaims | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey());
    const sub = payload.sub;
    const workspaceId = payload.workspaceId;
    const name = payload.name;
    if (typeof sub !== 'string' || typeof workspaceId !== 'string' || typeof name !== 'string') {
      return null;
    }
    return { sub, workspaceId, name };
  } catch {
    return null;
  }
}
