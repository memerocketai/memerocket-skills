# memerocket — CLI Reference

Complete reference for every command in `scripts/cli.mjs`.

**Invocation pattern:** `node <skill-dir>/scripts/cli.mjs <command> [args] [--option value] --json`
**Envelope:** `{ "ok": true, "data": … }` on success · `{ "ok": false, "error": "…", "status": <http|null> }` on failure
**Exit codes:** `0` success · `1` usage / upstream error · `3` network failure or timeout (20 s)
**Base URL:** `https://mcp.memerocket.ai` (HTTPS, `GET` only, no auth) · **Chain:** BSC (`56`) only
**Headers sent:** `Accept: application/json`, `User-Agent: memerocket-skill/1.0.0`

All samples below were captured from production on 2026-09-23 and then **trimmed and anonymized**: addresses
and transaction hashes are replaced by `0x…`, symbols and aliases by `TOKEN`, arrays are cut (`"… N more"`),
and fields that name internal data sources are removed. Field names and types are real.

---

## `score <token>` — MemeRocket Score

```bash
node <skill-dir>/scripts/cli.mjs score 0x0000000000000000000000000000000000000000 --json
node <skill-dir>/scripts/cli.mjs score 0x0000000000000000000000000000000000000000 --lang es --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `token` | positional | **yes** | Token contract address (`0x` + 40 hex, case-insensitive) |
| `--chain` | string | no | `56`, `bsc` or `bnb`; anything else is rejected |
| `--lang` | string | no | Language of `factors[].label` and `verdict`: `en` (default) · `es` · `zh` · `pt` |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `address`, `symbol` | string | Token identity |
| `score` | number | 0-100 |
| `grade` | string | `A` (≥80) · `B` (≥65) · `C` (≥50) · `D` (≥35) · `F` |
| `verdict` | string | Localized verdict text (`LIKELY SURVIVOR`, `SOLID, WITH CAVEATS`, `UNCERTAIN`, `HIGH RISK`, `DEATH VERY LIKELY`, `HONEYPOT`, `DEAD — no pool with liquidity`) |
| `verdict_key` | string | Stable key: `v80` · `v65` · `v50` · `v35` · `v0` · `honeypot` · `dead` |
| `factors[]` | `{pts, key, label}` | Every contribution to the score. `pts` is signed. Keys include `established`, `liq`, `liq_thin`, `liq_vs_mcap`, `liq_mcap_cap`, `smart`, `smart_out`, `early`, `age`, `pumped`, `drawdown`, `lp_locked`, `lp_unlocked`, `lp_loose_young`, `unverified`, `mintable`, `mintable_cap`, `wallet_cap`, `top10_cap`, `top_holder`, `sell_tax`, `pausable`, `clone`, `serial_dev`, `dev_honeypots`, `sniper_exit`, `exotic_quote`, `on_curve`, `honeypot`, `dead` |
| `security.honeypot` | boolean | Honeypot detected |
| `security.verdict` | string | `ok` or the failing check |
| `risk.holders`, `risk.top10_pct`, `risk.creator_pct`, `risk.owner_pct` | number | Holder count and concentration (% of supply) |
| `risk.holdersTop[]` | `{address, percent, tag}` | Top real holders (LP, burn and locked addresses excluded) |
| `risk.lpHolders[]` | `{address, percent, tag, locked, locked_detail}` | LP token holders |
| `risk.lp_locked` | boolean | LP locked or burned |
| `risk.is_honeypot`, `risk.is_mintable`, `risk.can_take_back_ownership`, `risk.transfer_pausable`, `risk.open_source` | boolean | Contract flags |
| `risk.tax_buy`, `risk.tax_sell` | number | Taxes in % |
| `risk.mcap_usd`, `risk.liq_vs_mcap_pct` | number\|null | Market cap and pool / market cap ratio in % (`null` on exotic pairs) |
| `risk.age_h` | number\|null | Age of the pair in hours |
| `risk.sniper_exit` | number\|null | Share of snipers that already exited, when known |
| `smart_weighted` | object | Weighted smart-money flow: `n` wallets, `net_1h` / `net_24h` USD, `leaving` |
| `method` | string | Human description of the scoring method |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "address": "0x…",
    "symbol": "TOKEN",
    "score": 93,
    "grade": "A",
    "verdict": "LIKELY SURVIVOR",
    "verdict_key": "v80",
    "security": { "honeypot": false, "verdict": "ok" },
    "factors": [
      { "pts": 15, "key": "established", "label": "Established (mcap $875M)" },
      { "pts": 10, "key": "liq", "label": "Liquidity $1736K" },
      { "pts": 12, "key": "smart", "label": "Smart money: 76 top wallets net buyers" },
      { "pts": 6, "key": "early", "label": "EARLY on our radar" }
    ],
    "risk": {
      "holdersTop": [ { "address": "0x…", "percent": 16.3, "tag": null }, "… 4 more" ],
      "lpHolders": [ { "address": "0x…", "percent": 99.3, "tag": null, "locked": false, "locked_detail": [] }, "… 7 more" ],
      "total_supply": "34849.579591134085300743",
      "is_honeypot": false, "is_mintable": false, "can_take_back_ownership": false, "transfer_pausable": false,
      "holders": 39530, "top10_pct": 43.1, "creator_pct": 0, "owner_pct": null, "sniper_exit": null,
      "lp_locked": false, "security": 100, "open_source": true,
      "mcap_usd": 873867178, "liq_vs_mcap_pct": 0.2, "tax_buy": 0, "tax_sell": 0, "age_h": 7873.6
    },
    "smart_weighted": { "census": 12254, "n": 76, "sum": 2447, "net_1h": 31829, "net_24h": 279775, "wallets": 78, "leaving": false }
  }
}
```

