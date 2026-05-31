import { buildCurl } from './curl/build';
import { uid } from './types';
import type { HistoryEntry, RequestSpec, ResponseResult } from './types';

export function toHistoryEntry(spec: RequestSpec, result: ResponseResult): HistoryEntry {
  return {
    id: uid('hist'),
    method: spec.method,
    url: spec.url,
    status: result.status,
    durationMs: result.durationMs,
    at: Date.now(),
    spec: structuredClone(spec),
    response: structuredClone(result),
    curl: buildCurl(spec),
  };
}
