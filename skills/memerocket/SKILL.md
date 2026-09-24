---
name: memerocket
description: |
  MemeRocket on-chain intelligence for BNB Chain (BSC) memecoins, read-only and without any API key:
  (1) score — the MemeRocket Score, a 0-100 survival grade (A-F) for a BSC token with the factors behind it;
  (2) token — a full token sheet (pair, liquidity, holders, LP status, age, death risk, radar checks);
  (3) league — an on-chain league of wallets measured on our own trade census (realized PnL, win rate, streak);
  (4) wallet — the profile of one wallet (PnL by window, open positions, recent trades);
  (5) copy-targets / copyable — which wallets currently pass the copy filters and why a given wallet does or does not;
  (6) radar / gems / survival — the live radar of BSC launches, gem candidates, and the survival index of launches.
  Trigger on: "MemeRocket Score", "is this BNB meme safe", "what grade does this BSC token get", "BSC memecoin radar",
  "dying tokens", "where is money flowing in on BNB Chain", "on-chain league", "top BSC wallets by realized PnL",
  "who can I copy", "is this wallet copyable", "copyability", "survival index", "how many BSC launches survive".
  NOT for: trading execution or signing (use binance-agentic-wallet), non-BSC chains (Solana, Base, Ethereum),
  Binance exchange accounts, or price predictions.
metadata:
  author: memerocketai
  version: "1.0.0"
version: 1.0.0
license: MIT
---

# MemeRocket Skill

## Overview

MemeRocket is an assisted memecoin trading platform on BNB Chain: a public Score for every BSC token, a radar
that watches every launch on the chain, an on-chain league of wallets measured on their real trades, and
non-custodial copy trading with protected exits. This skill wraps the **read-only** part of the public gateway
(`https://mcp.memerocket.ai`) behind one zero-dependency CLI. No API key, no wallet, no signing: every command
is a plain HTTP `GET`.

The CLI owns the URL, the timeout, the argument validation and the error mapping. The agent only picks the
command and fills the arguments.

## When to Use This Skill

| User intent | Command |
|-------------|---------|
| "Is this BSC token safe / what grade does it get / MemeRocket Score of 0x…" | `score` |
| Full sheet of a token: pair, liquidity, holders, LP, age, death risk, radar checks | `token` |
| Top BSC wallets by realized PnL / win rate, on-chain league, "who is winning this week" | `league` |
| Profile of one wallet: PnL by window, streak, open positions, recent trades | `wallet` |
| "Who can I copy right now", wallets that pass the copy filters | `copy-targets` |
| "Is this wallet copyable and why / why not" | `copyable` |
| BSC memecoin radar, live launches, what is being watched right now | `radar` |
| Gem candidates (slow list) or fast entries | `gems` |
| Survival index: how many launches die, when, and why; dying tokens | `survival` |
| Is the gateway up | `health` |

## Supported Chains

| Chain | chainId |
|-------|---------|
| BSC (BNB Chain) | `56` |

Only BNB Chain is supported. `--chain` accepts `56`, `bsc` or `bnb`; anything else is rejected before any
request is made.

## Prerequisites

Node.js 18 or newer (native `fetch`). No npm install, no environment variables, no credentials.

## How to Call

```bash
node <skill-dir>/scripts/cli.mjs <command> [args] [--option value] --json
```

Output is always a JSON envelope on stdout:

```json
{ "ok": true, "data": { … } }
{ "ok": false, "error": "rate_limited", "status": 429, "retryAfterSec": 60 }
```

`--json` is accepted for parity with the other skills in the hub; the output is JSON with or without it.

## Command Tree

```
node scripts/cli.mjs
  score <token> [--chain 56] [--lang en|es|zh|pt]   # MemeRocket Score 0-100, grade A-F, factors, verdict
  token <token>                                     # token sheet
  league [--window 7d|30d|90d] [--cat all|kol|smart|whale|arbiter]
         [--sort total|pnl|winrate|copiers|earned] [--limit 20] [--cursor 0]
  wallet <address>                                  # wallet profile
  copy-targets [--limit 20]                         # wallets passing the copy filters (max 150)
  copyable <address>                                # copyability of one wallet
  radar [--limit 40]                                # live radar of BSC launches
  gems [--kind gems|fast] [--limit 20]              # gem candidates / fast entries
  survival [--period today|yesterday|7d|30d|all]    # survival index of launches
  health                                            # gateway health
```

