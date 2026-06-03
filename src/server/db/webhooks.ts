import { randomUUID } from 'node:crypto';
import { hashPassword } from '../auth/password';
import { assertJsonSize } from './jsonLimit';
import { getPool } from './pool';

const RECEIPTS_LIMIT = 500;
const DEFAULT_BODY_BYTES = 2 * 1024 * 1024;

export function bodyByteLimit(): number {
  const raw = process.env.APIFLASH_WEBHOOK_BODY_LIMIT;
  if (!raw) return DEFAULT_BODY_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_BODY_BYTES;
}

export interface WebhookEndpointRow {
  id: string;
  workspace_id: string;
  name: string;
  secret_hash: string | null;
  enabled: number;
  response_status: number | null;
  response_body: string | null;
  created_at: number;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  enabled: boolean;
  hasSecret: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: number;
}

export interface WebhookReceiptSummary {
  id: string;
  webhookId: string;
  method: string;
  path: string;
  responseStatus: number;
  clientIp: string | null;
  receivedAt: number;
  bodyTruncated: boolean;
}

export interface WebhookReceipt extends WebhookReceiptSummary {
  query: Record<string, string>;
  headers: Record<string, string>;
  bodyText: string | null;
}

interface ReceiptRow {
  id: string;
  webhook_id: string;
  workspace_id: string;
  method: string;
  path: string;
  query_json: string | object;
  headers_json: string | object;
  body_text: string | null;
  body_truncated: number;
  response_status: number;
  client_ip: string | null;
  received_at: number;
}

function parseJsonRecord(value: string | object): Record<string, string> {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object') return {};
  return parsed as Record<string, string>;
}

function rowToEndpoint(row: WebhookEndpointRow): WebhookEndpoint {
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    hasSecret: Boolean(row.secret_hash),
    responseStatus: row.response_status,
    responseBody: row.response_body,
    createdAt: Number(row.created_at),
  };
}

function rowToSummary(row: ReceiptRow): WebhookReceiptSummary {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    method: row.method,
    path: row.path,
    responseStatus: row.response_status,
    clientIp: row.client_ip,
    receivedAt: Number(row.received_at),
    bodyTruncated: Boolean(row.body_truncated),
  };
}

function rowToReceipt(row: ReceiptRow): WebhookReceipt {
  return {
    ...rowToSummary(row),
    query: parseJsonRecord(row.query_json),
    headers: parseJsonRecord(row.headers_json),
    bodyText: row.body_text,
  };
}

export async function listEndpoints(workspaceId: string): Promise<WebhookEndpoint[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, workspace_id, name, secret_hash, enabled, response_status, response_body, created_at
     FROM webhook_endpoints
     WHERE workspace_id = ?
     ORDER BY created_at DESC`,
    [workspaceId],
  );
  return (rows as WebhookEndpointRow[]).map(rowToEndpoint);
}

export async function createEndpoint(
  workspaceId: string,
  name: string,
  options?: { secret?: string | null; generateSecret?: boolean },
): Promise<{ endpoint: WebhookEndpoint; secretPlain?: string }> {
  const id = randomUUID();
  const createdAt = Date.now();
  let secretPlain: string | undefined;
  let secretHash: string | null = null;

  if (options?.generateSecret) {
    secretPlain = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 8);
    secretHash = await hashPassword(secretPlain);
  } else if (options?.secret) {
    secretPlain = options.secret;
    secretHash = await hashPassword(options.secret);
  }

  const pool = getPool();
  await pool.query(
    `INSERT INTO webhook_endpoints
      (id, workspace_id, name, secret_hash, enabled, response_status, response_body, created_at)
     VALUES (?, ?, ?, ?, 1, 200, NULL, ?)`,
    [id, workspaceId, name.trim() || 'Webhook', secretHash, createdAt],
  );

  const endpoint = await getEndpoint(workspaceId, id);
  if (!endpoint) throw new Error('Failed to create webhook.');
  return { endpoint, secretPlain };
}

export async function getEndpoint(workspaceId: string, id: string): Promise<WebhookEndpoint | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, workspace_id, name, secret_hash, enabled, response_status, response_body, created_at
     FROM webhook_endpoints
     WHERE workspace_id = ? AND id = ?`,
    [workspaceId, id],
  );
  const row = (rows as WebhookEndpointRow[])[0];
  return row ? rowToEndpoint(row) : null;
}

