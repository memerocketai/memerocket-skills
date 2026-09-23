# memerocket — HTTP API notes

The CLI in `scripts/cli.mjs` is a thin wrapper over these public endpoints. They are documented here so an
agent (or a human) can call them with `curl` or `fetch` directly when the CLI is not available.

**Base URL:** `https://mcp.memerocket.ai`
**Method:** `GET` only for everything in this skill · **Auth:** none · **Format:** JSON · **Chain:** BSC (`56`) only
**CORS:** enabled (`OPTIONS` answered with `204`) — the endpoints can be called from a browser.

All endpoints were verified with `curl -s -m 15` on 2026-09-23; the HTTP status observed is noted per row.

## Endpoints used by the CLI

| CLI command | HTTP | Verified | Query parameters | Notes |
|---|---|---|---|---|
| `score` | `GET /score/{address}` | 200 / 404 / 422 | `lang=en\|es\|zh\|pt` | Score cached 2 min per token; 60 req/min per IP |
| `token` | `GET /token/{address}` | 200 | `lang=…` | Unknown address → `200` with `pair: null`, `score: null` |
| `league` | `GET /core/league` | 200 | `window=7d\|30d\|90d` · `cat=all\|kol\|smart\|whale\|arbiter` · `sort=pnl\|winrate\|copiers\|earned` · `limit=1..100` · `cursor=N` | Invalid values fall back to defaults (`7d`, `all`, `pnl`) |
| `wallet` | `GET /core/wallet/{address}` | 200 / 404 | — | `404 {"error":"wallet sin operaciones ni censo"}` when unknown |
| `copy-targets` | `GET /copy/targets` | 200 | `limit=1..150` | Refreshed every few minutes (`updated_at`) |
| `copyable` | `GET /copy/target/{address}` | 200 | — | Unknown address → `200` with `in_census: false` |
| `radar` | `GET /radar` | 200 | `limit=1..100` · `token=0x…` | Scan runs every 10 min (`scan.every_s`) |
| `gems` | `GET /gems` | 200 | `kind=gems\|fast` · `limit=1..50` | Invalid `kind` falls back to `gems` |
| `survival` | `GET /survival/v3` | 200 | `period=today\|yesterday\|7d\|30d\|all` · `compare=1` | `compare=1` adds the previous period |
| `health` | `GET /health` | 200 | — | |

`{address}` must match `^0x[a-fA-F0-9]{40}$`; the gateway lowercases it. Any other shape falls through to
`404 {"error":"not found"}`.

## Other public read-only endpoints (verified 200, not wrapped by the CLI)

These exist on the same gateway and answer without auth. They are listed for completeness; the CLI does not
wrap them because they duplicate the commands above or are UI feeds.

| HTTP | Purpose |
|---|---|
| `GET /score/{address}/history` | Daily Score history of a token (`points[] {date, score, grade, price_usd, liq_usd}`) — also inside `token.history` |
| `GET /wallets/{address}` | Older wallet sheet (headline PnL, positions, recent tokens). `/core/wallet` supersedes it |
| `GET /wallets/rank` | Census ranking by category (`voice`, `smart`, `bot`, `kol`, `dev`, `whale`) |
| `GET /league` | Weekly league snapshot (per-category top wallets of the current week) |
| `GET /core/copy/top` | Top copied wallets |
| `GET /discover` | Discovery board (tracked / trusted / bad tokens, flows, weather) |
| `GET /board` | Score board (24 h window, grade moves) |
| `GET /momentum` | Death / rise momentum lists |
| `GET /smart-feed` | Latest smart-money trades |
| `GET /pulse` | Daily activity pulse (Score ≥ B) |
| `GET /calls`, `GET /calls/stats`, `GET /calls/{address}` | Public calls on X and their outcomes |
| `GET /narratives`, `GET /narratives/{key}`, `GET /narratives/token/{address}` | Narrative classification |
| `GET /survival` | Legacy survival report (file-based); `/survival/v3` supersedes it |
| `GET /survival/v2`, `GET /survival/phases`, `GET /survival/day/{YYYY-MM-DD}`, `GET /survival/history` | Other survival views |
| `GET /weather` | Market regime only |
| `GET /stats/market` | Market counters (born / launched / died / alive) |
| `GET /deathwatch` | Tokens with high death risk right now |
| `GET /trader`, `GET /sniper` | The platform's own trading diary and sniper experiment (public receipts) |
| `GET /badge/{address}.svg`, `GET /card/{address}.png`, `GET /card/wallet/{address}.png` | Score badge and share cards |