Token without market data on BSC (real output, exit `1`):

```json
{ "ok": false, "error": "Token sin datos en BSC", "status": 422 }
```

---

## `token <token>` — Token sheet

```bash
node <skill-dir>/scripts/cli.mjs token 0x0000000000000000000000000000000000000000 --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `token` | positional | **yes** | Token contract address |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `token` | object | `symbol`, `name`, `supply`, `creator`, `owner`, `websites[]`, `socials[]` |
| `pair` | object\|null | Canonical pair: `dex`, `address`, `quote_symbol`, `quote_class` (`bnb` / `stable` / `other`), `priceUsd`, `liq`, `fdv`, `mcap`, `created`, `on_curve`, `pool` (`{version, dex, fee, liquidityUsd}`), `routes` (`{v2, v3}`), `vaultTradeable`, `txns`, `volume`, `change`, `otherPairs[]`. `null` when the token has no pool |
| `score` | object\|null | Same object as the `score` command |
| `death` | object | Death risk now: `risk` 0-100, `level` (`LOW` / `MEDIUM` / `HIGH`), `reasons[]`, `first_high_at` |
| `lp` | object | LP status: `state` (`locked` / `unlocked` / …), `basis`, `kind` (`v2` / `v3`), `locked`, `detail` |
| `radar` | object | The 7 radar checks (`sec`, `lp`, `smart`, `early`, `notLate`, `liq`, `arbiter`) with `passes` / `total`, `missing[]`, `first_seen` |
| `scout` | object | First sighting: `verdict`, `smart_buyers`, `first_price`, `max_gain_pct`, `bp_1h` |
| `social` | object | Posts on X in 24 h: `m24`, `authors`, `pos`, `neg`, `posts[]` |
| `history[]` | `{date, score, grade, price, liq}` | Daily Score history |
| `status` | object | `died_at`, `liq_now`, `price_now`, `checked_at` |
| `gem` | object | Gem evaluation (same 14 checks as `gems`) |
| `momentum` | object | `death` / `rise` 0-100 with levels and reasons |
| `pulse`, `consensus`, `cradle`, `birth` | object\|null | Activity pulse, call consensus, launch-curve score, birth cohort stats |
| `calls[]` | array | Public calls on X that mention the token |
| `holdersStats`, `dev`, `intel` | object | Holder acquisition split, creator history (`created`, `open`, `open_ratio`, `recent[]`), intel flags |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "address": "0x…",
    "generated": "2026-09-23T20:25:57.793Z",
    "token": { "symbol": "TOKEN", "supply": "34849.579591134085300743" },
    "pair": { "dex": "pancakeswap", "quote_symbol": "WBNB", "quote_class": "bnb", "priceUsd": 174.77, "liq": 1733565.7, "mcap": 873867178, "on_curve": false, "pool": { "version": "v3", "dex": "pancakeswap", "fee": null, "liquidityUsd": 1733565.7 }, "vaultTradeable": true },
    "score": { "score": 93, "grade": "A", "verdict": "LIKELY SURVIVOR", "verdict_key": "v80", "factors": [ { "pts": 15, "key": "established" }, "… 3 more" ] },
    "death": { "risk": 40, "level": "LOW", "reasons": [ "lp", "… 1 more" ], "computed_at": "2026-09-23T20:25:27.515Z", "first_high_at": null },
    "lp": { "state": "unlocked", "basis": "v3_positions", "locked": false, "kind": "v3", "checked_at": "2026-09-23T18:05:48.405Z" },
    "radar": { "passes": 6, "total": 7, "checks": { "sec": true, "lp": false, "smart": true, "early": true, "notLate": true, "liq": true, "arbiter": true }, "missing": [ "LP" ], "first_seen": "2026-09-10T13:02:03.682Z" },
    "scout": { "verdict": "EARLY", "smart_buyers": 3, "first_price": 158.84, "max_gain_pct": 14.44, "bp_1h": 55 },
    "history": [ { "date": "2026-09-10", "score": 87, "grade": "A", "price": 158.17, "liq": 1645816.2 }, "… 13 more" ],
    "status": { "died_at": null, "liq_now": 1736783.25, "price_now": 175.068, "checked_at": "2026-09-23T20:18:33.085Z" }
  }
}
```

