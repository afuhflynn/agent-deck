## Implementation plan: Phase C.6 — OpenCode adapter

### What we're building
Agents can be **Claude Code**, **Codex**, or **OpenCode**. All get full HQ support: hook-driven status, the Team MCP (`hq`), busy delivery via Stop/idle handover, and ROLE.md without touching the repo. CLI-specific bits live in per-CLI adapters.

### Verified live (OpenCode v2.3.0 & sbx)
- Docker Sandboxes (`sbx v0.51.0`) has built-in support for `opencode` (`sbx run opencode`).
- Local config `.opencode/config.json` supports ambient instructions (`instructions: [".jsmhq-role.md"]`) and remote MCP (`mcp.servers.hq`).
- Standalone zero-dependency plugin `.opencode/plugins/hq.mjs` integrates with OpenCode v2's event bus (`session.created`, `session.idle`, `message.updated`, `tool.execute.before`, `tool.execute.after`, `permission.ask`) to POST state hooks to HQ.
- Permissions block whitelists `mcp:hq:*` so agents run autonomously without confirmation deadlocks.
- Entire `.opencode` directory is excluded via `.git/info/exclude`.

### Decisions
- `AgentConfig.cli: "claude" | "codex" | "opencode"` (default `claude`).
- Zero-dependency local plugin (`.opencode/plugins/hq.mjs`) avoids runtime `npm install` for sub-500ms startup.
- Setup checks: verify `opencode --version` for agents running in Local mode.
- Curated model datalists: Free (Zen), OpenCode Go plans, and BYOK frontier models.

### How to build it
1. Types in `src/data/types.ts`: extend `AgentCli` and `SetupCheckId`.
2. Agent files in `server/agentFiles.ts`: `writeOpencodeFiles()`, `.opencode/config.json`, `.opencode/plugins/hq.mjs`.
3. Adapters in `server/adapters.ts`: `opencode` adapter with `writeFiles` and `launch`.
4. Sessions & commands: screen regex in `server/sessions.ts`, CLI normalization in `server/commands.ts`.
5. Setup diagnostics in `server/setup.ts`: `checkOpencode()`.
6. Skills in `server/skills.ts`: add `.opencode/skills` and `-a opencode`.
7. UI in `src/ui/settings/TeamSettings.tsx` & `src/ui/drawers/AgentDrawer.tsx`.
