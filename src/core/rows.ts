import { createRow, type Row } from './types';

/**
 * Guarantee a final blank row so key/value editors always offer a place to
 * type a new entry (imported cURL, saved requests, history reload, etc.).
 */
export function ensureTrailingRow(rows: Row[]): Row[] {
  if (rows.length === 0) return [createRow()];
  const last = rows[rows.length - 1];
  if (last.key === '' && last.value === '') return rows;
  return [...rows, createRow()];
}