An unknown address returns `200` with `pair: null` and `score: null` (no error): treat that as "no market data".

---

## `league` — On-chain league of wallets

```bash
node <skill-dir>/scripts/cli.mjs league --json
node <skill-dir>/scripts/cli.mjs league --window 30d --cat kol --sort winrate --limit 10 --json
node <skill-dir>/scripts/cli.mjs league --limit 20 --cursor 20 --json      # next page
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `--window` | string | no | `7d` (default) · `30d` · `90d` |
| `--cat` | string | no | `all` (default) · `kol` · `smart` · `whale` · `arbiter` |
| `--sort` | string | no | `pnl` (default) · `winrate` · `copiers` · `earned` |
| `--limit` | integer | no | 1-100 (default 20) |
| `--cursor` | integer | no | Offset into the ranked list; use `next_cursor` from the previous page |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `window`, `days`, `cat`, `sort`, `limit`, `cursor` | — | Echo of the effective parameters |
| `count`, `total`, `next_cursor` | number / string\|null | Page size, ranked wallets, cursor of the next page |
| `coverage` | object | **Read this first.** `days_effective` vs `days_requested`, `degraded`, `first_ts` / `last_ts` of the trades used. PnL is measured only on the tokens MemeRocket watches |
| `pool` | object | `candidates`, `ranked`, `sample_per_wallet` (trades sampled per wallet) |
| `thresholds` | object | Copy thresholds (`league` score ≥ 40, `league_events` ≥ 5) and default caps in BNB per copy level |
| `bnb_usd` | number | BNB price used for the BNB columns |
| `rows[]` | object | One wallet per row, see below |

Row fields:

| Field | Type | Description |
|---|---|---|
| `rank`, `rank_prev`, `rank_change` | number | Position and change vs the previous league week |
| `wallet`, `alias`, `handle`, `claimed` | — | Identity; `alias` is a shortened address unless the wallet was claimed |
| `cat`, `categories[]`, `weight` | — | Census category and weight 0-100 |
| `league` | object | `score`, `rank`, `cat`, `week`, `events` in the weekly league |
| `pnl` | object | `usd` (realized), `bnb`, `pct`, `unrealized_usd`, `open_priced` |
| `winrate`, `trades`, `buys`, `sells`, `tokens`, `tokens_closed`, `tokens_open` | number | Window stats |
| `streak`, `drawdown`, `best`, `worst`, `avg_trade_usd`, `volume_usd` | — | Streak (signed), max drawdown, best / worst closed token |
| `copiable`, `copy_level`, `copy_fails[]`, `warnings[]`, `copy` | — | Copyability (same semantics as `copyable`) |
| `copiers`, `reward`, `fills` | — | Copy activity and rewards, if any |
| `sample` | object | `trades`, `cap`, `truncated`, `backfill` |
| `headline` | object | The numbers to display: `pnl.value`, `wr.value`, `eligible_own`, `coverage_note` |
| `spark[]` | number[30] | PnL sparkline |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "window": "7d", "days": 7, "cat": "all", "sort": "pnl", "limit": 3, "cursor": 0, "next_cursor": "3",
    "count": 3, "total": 211,
    "pool": { "candidates": 300, "ranked": 211, "cap": 300, "sample_per_wallet": 400 },
    "coverage": { "days_requested": 7, "days_effective": 7, "keep_days": 30, "days_available": 30, "degraded": false, "first_ts": "2026-09-16T20:26:12.000Z", "last_ts": "2026-09-23T20:25:29.000Z" },
    "bnb_usd": 767.11,
    "thresholds": { "league": 40, "league_events": 5, "caps_bnb": { "league": 0.1, "census": 0.05, "none": 0.02 } },
    "rows": [
      {
        "rank": 1, "rank_change": 336,
        "wallet": "0x…", "alias": "0x…", "cat": "smart", "weight": 12, "claimed": false,
        "league": { "score": 41, "rank": 337, "cat": "smart", "week": "2026-09-14", "events": 124 },
        "copiable": true, "copy_level": "league", "copy_fails": [],
        "warnings": [ { "code": "low_weight", "value": 12 }, { "code": "bundler", "value": "bundler" } ],
        "pnl": { "usd": 38108.73, "bnb": 49.6783, "pct": 147.9, "unrealized_usd": 187396.49, "open_priced": true },
        "winrate": 33.3, "trades": 684, "buys": 272, "sells": 412, "tokens": 35, "tokens_closed": 9, "tokens_open": 26,
        "streak": 1, "drawdown": { "usd": 947.49, "peak_usd": 0, "pct": null },
        "best": { "token": "0x…", "pct": 22.1, "usd": 3.08, "at": "2026-09-17T16:07:47.000Z" },
        "worst": { "token": "0x…", "pct": -48.7, "usd": -633.24, "at": "2026-09-17T17:50:18.000Z" },
        "avg_trade_usd": 197.53, "volume_usd": 135110.32,
        "sample": { "trades": 684, "cap": 400, "truncated": true, "backfill": 284 },
        "headline": { "pnl": { "value": 38108.73, "window": "7d" }, "wr": { "value": 33.3 }, "eligible_own": true }
      },
      "… 2 more"
    ]
  }
}
```

