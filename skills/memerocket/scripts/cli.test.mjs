// Unit tests for the memerocket skill CLI. No network: fetch is always mocked.
// Run: npx vitest run --config /dev/null integrations/binance-skills-hub
import { describe, it, expect } from 'vitest';
import { sanitize, parseArgs, buildUrl, mapError, call, run, COMMANDS, BASE_URL, HEADERS, VERSION } from './cli.mjs';

const ZERO = '0x0000000000000000000000000000000000000000';
const url = (argv) => { const p = parseArgs(argv); return buildUrl(p.command, p); };
const jsonResponse = (status, body) => ({ ok: status < 400, status, json: async () => body });
const mockFetch = (status, body, calls = []) => async (u, init) => { calls.push({ url: u, init }); return jsonResponse(status, body); };

describe('parseArgs', () => {
  it('splits command, positionals, --key value options and bare flags', () => {
    const p = parseArgs(['league', '--window', '30d', '--limit', '5', '--json']);
    expect(p.command).toBe('league');
    expect(p.positional).toEqual([]);
    expect(p.options).toEqual({ window: '30d', limit: '5' });
    expect(p.flags.has('json')).toBe(true);
  });
  it('keeps positionals after the command and treats --json as a flag even when followed by a value', () => {
    const p = parseArgs(['score', ZERO, '--json', '--chain', '56']);
    expect(p.positional).toEqual([ZERO]);
    expect(p.options).toEqual({ chain: '56' });
    expect(p.flags.has('json')).toBe(true);
  });
  it('returns a null command for an empty argv', () => {
    expect(parseArgs([]).command).toBeNull();
  });
});

describe('buildUrl', () => {
  it('score: lowercases the address and only supports chain 56', () => {
    expect(url(['score', ZERO.toUpperCase().replace('0X', '0x')])).toBe(`${BASE_URL}/score/${ZERO}`);
    expect(url(['score', ZERO, '--chain', '56'])).toBe(`${BASE_URL}/score/${ZERO}`);
    expect(url(['score', ZERO, '--chain', 'bsc'])).toBe(`${BASE_URL}/score/${ZERO}`);
    expect(url(['score', ZERO, '--lang', 'es'])).toBe(`${BASE_URL}/score/${ZERO}?lang=es`);
    expect(() => url(['score', ZERO, '--chain', '1'])).toThrow(/only BNB Chain/);
    expect(() => url(['score', ZERO, '--lang', 'fr'])).toThrow(/--lang/);
  });
  it('score/token/wallet/copyable: reject a missing or malformed address', () => {
    expect(() => url(['score'])).toThrow(/token must be/);
    expect(() => url(['token', '0x1234'])).toThrow(/token must be/);
    expect(() => url(['wallet', 'not-an-address'])).toThrow(/address must be/);
    expect(() => url(['copyable'])).toThrow(/address must be/);
  });
  it('token / wallet / copyable map to their gateway routes', () => {
    expect(url(['token', ZERO])).toBe(`${BASE_URL}/token/${ZERO}`);
    expect(url(['wallet', ZERO])).toBe(`${BASE_URL}/core/wallet/${ZERO}`);
    expect(url(['copyable', ZERO])).toBe(`${BASE_URL}/copy/target/${ZERO}`);
  });
  it('league: defaults, explicit options, and validation of enums / ranges', () => {
    expect(url(['league'])).toBe(`${BASE_URL}/core/league?window=7d&cat=all&sort=total&limit=20`);
    expect(url(['league', '--window', '30d', '--cat', 'kol', '--sort', 'winrate', '--limit', '5', '--cursor', '10']))
      .toBe(`${BASE_URL}/core/league?window=30d&cat=kol&sort=winrate&limit=5&cursor=10`);
    expect(() => url(['league', '--window', '1d'])).toThrow(/--window/);
    expect(() => url(['league', '--cat', 'bots'])).toThrow(/--cat/);
    expect(() => url(['league', '--sort', 'volume'])).toThrow(/--sort/);
    expect(() => url(['league', '--limit', '0'])).toThrow(/--limit/);
    expect(() => url(['league', '--limit', '101'])).toThrow(/--limit/);
    expect(() => url(['league', '--limit', '2.5'])).toThrow(/--limit/);
  });
  it('copy-targets / radar / gems / survival / health', () => {
    expect(url(['copy-targets'])).toBe(`${BASE_URL}/copy/targets?limit=20`);
    expect(url(['copy-targets', '--limit', '150'])).toBe(`${BASE_URL}/copy/targets?limit=150`);
    expect(() => url(['copy-targets', '--limit', '151'])).toThrow(/--limit/);
    expect(url(['radar'])).toBe(`${BASE_URL}/radar`);
    expect(url(['radar', '--limit', '10'])).toBe(`${BASE_URL}/radar?limit=10`);
    expect(url(['gems'])).toBe(`${BASE_URL}/gems?kind=gems&limit=20`);
    expect(url(['gems', '--kind', 'fast', '--limit', '50'])).toBe(`${BASE_URL}/gems?kind=fast&limit=50`);
    expect(() => url(['gems', '--kind', 'slow'])).toThrow(/--kind/);
    expect(url(['survival'])).toBe(`${BASE_URL}/survival/v3?period=today`);
    expect(url(['survival', '--period', '30d'])).toBe(`${BASE_URL}/survival/v3?period=30d`);
    expect(() => url(['survival', '--period', '1y'])).toThrow(/--period/);
    expect(url(['health'])).toBe(`${BASE_URL}/health`);
  });
  it('rejects unknown commands and lists the known ones', () => {
    expect(() => url(['swap'])).toThrow(/unknown command "swap"/);
    expect(Object.keys(COMMANDS)).toEqual(['score', 'token', 'league', 'wallet', 'copy-targets', 'copyable', 'radar', 'gems', 'survival', 'health']);
  });
  it('every URL stays on the public gateway host and uses no query secrets', () => {
    for (const argv of [['score', ZERO], ['token', ZERO], ['league'], ['wallet', ZERO], ['copy-targets'], ['copyable', ZERO], ['radar'], ['gems'], ['survival'], ['health']]) {
      const u = new URL(url(argv));
      expect(u.origin).toBe(BASE_URL);
      expect(u.search).not.toMatch(/key|token=|secret|auth/i);
    }
  });
});