`<token>` and `<address>` are `0x`-prefixed 40-hex addresses. Examples below use `0x0000…0000` as a placeholder.

## Commands

| Command | Purpose | Required args | Example |
|---------|---------|---------------|---------|
| `score` | Score 0-100, grade, factors, verdict, risk block | `token` | `node <skill-dir>/scripts/cli.mjs score 0x0000000000000000000000000000000000000000 --json` |
| `token` | Token sheet (pair, LP, holders, death risk, radar, momentum, history) | `token` | `node <skill-dir>/scripts/cli.mjs token 0x0000000000000000000000000000000000000000 --json` |
| `league` | On-chain league of wallets | none | `node <skill-dir>/scripts/cli.mjs league --window 7d --cat smart --sort pnl --limit 20 --json` |
| `wallet` | Wallet profile with 7d/30d/90d stats | `address` | `node <skill-dir>/scripts/cli.mjs wallet 0x0000000000000000000000000000000000000000 --json` |
| `copy-targets` | Wallets currently passing the copy filters | none | `node <skill-dir>/scripts/cli.mjs copy-targets --limit 20 --json` |
| `copyable` | Copy filters passed / failed for one wallet | `address` | `node <skill-dir>/scripts/cli.mjs copyable 0x0000000000000000000000000000000000000000 --json` |
| `radar` | Live radar: candidates, entries, funnel, market regime | none | `node <skill-dir>/scripts/cli.mjs radar --limit 40 --json` |
| `gems` | Gem candidates (`gems`) or fast entries (`fast`) | none | `node <skill-dir>/scripts/cli.mjs gems --kind gems --json` |
| `survival` | Survival index of BSC launches | none | `node <skill-dir>/scripts/cli.mjs survival --period 7d --json` |
| `health` | Gateway health | none | `node <skill-dir>/scripts/cli.mjs health --json` |

## The MemeRocket Score

`score` returns a number `0-100`, a `grade` and a `verdict`, plus the list of `factors` (each with a stable
`key`, its `pts` contribution and a human `label`) and a `risk` block (holders, LP, taxes, mintability,
market cap, liquidity-to-market-cap ratio, age).

| Score | Grade | Verdict |
|-------|-------|---------|
| 80-100 | `A` | LIKELY SURVIVOR |
| 65-79 | `B` | SOLID, WITH CAVEATS |
| 50-64 | `C` | UNCERTAIN |
| 35-49 | `D` | HIGH RISK |
| 0-34 | `F` | DEATH VERY LIKELY |

A confirmed honeypot is always `0 · F` (`verdict_key: "honeypot"`); a token with no pool with liquidity is
`0 · F` (`verdict_key: "dead"`).

**Caps.** Some conditions put a ceiling on the grade regardless of the other factors. They show up as a
factor with a `_cap` key and negative `pts`:

| Factor key | Condition | Ceiling |
|------------|-----------|---------|
| `liq_mcap_cap` | market cap ≥ $1M, pool < $1M and pool / market cap < 0.1 % | 49 (`D`) |
| `liq_mcap_cap` | same, ratio < 0.5 % | 64 (`C`) |
| `top10_cap` | top-10 wallets hold > 80 % / > 50 % of supply | 70 / 85 |
| `wallet_cap` | one non-exchange, non-locker wallet holds > 50 % / > 30 % | 49 / 64 |
| `mintable_cap` | mintable and owner has not renounced | 64 (`C`) |
| `exotic_quote` | only traded against a non-standard quote token (USD values unverifiable) | 49 (`C` label, capped) |

The Score is a survival estimate calibrated on MemeRocket's own dataset of BSC launches. It is not a buy or
sell recommendation and a high grade does not mean a token is safe.

## Rules

- **Only BSC (`56`).** The CLI rejects any other `--chain` before calling the gateway.
- **Read-only, no auth.** Nothing in this skill signs, trades, or needs a key. For execution use
  `binance-agentic-wallet`.