---

## `wallet <address>` — Wallet profile

```bash
node <skill-dir>/scripts/cli.mjs wallet 0x0000000000000000000000000000000000000000 --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `address` | positional | **yes** | Wallet address |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `wallet`, `alias`, `handle`, `claimed`, `followers` | — | Identity |
| `cat`, `categories[]`, `weight`, `census_since`, `last_active` | — | Census data |
| `league`, `league_ranks[]`, `badges[]` | — | Weekly league position(s) |
| `stats.7d`, `stats.30d`, `stats.90d` | object | Per window: `trades`, `buys`, `sells`, `tokens`, `volume_usd`, `pnl_usd`, `pnl_pct`, `pnl_unrealized_usd`, `wins`, `winrate`, `streak`, `drawdown`, `best`, `worst`, `avg_trade_usd`, `unmatched_sells`, `headline` |
| `curves` | object | Daily PnL curve per window |
| `coverage` | object | Same semantics as in `league` |
| `open_positions[]` | object | `token`, `qty`, `cost_usd`, `entry_price`, `price`, `value_usd`, `pnl_usd`, `pnl_pct`, `priced`, `since` |
| `recent[]` | object | Last trades: `ts`, `token`, `side`, `usd`, `price`, `tx`, `dex` |
| `copy` | object | Copyability (`copiable`, `level`, `fails[]`, `warnings[]`, `reasons[]`, `capBnb`, `copiability`, `delay`) |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "wallet": "0x…", "alias": "0x…", "cat": "smart", "weight": 0, "claimed": false,
    "census_since": "2026-09-10T08:17:06.056Z", "last_active": "2026-09-23T11:24:56.000Z",
    "league": { "score": 79, "rank": 3, "cat": "smart", "week": "2026-09-14", "events": 659 },
    "league_ranks": [ { "cat": "smart", "week": "2026-09-21", "rank": 1, "score": 80, "closed": false, "events": 84 } ],
    "stats": {
      "7d":  { "trades": 1029, "tokens": 5,  "volume_usd": 326378.04,  "pnl_usd": -10159.97, "pnl_pct": -6.4, "pnl_unrealized_usd": -64.19,  "wins": 1,  "winrate": 20,   "streak": -4, "tokens_closed": 5,  "tokens_open": 1 },
      "30d": { "trades": 3564, "tokens": 39, "volume_usd": 1840143.32, "pnl_usd": -20927.59, "pnl_pct": -2.4, "pnl_unrealized_usd": 9457.88, "wins": 17, "winrate": 58.6, "streak": -4, "tokens_closed": 29, "tokens_open": 24 }
    },
    "coverage": { "days_requested": 30, "days_effective": 13.2, "keep_days": 30, "days_available": 30, "degraded": true, "first_ts": "2026-09-10T06:53:23.000Z", "last_ts": "2026-09-23T11:24:56.000Z" },
    "open_positions": [ { "token": "0x…", "qty": 14629070.6, "cost_usd": 7316.74, "entry_price": 0.00050015, "price": 0.00083825, "value_usd": 12262.79, "pnl_usd": 4946.05, "pnl_pct": 67.6, "priced": true, "buys": 36, "sells": 23, "since": "2026-09-11T04:14:45.000Z" }, "… 23 more" ],
    "recent": [ { "ts": "2026-09-23T11:24:56.000Z", "token": "0x…", "side": "sell", "usd": 111.41, "price": 778.76, "tx": "0x…", "dex": "uniswap_v2" }, "… 49 more" ]
  }
}
```

Wallet with no trades in the census (real output, exit `1`):

```json
{ "ok": false, "error": "wallet sin operaciones ni censo", "status": 404 }
```