describe('mapError', () => {
  it('maps the gateway error bodies to stable codes', () => {
    expect(mapError(404, { error: 'no_score', address: ZERO })).toEqual({ error: 'no_score', status: 404 });
    expect(mapError(404, { error: 'not found' })).toEqual({ error: 'not found', status: 404 });
    expect(mapError(404, null)).toEqual({ error: 'not_found', status: 404 });
    expect(mapError(422, { error: 'Token sin datos en BSC' })).toEqual({ error: 'Token sin datos en BSC', status: 422 });
    expect(mapError(429, { error: 'rate_limited', retryAfterSec: 60 })).toEqual({ error: 'rate_limited', status: 429, retryAfterSec: 60 });
    expect(mapError(429, {})).toEqual({ error: 'rate_limited', status: 429, retryAfterSec: 60 });
    expect(mapError(500, null)).toEqual({ error: 'upstream_error', status: 500 });
    expect(mapError(503, { error: 'sse_full' })).toEqual({ error: 'sse_full', status: 503 });
    expect(mapError(400, { error: 'ruta inválida' })).toEqual({ error: 'ruta inválida', status: 400 });
    expect(mapError(418, 'text')).toEqual({ error: 'http_418', status: 418 });
  });
});

describe('call', () => {
  it('returns { ok: true, data } on 200 and sends the skill User-Agent', async () => {
    const calls = [];
    const r = await call(`${BASE_URL}/health`, { fetchImpl: mockFetch(200, { ok: true, uptimeSec: 1 }, calls) });
    expect(r).toEqual({ ok: true, data: { ok: true, uptimeSec: 1 }, exitCode: 0 });
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].init.headers['User-Agent']).toBe(`memerocket-skill/${VERSION}`);
    expect(calls[0].init.headers).toEqual(HEADERS);
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });
  it('returns { ok: false, error, status } with exit 1 on HTTP errors', async () => {
    const r = await call(`${BASE_URL}/score/${ZERO}`, { fetchImpl: mockFetch(422, { error: 'Token sin datos en BSC' }) });
    expect(r).toEqual({ ok: false, error: 'Token sin datos en BSC', status: 422, exitCode: 1 });
  });
  it('survives a non-JSON error body', async () => {
    const fetchImpl = async () => ({ ok: false, status: 502, json: async () => { throw new Error('not json'); } });
    expect(await call(`${BASE_URL}/health`, { fetchImpl })).toEqual({ ok: false, error: 'upstream_error', status: 502, exitCode: 1 });
  });
  it('maps a thrown fetch to network_error with exit 3', async () => {
    const fetchImpl = async () => { throw new TypeError('fetch failed'); };
    expect(await call(`${BASE_URL}/health`, { fetchImpl })).toEqual({ ok: false, error: 'network_error', status: 0, exitCode: 3 });
  });
  it('maps an abort (timeout) to timeout with exit 3', async () => {
    const fetchImpl = (_u, init) => new Promise((_resolve, reject) => { init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
    expect(await call(`${BASE_URL}/health`, { fetchImpl, timeoutMs: 5 })).toEqual({ ok: false, error: 'timeout', status: 0, exitCode: 3 });
  });
});

