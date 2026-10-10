import { vi } from 'vitest';
import type { FlagData, JsonValue, RuleCondition } from '@zenmanage/sdk';

export const CDN_ORIGIN = 'https://cdn.zenmanage.test';
export const RULES_URL = `${CDN_ORIGIN}/rules.json`;

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
}

export interface FakeApi {
  requests: RecordedRequest[];
  /** Requests for the rules metadata, one per rules load. */
  rulesLoads(): RecordedRequest[];
  usageReports(): RecordedRequest[];
  setFlags(flags: FlagData[]): void;
  /** Makes every request fail, as if the API were unreachable. */
  goOffline(): void;
}

type Primitive = boolean | string | number;

export function flag(
  key: string,
  value: Primitive | JsonValue,
  rules: Array<{ clauses: RuleCondition[]; value: Primitive | JsonValue }> = []
): FlagData {
  const wrap = (v: Primitive | JsonValue): Record<string, unknown> => {
    if (typeof v === 'boolean') return { boolean: v };
    if (typeof v === 'number') return { number: v };
    if (typeof v === 'string') return { string: v };
    return { json: v };
  };

  const type =
    typeof value === 'boolean'
      ? 'boolean'
      : typeof value === 'number'
        ? 'number'
        : typeof value === 'string'
          ? 'string'
          : 'json';

  return {
    version: `fla_${key}`,
    type,
    key,
    name: key,
    target: { version: 'tar_1', value: { version: 'val_1', value: wrap(value) } },
    rules: rules.map((rule) => ({
      clauses: rule.clauses,
      value: { value: wrap(rule.value) },
    })),
  } as FlagData;
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Replaces `fetch` with an in-memory Zenmanage API: rules metadata, the CDN, and usage reports. */
export function installFakeApi(initialFlags: FlagData[] = []): FakeApi {
  let flags = initialFlags;
  let offline = false;
  const requests: RecordedRequest[] = [];

  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    requests.push({
      url,
      method: init?.method ?? 'GET',
      headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) },
    });

    if (offline) {
      throw new TypeError('fetch failed');
    }

    if (url.endsWith('/v1/flag-json')) {
      return json({ data: { cdn: CDN_ORIGIN, path: '/rules.json' } });
    }

    if (url === RULES_URL) {
      return json({ version: '1', flags });
    }

    if (url.includes('/usage')) {
      return new Response(null, { status: 204 });
    }

    return new Response('not found', { status: 404 });
  });

  vi.stubGlobal('fetch', fetchMock);

  return {
    requests,
    rulesLoads: () => requests.filter((request) => request.url.endsWith('/v1/flag-json')),
    usageReports: () => requests.filter((request) => request.url.includes('/usage')),
    setFlags(next) {
      flags = next;
    },
    goOffline() {
      offline = true;
    },
  };
}