---

## `copy-targets` — Wallets that pass the copy filters

```bash
node <skill-dir>/scripts/cli.mjs copy-targets --limit 20 --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `--limit` | integer | no | 1-150 (default 20) |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `thresholds` | object | `weight` ≥ 50, `league` ≥ 40, `leagueEvents` ≥ 5, `activeDays` ≤ 7, `censusWinrate` ≥ 0.55, `censusTrades` ≥ 5, `censusTokens` ≥ 5 |
| `caps` | object | Default cap per copy in BNB by level: `league` 0.1 · `census` 0.05 · `none` 0.02 |
| `eligible`, `count`, `universe`, `results`, `fails` | — | Funnel: how many wallets were censused, passed category / weight, and how many failed each blocking filter |
| `rows[]` | object | `address`, `label`, `cat`, `weight`, `tags[]`, `league`, `results` (level), `default_cap`, `warnings[]`, `wr30`, `pnl30`, `pnl_pct30`, `trades30`, `tokens30`, `avg_usd`, `hold_s`, `toxicity`, `last_active`, `copyable`, `fails[]`, `copy.reasons[]` |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "updated_at": "2026-09-23T20:18:04.379Z",
    "thresholds": { "weight": 50, "league": 40, "leagueEvents": 5, "activeDays": 7, "limit": 150, "feedHours": 24, "censusWinrate": 0.55, "censusTrades": 5, "censusTokens": 5 },
    "caps": { "league": 0.1, "census": 0.05, "none": 0.02 },
    "limit": 3, "count": 3, "eligible": 316,
    "universe": { "censused": 18254, "category_ok": 7098, "weight_ok": 340, "candidates": 400, "code_unknown": 0 },
    "results": { "league": 316, "census": 0, "none": 0 },
    "fails": { "category": 0, "machine_tags": 65, "wash": 20, "contract": 2, "no_activity": 0, "self": 0, "funded": 0 },
    "rows": [
      {
        "address": "0x…", "cat": "kol", "weight": 67, "tags": [ "top_followed", "… 2 more" ],
        "league": { "score": 57, "events": 69, "week": "2026-09-14T00:00:00.000Z", "cat": "kol", "rank": 17 },
        "results": "league", "default_cap": 0.1, "warnings": [],
        "wr30": 50.8, "pnl30": 352538, "pnl_pct30": 58.8, "trades30": 70, "tokens30": 1142, "avg_usd": 828, "hold_s": 218643, "toxicity": 0,
        "last_active": "2026-09-22T15:59:24.000Z", "copyable": true, "fails": [],
        "copy": { "level": "league", "capBnb": 0.1, "reasons": [ { "k": "weight", "ok": true, "v": 67, "need": 50 }, "… 6 more" ], "blocked": false }
      },
      "… 2 more"
    ]
  }
}
```

---

## `copyable <address>` — Copyability of one wallet

```bash
node <skill-dir>/scripts/cli.mjs copyable 0x0000000000000000000000000000000000000000 --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `address` | positional | **yes** | Wallet address |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `in_census`, `has_activity` | boolean | Whether the wallet is known and has traded |
| `filters[]` | string[] | The seven blocking filters, in evaluation order: `category`, `machine_tags`, `wash`, `contract`, `no_activity`, `self`, `funded` |
| `copyable` | boolean | Passes all blocking filters |
| `fails[]` | string[] | Blocking filters that failed (empty when `copyable`) |
| `warnings[]` | `{code, value}` | Non-blocking: `low_weight`, `relay`, `inactive`, `losing_30d`, `bundler` |
| `copy` | object | `level` (`league` / `census` / `none`), `capBnb`, `reasons[]` (`{k, ok, v, need}` for `weight`, `league_score`, `league_events`, `active`, `winrate`, `trades`, `tokens`), `blocked`, `blockedWhy` |
| `levels[]`, `level_caps`, `caps`, `thresholds` | — | The rule set applied |
| `league`, `wr30`, `pnl30`, `pnl_pct30`, `trades30`, `tokens30`, `avg_usd`, `hold_s`, `toxicity`, `last_active` | — | Wallet summary |
| `headline`, `own` | object | Displayed PnL / win rate and MemeRocket's own measurement (`own.wr30`, `own.pnl30`) |
| `rewards`, `rewards_card` | object | Copy rewards accrued by this wallet, if any |
| `recent[]` | object | Last 20 trades |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "address": "0x…", "in_census": true, "has_activity": true,
    "filters": [ "category", "machine_tags", "wash", "contract", "no_activity", "self", "funded" ],
    "levels": [ "league", "census", "none" ], "level_caps": { "league": 0.1, "census": 0.05, "watch": 0.02 },
    "cat": "smart", "weight": 0, "tags": [ "bundler", "paper_hands", "… 2 more" ],
    "league": { "score": 79, "events": 659, "week": "2026-09-14T00:00:00.000Z", "cat": "smart", "rank": 3 },
    "results": "league", "default_cap": 0.1,
    "warnings": [ { "code": "low_weight", "value": 0 }, { "code": "losing_30d", "value": -155736 }, { "code": "bundler", "value": "bundler" } ],
    "wr30": 43.9, "pnl30": -155736, "pnl_pct30": -4.7, "trades30": 984, "tokens30": 165, "avg_usd": 328, "hold_s": 151632, "toxicity": 92.3,
    "last_active": "2026-09-23T11:24:56.000Z",
    "copyable": true, "fails": [],
    "own": { "wr30": 20, "pnl30": -14005, "at": "2026-09-23T07:54:03.186Z" },
    "copy": {
      "level": "league", "capBnb": 0.1,
      "reasons": [ { "k": "weight", "ok": false, "v": 0, "need": 50 }, { "k": "league_score", "ok": true, "v": 79, "need": 40 }, "… 5 more" ],
      "blocked": false, "blockedWhy": null
    },
    "recent": [ { "ts": "2026-09-23T11:24:56.000Z", "tx": "0x…", "side": "sell", "dex": "uniswap_v2", "token": { "address": "0x…" }, "usd": 111 }, "… 19 more" ]
  }
}
```