describe('run', () => {
  it('prints the command list with exit 0 when called without a command or with --help', async () => {
    const r = await run([]);
    expect(r.exitCode).toBe(0);
    expect(r.output.ok).toBe(true);
    expect(r.output.data.commands).toContain('score');
    expect((await run(['--help'])).exitCode).toBe(0);
  });
  it('returns a usage error envelope with exit 1 and never calls fetch', async () => {
    const calls = [];
    const r = await run(['score', 'bad'], { fetchImpl: mockFetch(200, {}, calls) });
    expect(r).toEqual({ exitCode: 1, output: { ok: false, error: 'token must be a 0x-prefixed 40-hex address', status: null } });
    expect(calls).toHaveLength(0);
  });
  it('returns the data envelope on success and hits the right URL', async () => {
    const calls = [];
    const r = await run(['score', ZERO, '--json'], { fetchImpl: mockFetch(200, { score: 42, grade: 'D' }, calls) });
    expect(r).toEqual({ exitCode: 0, output: { ok: true, data: { score: 42, grade: 'D' } } });
    expect(calls[0].url).toBe(`${BASE_URL}/score/${ZERO}`);
  });
  it('propagates upstream errors as { ok: false, error, status }', async () => {
    const r = await run(['wallet', ZERO], { fetchImpl: mockFetch(404, { error: 'wallet sin operaciones ni censo', wallet: ZERO }) });
    expect(r).toEqual({ exitCode: 1, output: { ok: false, error: 'wallet_not_in_census', status: 404 } }); // upstream Spanish text is normalized to a stable code
  });
});


describe('output hygiene: no upstream provider names, stable English labels', () => {
  it('drops provenance keys and scrubs provider names inside strings, recursively', () => {
    const out = sanitize({ score: 70, sources: [{ name: 'x' }], risk: { rpc: { primary: 'p' }, note: 'checked via goplus and GMGN' }, rows: [{ providers: ['a'], label: 'medido por nosotros en cadena' }] });
    expect(out).toEqual({ score: 70, risk: { note: 'checked via external source and external source' }, rows: [{ label: 'measured by MemeRocket on-chain' }] });
  });
  it('normalizes the known Spanish labels and error strings', () => {
    expect(sanitize('según el motor de flujo, sin verificar')).toBe('from the flow engine, unverified');
    expect(sanitize({ error: 'Token sin datos en BSC' })).toEqual({ error: 'no_bsc_market_data' });
  });
  it('leaves numbers, booleans and unknown strings untouched', () => {
    expect(sanitize({ a: 1, b: true, c: 'BNB pair', d: null })).toEqual({ a: 1, b: true, c: 'BNB pair', d: null });
  });
});
