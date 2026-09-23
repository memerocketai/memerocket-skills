# MemeRocket for agents

Public, read-only pieces of [MemeRocket](https://memerocket.ai) — assisted memecoin trading on BNB Chain — for AI agents and developers.

| Folder | What it is |
|---|---|
| `skills/memerocket/` | Agent skill (Claude Code, OpenClaw and compatible hubs): MemeRocket Score, token sheet, on-chain league, wallet profile, copyability, radar, gems, survival. Zero dependencies, no API key. Submitted to the [Binance Skills Hub](https://github.com/binance/binance-skills-hub). |
| `docs/api.md` | The public HTTP endpoints behind the skill, with parameters, error bodies and rate limits. |
| `docs/mcp.md` | The MemeRocket MCP server: how to connect it and which tools it exposes. |

## Quick start

```bash
npx skills add https://github.com/memerocketai/memerocket-skills          # install the skill
node skills/memerocket/scripts/cli.mjs score <token address> --json     # or call the CLI directly
```

Only BNB Chain (chain id 56). Everything here is informational: nothing is investment advice, no asset is presented as safe or recommended, and every number carries its window and coverage.

## License

MIT for everything in this repository. The MemeRocket product itself is proprietary.