Note how a wallet can be `copyable: true` while carrying a `losing_30d` warning: the filters are structural
(not a bot, not wash trading, not a contract, active), not a performance guarantee. Always show the warnings.

An unknown address returns `200` with `in_census: false`, `has_activity: false`, `copyable: false`.

---

## `radar` — Live radar of BSC launches

```bash
node <skill-dir>/scripts/cli.mjs radar --json
node <skill-dir>/scripts/cli.mjs radar --limit 10 --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `--limit` | integer | no | 1-100 candidates (gateway default 40) |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `rules` | object | The 7 radar checks' thresholds: `sec` (security score ≥ 60), `smart` (≥ 2 smart buyers), `late` (≤ 15 % above first price), `liq` (≥ $150K), `arbiter` (Score ≥ 65) |
| `scan` | object | `last`, `next`, `every_s`, `seen_1h`, `seen_24h`, `new_24h`, `early_24h`, `smart_24h` |
| `weather` | object | Market regime: `level` (`VERDE` / `AMARILLO` / `ROJO` = green / yellow / red) and `signals` |
| `funnel[]` | `{key, n}` | Tokens at each stage of the radar |
| `candidates[]` | object | Tokens under watch: `address`, `symbol`, `verdict` (`EARLY` / …), `score`, `grade`, `arbiter_verdict`, `liquidity`, `price_usd`, `chg1`, `chg24`, `max_gain_pct`, `smart_buyers`, `lp_locked`, `checks`, `passes`, `missing[]`, `holders`, `top10_pct`, `dev`, `hs` (holder structure: `smart`, `kol`, `snipers`, `bundlers`, `fresh`, `insiders`, `whales_netflow`) |
| `entries[]` | object | Tokens that entered the radar: `entered_at`, `score`, `grade`, `score_now`, `entry_price`, `price_now`, `since_pct`, `entry_liq`, `liq_now`, `alive`, `max_gain_pct`, `source` |
| `entriesSummary` | object | `n`, `alive`, `up` |
| `survival[]` | `{grade, n, alive, pct}` | Survival by grade of the radar's own entries |
| `log[]` | object | Latest sightings |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "rules": { "sec": 60, "smart": 2, "late": 15, "liq": 150000, "arbiter": 65 },
    "scan": { "last": "2026-09-23T20:25:34.290Z", "next": "2026-09-23T20:35:34.290Z", "every_s": 600, "seen_1h": 192, "seen_24h": 213, "new_24h": 22, "early_24h": 188, "smart_24h": 38 },
    "weather": { "level": "AMARILLO", "signals": { "mercadoGlobal24hPct": -4.91, "earlys12h": 178, "earlysConSmartMoney": 28 } },
    "funnel": [ { "key": "seen", "n": 120 }, "… 6 more" ],
    "candidates": [
      {
        "address": "0x…", "symbol": "TOKEN", "verdict": "EARLY", "score": 93, "grade": "A", "arbiter_verdict": "LIKELY SURVIVOR",
        "liquidity": 1733649.91, "price_usd": 174.79, "chg1": -0.15, "chg24": -2.62, "max_gain_pct": 14.44,
        "smart_buyers": 3, "lp_locked": false, "holders": 39502, "top10_pct": 43.1,
        "checks": { "sec": true, "lp": false, "smart": true, "early": true, "notLate": true, "liq": true, "arbiter": true },
        "passes": 6, "missing": [ "lp" ], "total": 7,
        "hs": { "holders": 39515, "top10": 57.8, "lp": 29.7, "smart": 7, "kol": 0, "snipers": 3, "bundlers": 4, "fresh": 2, "insiders": 1, "whales_netflow": -1343210 }
      },
      "… 59 more"
    ],
    "entries": [ { "address": "0x…", "symbol": "TOKEN", "entered_at": "2026-09-23T16:21:29.929Z", "score": 72, "grade": "B", "entry_price": 0.00034, "price_now": 0.000065, "since_pct": -81, "entry_liq": 53885, "liq_now": 28294.4, "alive": true, "max_gain_pct": 528.18 }, "… 15 more" ],
    "entriesSummary": { "n": 16, "alive": 16, "up": 4 }
  }
}
```

