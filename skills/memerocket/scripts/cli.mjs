#!/usr/bin/env node
// memerocket CLI — self-contained, zero-dep, Node >= 18
// Usage: node cli.mjs <command> [args] [--option value] [--json]
//
// Read-only client for the public MemeRocket gateway (BNB Chain / BSC only).
// No API key, no wallet, no signing: every command is a plain HTTP GET.
//
// Commands:
//   score <token> [--chain 56] [--lang en]   MemeRocket Score 0-100, grade A-F, factors, verdict
//   token <token>                            Token sheet: pair, liquidity, holders, age, signals
//   league [--window 7d] [--cat all] [--sort pnl] [--limit 20] [--cursor 0]
//                                            On-chain league of wallets (measured PnL, win rate)
//   wallet <address>                         Wallet profile (PnL by window, streak, open positions)
//   copy-targets [--limit 20]                Wallets that currently pass the copy filters
//   copyable <address>                       Copyability check of one wallet (filters passed / failed)
//   radar [--limit 40]                       Live radar of BSC launches (candidates, entries, funnel)
//   gems [--kind gems|fast] [--limit 20]     Gem candidates (slow list) or fast entries
//   survival [--period today]                Survival index of BSC launches (funnel, curve, causes)
//   health                                   Gateway health
//
// Output is always a JSON envelope: { ok: true, data } or { ok: false, error, status }.
// Exit codes: 0 success · 1 usage / upstream error · 3 network failure or timeout.

const VERSION = '1.0.0';
const BASE_URL = 'https://mcp.memerocket.ai';
const TIMEOUT_MS = 20_000;
const CHAIN_ID = '56';
const HEADERS = { Accept: 'application/json', 'User-Agent': `memerocket-skill/${VERSION}` };

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const WINDOWS = ['7d', '30d', '90d'];
const CATS = ['all', 'kol', 'smart', 'whale', 'arbiter'];
const SORTS = ['total', 'pnl', 'winrate', 'copiers', 'earned']; // total = realized + open at live price (gateway default since 23-sep-2026)
const GEM_KINDS = ['gems', 'fast'];
const PERIODS = ['today', 'yesterday', '7d', '30d', 'all'];
const LANGS = ['en', 'es', 'zh', 'pt'];

class UsageError extends Error {
  constructor(message) { super(message); this.exitCode = 1; }
}

// ---- argument parsing: positionals + --key value / --flag ----
export function parseArgs(argv) {
  const positional = [];
  const options = {};
  const flags = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === 'json' || next === undefined || next.startsWith('--')) { flags.add(key); continue; }
    options[key] = next;
    i++;
  }
  return { command: positional[0] ?? null, positional: positional.slice(1), options, flags };
}

// ---- validators ----
const address = (value, what) => {
  if (!value || !ADDRESS_RE.test(value)) throw new UsageError(`${what} must be a 0x-prefixed 40-hex address`);
  return value.toLowerCase();
};
const oneOf = (value, allowed, what, fallback) => {
  if (value === undefined) return fallback;
  const v = String(value).toLowerCase();
  if (!allowed.includes(v)) throw new UsageError(`${what} must be one of: ${allowed.join(', ')}`);
  return v;
};
const bounded = (value, { min, max, fallback }, what) => {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new UsageError(`${what} must be an integer between ${min} and ${max}`);
  return n;
};
const chain = (value) => {
  if (value === undefined) return CHAIN_ID;
  const v = String(value).toLowerCase();
  if (v !== CHAIN_ID && v !== 'bsc' && v !== 'bnb') throw new UsageError(`only BNB Chain is supported (--chain ${CHAIN_ID})`);
  return CHAIN_ID;
};

const qs = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  return entries.length ? '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
};

// ---- commands: ({ positional, options }) => { path } ----
export const COMMANDS = {
  score: ({ positional, options }) => {
    chain(options.chain);
    const lang = oneOf(options.lang, LANGS, '--lang', undefined);
    return { path: `/score/${address(positional[0], 'token')}${qs({ lang })}` };
  },
  token: ({ positional }) => ({ path: `/token/${address(positional[0], 'token')}` }),
  league: ({ options }) => ({
    path: '/core/league' + qs({
      window: oneOf(options.window, WINDOWS, '--window', '7d'),
      cat: oneOf(options.cat, CATS, '--cat', 'all'),
      sort: oneOf(options.sort, SORTS, '--sort', 'total'),
      limit: bounded(options.limit, { min: 1, max: 100, fallback: 20 }, '--limit'),
      cursor: bounded(options.cursor, { min: 0, max: 100_000, fallback: undefined }, '--cursor'),
    }),
  }),
  wallet: ({ positional }) => ({ path: `/core/wallet/${address(positional[0], 'address')}` }),
  'copy-targets': ({ options }) => ({
    path: '/copy/targets' + qs({ limit: bounded(options.limit, { min: 1, max: 150, fallback: 20 }, '--limit') }),
  }),
  copyable: ({ positional }) => ({ path: `/copy/target/${address(positional[0], 'address')}` }),
  radar: ({ options }) => ({
    path: '/radar' + qs({ limit: bounded(options.limit, { min: 1, max: 100, fallback: undefined }, '--limit') }),
  }),
  gems: ({ options }) => ({
    path: '/gems' + qs({
      kind: oneOf(options.kind, GEM_KINDS, '--kind', 'gems'),
      limit: bounded(options.limit, { min: 1, max: 50, fallback: 20 }, '--limit'),
    }),
  }),
  survival: ({ options }) => ({
    path: '/survival/v3' + qs({ period: oneOf(options.period, PERIODS, '--period', 'today') }),
  }),
  health: () => ({ path: '/health' }),
};

