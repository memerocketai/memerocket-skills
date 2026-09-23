# memerocket — MCP server

Besides the public HTTP endpoints wrapped by the CLI, MemeRocket exposes an **MCP server** (Model Context
Protocol) so an agent can call the same intelligence as native tools instead of shelling out to the CLI.

| | |
|---|---|
| URL | `https://mcp.memerocket.ai/mcp` |
| Transport | Streamable HTTP (`POST` only; `GET` / `DELETE` answer `405 stateless server: use POST`) |
| Auth | `Authorization: Bearer <token>` **or** OAuth 2.1 (discovery at `/.well-known/oauth-protected-resource`) |
| Token | Issued at <https://memerocket.ai/mcp> — the free trial is 50 tool calls per day, one token per wallet; `tools/list`, `initialize` and `ping` are not metered |
| Unauthenticated call | `401` with `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"` |
| Quota exceeded | JSON-RPC error `-32029` ("daily quota exhausted, resets at 00:00 UTC") |
| Tool not in plan | JSON-RPC error `-32001` |

The MCP server is **read-only**: it never asks for keys, never signs, never holds funds.

## Connect from Claude Code

With OAuth (the browser opens once, the trial is issued with a click):

```bash
claude mcp add memerocket --transport http https://mcp.memerocket.ai/mcp
```

With a token you already obtained at <https://memerocket.ai/mcp>:

```bash
claude mcp add memerocket --transport http https://mcp.memerocket.ai/mcp \
  --header "Authorization: Bearer <token>"
```

Verify with `claude mcp list` and ask something like *"MemeRocket Score of 0x…"*.

## Connect from other MCP clients

**Cursor** (`.cursor/mcp.json`) — Settings → MCP → Add new server, or:

```json
{
  "mcpServers": {
    "memerocket": { "url": "https://mcp.memerocket.ai/mcp" }
  }
}
```

**Claude Desktop / claude.ai** — Settings → Connectors → Add custom connector → paste the URL and approve in
the browser (OAuth).

**ChatGPT** — Settings → Connectors → Create (Developer mode) → paste the URL; OAuth handles the rest.

**Any MCP client** — transport: streamable HTTP; auth: OAuth 2.1 or a static `Authorization: Bearer <token>`
header. A generic JSON config with a header:

```json
{
  "mcpServers": {
    "memerocket": {
      "url": "https://mcp.memerocket.ai/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

Never paste the token into a prompt or commit it; keep it in the client config or an environment variable.

## Tools

The catalogue is exposed through the standard `tools/list` call and is the source of truth. What follows is
what the server exposed on 2026-09-23.

### Default toolset (what a connected client sees)

By default a client loads the **14 essential tools** — the server keeps the default set small on purpose,
because large tool catalogues degrade model performance. The full catalogue is available on request to the
MemeRocket team.

| Tool | What it returns |
|---|---|
| `memerocket_score` | The MemeRocket Score of a BSC token (same data as `GET /score/{address}`) |
| `gem_radar` | The live radar of BSC launches (same data as `GET /radar` / `GET /gems`) |
| `gem_survival_stats` | Survival statistics of BSC launches (same data as `GET /survival/v3`) |
| `market_weather` | Market regime (green / yellow / red) with its signals |
| `token_full_report` | Composite report of a token: market, security, holders, flow |
| `token_security_audit` | Security audit of a token contract (honeypot, taxes, ownership, mintability) |
| `bundle_check` | Detects bundled buys at launch |
| `market_search` | Search a token by name, symbol or address across DEX pairs |
| `market_token_pairs` | All pairs of a token with liquidity and volume |
| `screener_scan` | Screener with filters (liquidity, volume, age, holders) |
| `stream_first_buyers` | First buyers of a token from the on-chain stream |
| `flow_trenches` | Young launches with early flow |
| `news_search` | News search for a token or narrative |
| `sources_status` | Health of the underlying data sources |

### Full catalogue (by family)

The complete surface is **164 tools**, named by function (prefix = family). Counts as published on the
MemeRocket MCP page:

| Family (prefix) | Tools | Examples |
|---|---|---|
| Own verdicts (`memerocket_*`, `gem_*`, `token_*`, `bundle_check`, `market_weather`) | 7 | `memerocket_score` · `token_full_report` · `gem_radar` |
| Flow and smart money (`flow_*`) | 14 | `flow_smart_money` · `flow_kol` · `flow_trenches` |
| Market, pools and screener (`market_*`, `pool_*`, `screener_*`) | 41 | `market_search` · `pool_ohlcv` · `screener_scan` |
| Chain and holders (`chain_*`, `scan_*`, `rpc_*`, `holders_*`) | 41 | `chain_token_holders` · `scan_funded_by` · `rpc_pair_reserves` |
| Security (`security_*`, `honeypot_*`, `sniff_*`) | 16 | `security_token` · `honeypot_check` · `sniff_token_score` |
| Real-time stream (`stream_*`) | 7 | `stream_new_launches` · `stream_first_buyers` |
| Social, macro and calendar (`x_*`, `news_*`, `trends_*`, `macro_*`, `predict_*`, `calendar_*`, `chart_*`, `swap_*`) | 38 | `x_search_recent` · `macro_trending` · `predict_markets_search` |

Tool results come back as text (JSON), truncated at 60 000 characters when larger. Tool descriptions never
name the underlying data providers; neither should the agent.

## HTTP vs MCP — which one to use

| Need | Use |
|---|---|
| Score, token sheet, league, wallet, copyability, radar, gems, survival — no key, no setup | The CLI in this skill (`scripts/cli.mjs`) |
| The same as native tools inside an MCP-capable agent, plus security audit, screener, first buyers, news | The MCP server with a trial token |
| Trading execution | Neither — use `binance-agentic-wallet` |