---

## `gems` — Gem candidates and fast entries

```bash
node <skill-dir>/scripts/cli.mjs gems --json
node <skill-dir>/scripts/cli.mjs gems --kind fast --limit 10 --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `--kind` | string | no | `gems` (default; 14-condition slow list) · `fast` (fast entries on young launches) |
| `--limit` | integer | no | 1-50 (default 20) |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `kind`, `rules` | — | The rule set applied (`gems`: Score ≥ 65, liquidity ≥ $20K, age ≥ 1 h, pulse ≥ 40, death ≤ 45, …) |
| `universe`, `matched`, `fails` | — | Tokens evaluated, tokens that passed, and how many failed each condition |
| `rows[]` | object | Tokens that pass every condition — **often empty** |
| `candidates.rows[]` | object | (`gems` only) Closest tokens: `score`, `grade`, `pulse`, `consensus`, `liq_usd`, `vol_h24`, `price_usd`, `chg_h1/h6/h24`, `age_h`, `lp_locked`, `lp_kind`, `lp_pct`, `smart_buyers`, `death_risk`, `death_level`, `rise`, `rise_level`, `backing`, `dev`, `trap`, `promo`, `why[]`, `risk[]` |
| `revivals` | object | (`gems` only) Older tokens waking up, with `revival_rules` |
| `backtest_exit` | object\|null | (`fast` only) The backtested exit used for fast entries: `target_pct`, `stop_pct`, `win_rate`, `n` |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "kind": "gems",
    "rules": { "score": 65, "liq": 20000, "ageH": 1, "pulse": 40, "maxDeath": 45, "rise": 45, "consensus": 60, "smartUsd": 100, "windowMin": 60, "total": 14, "maxAgeDays": 120 },
    "universe": 230, "matched": 0,
    "fails": { "score": 90, "bnb": 62, "lp": 48, "age": 38, "liq": 9, "backing": 110, "dev": 0, "death": 21, "rise": 144, "up": 97, "consensus": 145, "viral": 143, "smart": 128, "heavy": 128 },
    "rows": [],
    "candidates": {
      "n": 5,
      "rows": [
        { "address": "0x…", "symbol": "TOKEN", "score": 81, "grade": "A", "pulse": 43, "pulse_level": "warm", "quote_symbol": "WBNB",
          "liq_usd": 56879, "vol_h24": 14689, "price_usd": 0.0002247, "chg_h1": 17.44, "chg_h6": 1.78, "chg_h24": -3.83, "age_h": 700.7,
          "lp_locked": true, "lp_kind": "v2", "lp_pct": "100", "smart_buyers": 4, "verdict": "EARLY", "death_risk": 0, "death_level": "LOW",
          "rise": 25, "rise_level": "LOW", "trap": false, "promo": false, "dev": { "created": 0, "open_ratio": null, "serial": false } },
        "… 4 more"
      ]
    },
    "revivals": { "n": 0, "rows": [] }
  }
}
```

---

## `survival` — Survival index of BSC launches

```bash
node <skill-dir>/scripts/cli.mjs survival --json
node <skill-dir>/scripts/cli.mjs survival --period 30d --json
```

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `--period` | string | no | `today` (default) · `yesterday` · `7d` · `30d` · `all` |

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `period` | object | `key`, `from`, `to` |
| `funnel` | object | `launched` (on launchpads), `graduated`, `born` (reached a pool), `scored`, `aliveScored`, `gradeAB`, `hit2x`, `dead`, `alive`, `medianLifeMin`, `steps[]` |
| `curve[]` | `{label, n, dead, deadPct}` | Deaths by age bucket (1-3 h, 3-6 h, …) |
| `km` | object | Survival curve by horizon (hours): `points[] {h, elig, deaths, alive, pct}` |
| `causes` | object | Why tokens died: `rows[] {cause, n, pct}` (`liquidity`, `backfilled`, …) |
| `days[]` | object | Per day: `launched`, `born`, `died`, `aliveNow`, `best` |
| `graveyard[]` | object | Dead tokens: `first_seen`, `died_at`, `lived_min`, `max_liq`, `max_gain_pct`, `first_grade`, `last_grade`, `cause`, `warned_min` |
| `survivors[]` | object | Alive tokens: `age_min`, `liq_now`, `gain`, `max_gain_pct`, `first_grade`, `last_grade` |
| `receipts` | object | How the grades performed: `gradeAB {n, alive, alivePct, hit2x}`, `gradeF {n, dead, deadPct}`, `preDeath {n, died24, leadMin}` |

