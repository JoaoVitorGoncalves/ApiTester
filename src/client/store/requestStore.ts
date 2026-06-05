import { create } from 'zustand';
import {
  defaultRequest,
  uid,
  type Auth,
  type Body,
  type BodyMode,
  type HistoryEntry,
  type Method,
  type RequestSpec,
  type ResponseResult,
  type Row,
} from '@core/types';
import { sendRequest } from '../lib/send';
import { recordHistory } from './library';

function emptyBody(mode: BodyMode): Body {
  switch (mode) {
    case 'json':
      return { mode: 'json', raw: '' };
    case 'text':
      return { mode: 'text', raw: '' };
    case 'form':
      return { mode: 'form', rows: [{ id: uid('row'), key: '', value: '', enabled: true }] };
    case 'none':
    default:
      return { mode: 'none' };
  }
}

interface RequestState {
  spec: RequestSpec;
  response: ResponseResult | null;
  sending: boolean;
  controller: AbortController | null;

  setMethod: (method: Method) => void;
  setUrl: (url: string) => void;
  setParams: (params: Row[]) => void;
  setHeaders: (headers: Row[]) => void;
  setAuth: (auth: Auth) => void;
  setBody: (body: Body) => void;
  setBodyMode: (mode: BodyMode) => void;
  setTimeout: (timeoutMs: number) => void;
  setFollowRedirects: (value: boolean) => void;
  setUseProxy: (value: boolean) => void;
  loadSpec: (spec: RequestSpec) => void;
  loadFromHistory: (entry: HistoryEntry) => void;
  reset: () => void;

  send: () => Promise<void>;
  cancel: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  spec: defaultRequest(),
  response: null,
  sending: false,
  controller: null,

  setMethod: (method) => set((s) => ({ spec: { ...s.spec, method } })),
  setUrl: (url) => set((s) => ({ spec: { ...s.spec, url } })),
  setParams: (params) => set((s) => ({ spec: { ...s.spec, params } })),
  setHeaders: (headers) => set((s) => ({ spec: { ...s.spec, headers } })),
  setAuth: (auth) => set((s) => ({ spec: { ...s.spec, auth } })),
  setBody: (body) => set((s) => ({ spec: { ...s.spec, body } })),
  setBodyMode: (mode) => set((s) => ({ spec: { ...s.spec, body: emptyBody(mode) } })),
  setTimeout: (timeoutMs) => set((s) => ({ spec: { ...s.spec, timeoutMs } })),
  setFollowRedirects: (followRedirects) => set((s) => ({ spec: { ...s.spec, followRedirects } })),
  setUseProxy: (useProxy) => set((s) => ({ spec: { ...s.spec, useProxy } })),

  loadSpec: (spec) => set({ spec: structuredClone(spec), response: null }),
  loadFromHistory: (entry) =>
    set({
      spec: structuredClone(entry.spec),
      response: structuredClone(entry.response),
    }),
  reset: () => set({ spec: defaultRequest(), response: null }),

  send: async () => {
    if (get().sending) return;
    const controller = new AbortController();
    set({ sending: true, controller, response: null });
    const spec = get().spec;
    const { result } = await sendRequest(spec, controller.signal);
    set({ response: result, sending: false, controller: null });
    if (result.status > 0 && !result.error) {
      void recordHistory(spec, result);
    }
  },

  cancel: () => {
    get().controller?.abort();
    set({ sending: false, controller: null });
  },
}));