- **Rate limit on `score`**: 60 requests per minute per IP; the gateway caches each token's Score for
  2 minutes. On `429` the envelope carries `retryAfterSec` — wait, do not retry in a loop.
- **Stable keys, English labels.** Use `key`, `code`, `level`, `verdict_key` and numeric fields for logic.
  Free-text fields (`label`, `verdict`, `reasons` strings) are for display; the CLI normalizes the gateway's
  labels to English and removes internal provenance (which upstream sources or nodes fed a number). What you
  get is MemeRocket's own measurement; never parse free text.
- **`league` coverage is declared, not assumed.** `coverage.scope` says what was measured and since when;
  `coverage.degraded: true` means the window asked for is longer than the data kept. `pnl.usd` is realized
  (FIFO on closed positions), `pnl.unrealized_usd` is open at live price, `pnl.total_usd` is the sum and the
  default sort (`--sort total`). Other leaderboards mix these differently; compare like with like.
- **Copyability is a set of filters, not an endorsement.** `copyable: true` means the wallet passes the
  seven blocking filters (`category`, `machine_tags`, `wash`, `contract`, `no_activity`, `self`, `funded`).
  `warnings[]` (e.g. `low_weight`, `losing_30d`, `bundler`, `inactive`, `relay`) do not block but must be
  shown to the user. `copy.reasons[]` lists every threshold with `ok`, the value `v` and the `need`.
- **`gems.rows` is often empty.** That is the normal state of a strict filter; `candidates.rows` are the
  closest tokens and `fails` counts why the universe was rejected.
- **Timestamps are ISO-8601 strings**, USD amounts are numbers, percentages are already `%` (do not multiply
  by 100). `spark[]` is a 30-point sparkline.
- **Never present any token, wallet or list as safe or recommended.** Report the numbers and the caveats.

## Error Codes

The CLI maps HTTP status + gateway body to a stable `error` string. Translate to natural language for users;
never show raw codes.

| `status` | `error` | Meaning | User-facing message |
|----------|---------|---------|---------------------|
| `null` | usage text | Bad arguments (address, enum, range, unknown command) | Fix the argument; nothing was requested |
| 404 | `no_score` / `not found` | No Score for this token, or route not found | No score is available for this token |
| 404 | `wallet_not_in_census` | Wallet has no trades in the census | No on-chain activity is recorded for this wallet |
| 422 | `no_bsc_market_data` | Token has no market data on BSC | This token has no market data on BNB Chain |
| 429 | `rate_limited` | Per-IP quota exceeded (`retryAfterSec`) | Please wait a minute and try again |
| 5xx | `upstream_error` / body error | Gateway error | The service is temporarily unavailable |
| 0 | `network_error` / `timeout` | No connection or > 20 s | Could not reach the service |

Exit codes: `0` success · `1` usage or upstream error · `3` network failure or timeout.

## Display Templates

**Score**

```
{symbol} · MemeRocket Score {score} · {grade} — {verdict}
Factors: {label} ({pts:+d}), …
Risk: holders {risk.holders} · top-10 {risk.top10_pct}% · LP locked {risk.lp_locked} · sell tax {risk.tax_sell}% · liq/mcap {risk.liq_vs_mcap_pct}%
```

**League row**

```
#{rank} {alias} [{cat}] · PnL {pnl.total_usd} USD (realized {pnl.usd} · open {pnl.unrealized_usd}) · win rate {winrate}% · trades {trades} · streak {streak}
```

**Copyability**

```
{label}: {copyable ? "passes the copy filters" : "blocked by " + fails.join(", ")}
Warnings: {warnings[].code} · Cap: {copy.capBnb} BNB · level {copy.level}
```

Always end with: `⚠️ This data is for reference only and does not constitute investment advice. Always conduct your own research.`

## Full Reference

- [`references/cli.md`](references/cli.md) — every command with parameters, return fields and real (trimmed, anonymized) output
- [`references/api.md`](references/api.md) — the underlying HTTP endpoints, query parameters, error bodies and rate limits
- [`references/mcp.md`](references/mcp.md) — the MemeRocket MCP server: how to connect it from Claude Code and other MCP clients, and which tools it exposes