Live streams (SSE, `text/event-stream`): `GET /events`, `GET /board/live`, `GET /core/league/stream`,
`GET /core/wallet/{address}/stream`, `GET /copy/stream`, `GET /token/{address}/live`, `GET /live/watch`. They
are capped globally and per IP (`503 {"error":"sse_full"}` when full) and are out of scope for this skill.

## Not public / out of scope

- `POST /mcp` — the MCP server (Bearer token or OAuth 2.1); see [`mcp.md`](mcp.md).
- `/admin/*`, `/vault/*`, `/copy/prefs/*`, `/copy/intent`, `/claim/*`, `/me/*`, `/trial` — authenticated,
  signed or write endpoints. The skill never calls them.
- Some per-wallet endpoints (`/token/{address}/position/{wallet}`, `/token/{address}/traders`, `/power/*`,
  `/translate`) sit behind a stricter per-IP quota (30 req/min) and are not wrapped.

## Rate limits

| Scope | Limit | Response when exceeded |
|---|---|---|
| `GET /score/{address}` | 60 requests / minute / IP (sliding 60 s window) | `429 {"error":"rate_limited","retryAfterSec":60}` |
| Heavy per-wallet / per-token endpoints (not wrapped) | 30 requests / minute / IP | same body |
| Everything else | no explicit quota; responses are cached 15-60 s (`cache-control: public, max-age=…`) | — |

## Error bodies

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"ruta inválida"}` / `{"error":"bad_date"}` | Malformed sub-route under `/core/` or `/survival/day/` |
| 404 | `{"error":"not found"}` | Unknown route or malformed address |
| 404 | `{"error":"no_score","address":"0x…"}` | Token has no Score (no pair, no data); cached 2 min |
| 404 | `{"error":"wallet sin operaciones ni censo","wallet":"0x…"}` | Wallet unknown to the census |
| 422 | `{"error":"Token sin datos en BSC"}` | Score could not be computed for the address |
| 429 | `{"error":"rate_limited","retryAfterSec":60}` | Quota exceeded |
| 500 | `{"error":"…"}` | Gateway failure (message is truncated free text) |
| 503 | `{"error":"sse_full"}` | Stream capacity reached (streams only) |

Error strings are free text and may be in Spanish; use the HTTP status and the stable `error` codes
(`no_score`, `rate_limited`, `sse_full`, `not found`) for logic.

## Response conventions

- `generated` — ISO-8601 timestamp of the response (most endpoints).
- USD values are plain numbers; `*_pct` and `percent` fields are already percentages.
- `quote_class` is `bnb`, `stable` or `other`; `other` means an exotic quote token whose USD values cannot be
  verified (the Score is capped at 49 in that case).
- `pool.version` / `routes.{v2,v3}` describe where the liquidity lives; `vaultTradeable` is whether the
  platform's own vault could route it today. Neither is a recommendation.
- Fields that name internal data sources (`sources`, `holders_source`, `refs`, `source`, `label`) are
  informational only and should not be shown to users.

## Example with curl

```bash
curl -s "https://mcp.memerocket.ai/score/0x0000000000000000000000000000000000000000?lang=en" \
  -H "Accept: application/json" -H "User-Agent: memerocket-skill/1.0.0"
```
