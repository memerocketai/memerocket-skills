# MemeRocket Skill

Read-only on-chain intelligence for BNB Chain (BSC) memecoins: the MemeRocket Score (0-100, A-F), a full
token sheet, an on-chain league of wallets measured on their real trades, wallet profiles, copyability
checks, the live radar of BSC launches, gem candidates and the survival index of launches.

Everything goes through one zero-dependency Node.js script that calls the public MemeRocket gateway with
plain HTTP `GET` requests. No API key, no wallet, no signing.

## Directory Structure

```
memerocket/
├── SKILL.md                 # Skill instructions: when to use, command tree, Score semantics, rules, templates
├── README.md                # This file
├── references/
│   ├── cli.md               # Every command: parameters, return fields, real (trimmed, anonymized) output
│   ├── api.md               # The underlying HTTP endpoints, query parameters, error bodies, rate limits
│   └── mcp.md               # The MemeRocket MCP server: how to connect it, which tools it exposes
└── scripts/
    ├── cli.mjs              # The CLI (Node >= 18, native fetch, no dependencies)
    └── cli.test.mjs         # Unit tests (vitest, fetch mocked, no network)
```

## Dependencies

- **Node.js 18 or newer.** The script is an ES module and uses the built-in `fetch` and `AbortController`.
- No npm install. No environment variables. No credentials.
- Network access to `https://mcp.memerocket.ai`.

## Running the script

```bash
node scripts/cli.mjs                                    # lists the commands
node scripts/cli.mjs score 0x0000000000000000000000000000000000000000 --json
node scripts/cli.mjs league --window 7d --cat smart --sort pnl --limit 20 --json
node scripts/cli.mjs copyable 0x0000000000000000000000000000000000000000 --json
node scripts/cli.mjs survival --period 7d --json
```

Every command prints one JSON envelope to stdout: `{ "ok": true, "data": … }` or
`{ "ok": false, "error": "…", "status": <http status or null> }`. Exit codes: `0` success, `1` usage or
upstream error, `3` network failure or timeout (20 s). Only BSC (`56`) is supported; any other `--chain`
is rejected before a request is made.

What the script does, step by step: parse `argv` → validate the address / enum / range → build the gateway
URL → one `GET` with a 20 s timeout and the `memerocket-skill/1.0.0` User-Agent → map the HTTP status and
body to the envelope. It never writes to disk and never evaluates remote content.

## Testing

```bash
npx vitest run --config /dev/null skills/memerocket   # from the hub root
```

The tests cover argument parsing, URL construction for every command, enum / range validation, the error
mapping and the output envelope, with `fetch` mocked. They make no network requests.

## Data notes

- The Score is a survival estimate calibrated on MemeRocket's own dataset of BSC launches. It is not a buy
  or sell recommendation and a high grade does not mean a token is safe.
- League and wallet PnL is measured on the tokens MemeRocket watches, from the moment it started watching
  them (`coverage` in the response says exactly how much).
- Copyability is a set of structural filters (not a bot, not wash trading, not a contract, active), not a
  performance guarantee. Warnings must always be shown.
- The `score` endpoint is limited to 60 requests per minute per IP.

## Disclaimer

This skill is an informational tool only. Its outputs are provided "as is", do not constitute investment,
financial or trading advice, and are not a recommendation to buy, sell or hold any asset. Digital asset
prices are subject to high market risk and volatility. Always conduct your own research.