export function buildUrl(command, parsed) {
  const builder = COMMANDS[command];
  if (!builder) throw new UsageError(`unknown command "${command}". Commands: ${Object.keys(COMMANDS).join(', ')}`);
  return BASE_URL + builder(parsed).path;
}

// ---- error mapping: HTTP status + body → { error, status } ----
export function mapError(status, body) {
  const upstream = body && typeof body === 'object' && typeof body.error === 'string' ? body.error : null;
  if (status === 404) return { error: upstream === 'no_score' ? 'no_score' : upstream || 'not_found', status };
  if (status === 422) return { error: upstream || 'unprocessable', status };
  if (status === 429) return { error: 'rate_limited', status, retryAfterSec: body?.retryAfterSec ?? 60 };
  if (status >= 500) return { error: upstream || 'upstream_error', status };
  return { error: upstream || `http_${status}`, status };
}

// ---- HTTP (native fetch, timeout, no retries) ----
export async function call(url, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(url, { method: 'GET', headers: HEADERS, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
    return { ok: false, error: timedOut ? 'timeout' : 'network_error', status: 0, exitCode: 3 };
  }
  clearTimeout(timer);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  if (!res.ok) return { ok: false, ...mapError(res.status, body), exitCode: 1 };
  return { ok: true, data: body, exitCode: 0 };
}

// ---- output hygiene: no upstream provider names, no infrastructure, stable English labels ----
// The gateway is built for MemeRocket's own UI and carries internal provenance (which upstream sources fed a number,
// which RPC answered). None of that is part of the skill's contract: agents reason on MemeRocket's numbers and keys.
const DROP_KEYS = new Set(['sources', 'providers', 'provider', 'rpc', 'primary', 'source_provider', 'src_provider', 'method']);
const PROVIDER_RE = /\b(goplus|honeypot\.is|moralis|chainstack|gmgn|dexscreener|dextools|coingecko|geckoterminal|bitquery|nodereal|quicknode|alchemy|ankr|etherscan|bscscan|public[0-9])\b/gi;
const EN = new Map([
  ['medido por nosotros en cadena', 'measured by MemeRocket on-chain'],
  ['según el motor de flujo, sin verificar', 'from the flow engine, unverified'],
  ['solo los tokens que MemeRocket vigila, desde que empezó a vigilarlos', 'only the tokens MemeRocket watches, since it started watching them'],
  ['todas las operaciones de las wallets de la liga', 'every trade of the league wallets'],
  ['wallet sin operaciones ni censo', 'wallet_not_in_census'],
  ['Token sin datos en BSC', 'no_bsc_market_data'],
]);
export function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) { if (DROP_KEYS.has(k)) continue; out[k] = sanitize(v); }
    return out;
  }
  if (typeof value === 'string') {
    for (const [es, en] of EN) if (value.includes(es)) value = value.split(es).join(en);
    return value.replace(PROVIDER_RE, 'external source');
  }
  return value;
}

// ---- run: argv → { exitCode, output } (no process side effects; used by tests) ----
export async function run(argv, deps = {}) {
  const parsed = parseArgs(argv);
  if (!parsed.command || parsed.command === '--help' || parsed.flags.has('help')) {
    return { exitCode: 0, output: { ok: true, data: { version: VERSION, base: BASE_URL, chain: CHAIN_ID, commands: Object.keys(COMMANDS) } } };
  }
  let url;
  try { url = buildUrl(parsed.command, parsed); }
  catch (e) { return { exitCode: e.exitCode || 1, output: { ok: false, error: e.message, status: null } }; }
  const { exitCode, ...output } = await call(url, deps);
  return { exitCode, output: sanitize(output) };
}

export { VERSION, BASE_URL, TIMEOUT_MS, CHAIN_ID, HEADERS, WINDOWS, CATS, SORTS, GEM_KINDS, PERIODS, LANGS, UsageError };

// ---- CLI dispatch (only when executed directly, not when imported) ----
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { exitCode, output } = await run(process.argv.slice(2));
  // write + exit in the callback: a plain console.log + process.exit truncates piped output at 64 KB (seen with `radar`)
  process.stdout.write(JSON.stringify(output, null, 2) + '\n', () => process.exit(exitCode));
}