export async function getEndpointByPublicId(id: string): Promise<WebhookEndpointRow | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, workspace_id, name, secret_hash, enabled, response_status, response_body, created_at
     FROM webhook_endpoints
     WHERE id = ?`,
    [id],
  );
  return (rows as WebhookEndpointRow[])[0] ?? null;
}

export async function updateEndpoint(
  workspaceId: string,
  id: string,
  patch: {
    name?: string;
    enabled?: boolean;
    responseStatus?: number | null;
    responseBody?: string | null;
    secret?: string | null;
    clearSecret?: boolean;
    generateSecret?: boolean;
  },
): Promise<{ endpoint: WebhookEndpoint; secretPlain?: string } | null> {
  const current = await getEndpoint(workspaceId, id);
  if (!current) return null;

  const name = patch.name !== undefined ? patch.name.trim() || current.name : current.name;
  const enabled = patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : current.enabled ? 1 : 0;
  const responseStatus =
    patch.responseStatus !== undefined ? patch.responseStatus : current.responseStatus;
  const responseBody =
    patch.responseBody !== undefined ? patch.responseBody : current.responseBody;

  let secretPlain: string | undefined;
  let secretHash: string | null | undefined;
  if (patch.clearSecret) {
    secretHash = null;
  } else if (patch.generateSecret) {
    secretPlain = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 8);
    secretHash = await hashPassword(secretPlain);
  } else if (patch.secret) {
    secretPlain = patch.secret;
    secretHash = await hashPassword(patch.secret);
  }

  const pool = getPool();
  if (secretHash !== undefined) {
    await pool.query(
      `UPDATE webhook_endpoints
       SET name = ?, enabled = ?, response_status = ?, response_body = ?, secret_hash = ?
       WHERE workspace_id = ? AND id = ?`,
      [name, enabled, responseStatus, responseBody, secretHash, workspaceId, id],
    );
  } else {
    await pool.query(
      `UPDATE webhook_endpoints
       SET name = ?, enabled = ?, response_status = ?, response_body = ?
       WHERE workspace_id = ? AND id = ?`,
      [name, enabled, responseStatus, responseBody, workspaceId, id],
    );
  }

  const endpoint = await getEndpoint(workspaceId, id);
  if (!endpoint) return null;
  return { endpoint, secretPlain };
}

export async function deleteEndpoint(workspaceId: string, id: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.query(
    'DELETE FROM webhook_endpoints WHERE workspace_id = ? AND id = ?',
    [workspaceId, id],
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

export async function listReceipts(
  workspaceId: string,
  webhookId?: string,
): Promise<WebhookReceiptSummary[]> {
  const pool = getPool();
  const limit = RECEIPTS_LIMIT;
  if (webhookId) {
    const [rows] = await pool.query(
      `SELECT id, webhook_id, workspace_id, method, path, query_json, headers_json,
              body_text, body_truncated, response_status, client_ip, received_at
       FROM webhook_receipts
       WHERE workspace_id = ? AND webhook_id = ?
       ORDER BY received_at DESC
       LIMIT ?`,
      [workspaceId, webhookId, limit],
    );
    return (rows as ReceiptRow[]).map(rowToSummary);
  }

  const [rows] = await pool.query(
    `SELECT id, webhook_id, workspace_id, method, path, query_json, headers_json,
            body_text, body_truncated, response_status, client_ip, received_at
     FROM webhook_receipts
     WHERE workspace_id = ?
     ORDER BY received_at DESC
     LIMIT ?`,
    [workspaceId, limit],
  );
  return (rows as ReceiptRow[]).map(rowToSummary);
}

export async function getReceipt(workspaceId: string, receiptId: string): Promise<WebhookReceipt | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, webhook_id, workspace_id, method, path, query_json, headers_json,
            body_text, body_truncated, response_status, client_ip, received_at
     FROM webhook_receipts
     WHERE workspace_id = ? AND id = ?`,
    [workspaceId, receiptId],
  );
  const row = (rows as ReceiptRow[])[0];
  return row ? rowToReceipt(row) : null;
}

async function trimReceipts(conn: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>>, workspaceId: string): Promise<void> {
  await conn.query(
    `DELETE FROM webhook_receipts
     WHERE workspace_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM webhook_receipts
           WHERE workspace_id = ?
           ORDER BY received_at DESC
           LIMIT ?
         ) AS recent
       )`,
    [workspaceId, workspaceId, RECEIPTS_LIMIT],
  );
}

export async function insertReceipt(input: {
  webhookId: string;
  workspaceId: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  bodyText: string | null;
  bodyTruncated: boolean;
  responseStatus: number;
  clientIp: string | null;
}): Promise<WebhookReceiptSummary> {
  assertJsonSize(input.query, 'query');
  assertJsonSize(input.headers, 'headers');

  const id = randomUUID();
  const receivedAt = Date.now();
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO webhook_receipts
        (id, webhook_id, workspace_id, method, path, query_json, headers_json,
         body_text, body_truncated, response_status, client_ip, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.webhookId,
        input.workspaceId,
        input.method.slice(0, 10),
        input.path.slice(0, 2048),
        JSON.stringify(input.query),
        JSON.stringify(input.headers),
        input.bodyText,
        input.bodyTruncated ? 1 : 0,
        input.responseStatus,
        input.clientIp,
        receivedAt,
      ],
    );
    await trimReceipts(conn, input.workspaceId);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return {
    id,
    webhookId: input.webhookId,
    method: input.method,
    path: input.path,
    responseStatus: input.responseStatus,
    clientIp: input.clientIp,
    receivedAt,
    bodyTruncated: input.bodyTruncated,
  };
}

export async function clearReceipts(workspaceId: string, webhookId?: string): Promise<void> {
  const pool = getPool();
  if (webhookId) {
    await pool.query('DELETE FROM webhook_receipts WHERE workspace_id = ? AND webhook_id = ?', [
      workspaceId,
      webhookId,
    ]);
  } else {
    await pool.query('DELETE FROM webhook_receipts WHERE workspace_id = ?', [workspaceId]);
  }
}