### Real output (trimmed, anonymized)

```json
{
  "ok": true,
  "data": {
    "period": { "key": "today", "from": "2026-09-23T00:00:00.000Z", "to": "2026-09-23T20:26:02.965Z" },
    "funnel": { "launched": 19631, "graduated": 45, "born": 22, "scored": 22, "aliveScored": 17, "gradeAB": 0, "hit2x": 1, "dead": 5, "alive": 17, "medianLifeMin": 118 },
    "curve": [ { "label": "1-3h", "n": 2, "dead": 0, "deadPct": 0 }, "… 5 more" ],
    "km": { "horizons": [ 1, 6, 24, 72, 168, 720 ], "all": { "n": 22, "points": [ { "h": 1, "elig": 22, "deaths": 0, "alive": 22, "pct": 100 }, { "h": 6, "elig": 17, "deaths": 5, "alive": 12, "pct": 70.6 } ] } },
    "causes": { "total": 24, "rows": [ { "cause": "liquidity", "n": 21, "pct": 87.5 }, { "cause": "backfilled", "n": 2, "pct": 8.3 }, "… 1 more" ] },
    "graveyard": [ { "address": "0x…", "symbol": "TOKEN", "first_seen": "2026-09-06T15:11:45.153Z", "died_at": "2026-09-23T20:17:08.185Z", "lived_min": 24785, "max_liq": 38393.78, "max_gain_pct": -76.5, "first_grade": null, "last_grade": null, "cause": "liquidity" }, "… 23 more" ],
    "survivors": [ { "address": "0x…", "symbol": "TOKEN", "age_min": 9409, "liq_now": 30257184.69, "gain": 0.1, "max_gain_pct": 529.4, "first_grade": "A", "last_grade": "B" }, "… 39 more" ],
    "receipts": { "gradeAB": { "n": 0, "alive": 0, "alivePct": null, "hit2x": 0, "hit2xPct": null }, "gradeF": { "n": 17, "dead": 4, "deadPct": 23.5 }, "preDeath": { "n": 16, "died24": 4, "died24Pct": 25, "leadMin": 34.5 } }
  }
}
```

---

## `health` — Gateway health

```bash
node <skill-dir>/scripts/cli.mjs health --json
```

### Return fields (under `.data`)

| Field | Type | Description |
|---|---|---|
| `ok` | boolean | Gateway alive |
| `uptimeSec` | number | Seconds since the last restart |
| `sse` | object | Live-stream capacity (`open`, `max`, `maxPerIp`) |
| other keys | object | Internal upstream statistics; ignore |

### Real output (trimmed)

```json
{ "ok": true, "data": { "ok": true, "uptimeSec": 13331, "sse": { "open": 10, "max": 600, "maxPerIp": 64, "ips": 4 } } }
```

---

## Errors

Usage error (no request is made, exit `1`):

```json
{ "ok": false, "error": "--limit must be an integer between 1 and 100", "status": null }
{ "ok": false, "error": "only BNB Chain is supported (--chain 56)", "status": null }
{ "ok": false, "error": "unknown command \"swap\". Commands: score, token, league, wallet, copy-targets, copyable, radar, gems, survival, health", "status": null }
```

Upstream errors (exit `1`):

```json
{ "ok": false, "error": "no_score", "status": 404 }
{ "ok": false, "error": "Token sin datos en BSC", "status": 422 }
{ "ok": false, "error": "rate_limited", "status": 429, "retryAfterSec": 60 }
{ "ok": false, "error": "upstream_error", "status": 502 }
```

Network (exit `3`):

```json
{ "ok": false, "error": "network_error", "status": 0 }
{ "ok": false, "error": "timeout", "status": 0 }
```

## Notes

- All percentages are already in `%`; append `%` directly, do not multiply by 100.
- `spark[]` arrays are 30 points and are omitted from the samples above.
- `--json` is accepted on every command for parity with the other skills; the CLI always prints JSON.
- The samples above are trimmed; run the command to see every field.
