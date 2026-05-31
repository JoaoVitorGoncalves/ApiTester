import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export interface SafetyVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * When apiFlash is run locally for development you often WANT to hit
 * localhost / LAN APIs. Set APIFLASH_ALLOW_PRIVATE=1 to relax the guard.
 * It defaults to OFF so a public deployment is safe from SSRF.
 */
function allowPrivate(): boolean {
  const v = process.env.APIFLASH_ALLOW_PRIVATE;
  return v === '1' || v === 'true';
}

function ipv4IsPrivate(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // be safe
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  return false;
}

function ipv6IsPrivate(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0];
  if (addr === '::1' || addr === '::') return true;
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (mapped) return ipv4IsPrivate(mapped[1]);
  if (addr.startsWith('fe8') || addr.startsWith('fe9') || addr.startsWith('fea') || addr.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // fc00::/7 unique local
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4IsPrivate(ip);
  if (version === 6) return ipv6IsPrivate(ip);
  return true; // unknown -> treat as unsafe
}

/** Validate a target URL against SSRF risks before the proxy fetches it. */
export async function assertSafeTarget(rawUrl: string): Promise<SafetyVerdict> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'The URL is not valid.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs can be proxied.' };
  }

  if (allowPrivate()) return { ok: true };

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return { ok: false, reason: blockedReason() };
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      const resolved = await lookup(host, { all: true });
      addresses = resolved.map((r) => r.address);
    } catch {
      return { ok: false, reason: 'Could not resolve the host name.' };
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    return { ok: false, reason: blockedReason() };
  }

  return { ok: true };
}

function blockedReason(): string {
  return 'This host points to a private or loopback address and is blocked by the proxy. Set APIFLASH_ALLOW_PRIVATE=1 to allow local targets, or turn off the proxy to call it directly from the browser.';
}
