## Implementation plan: Phase C.7 — Dynamic OpenCode models & sub-agent optimization

### What we built
Enabled Agent Deck to dynamically inspect and load all truly available models configured in the user's OpenCode environment (providers, OpenCode Go subscription, and OpenCode Zen free pool), provided an interactive grouped model selector for any agent (Lead, Workers, custom agents) in the retro UI, and configured automated subagent model prioritization (`explore`, `summary`, `compaction`) that directs auxiliary tasks to free or contributor models to save primary reasoning tokens.

### Team decisions implemented
- **Lead Agent default model**: `opencode/nemotron-3.5-super-vl-free` when OpenCode is selected and no model is specified.
- **Sub-agents priority defaults**:
  1. `opencode/nemotron-3.5-super-vl-free`
  2. `opencode/deepseek-v4.1-flash-free`
  3. `meta/muse-spark-1.3-contributor`
  4. Any other free model (`isFree`)
  5. Any ultra-cheap model (`isCheap`)
- **Interactive UI Model Selector**: Grouped by 🟢 Free, ⚡ Ultra-Cheap, and connected providers (Google, Groq, Meta, Anthropic, OpenAI, etc.), with a live 🔄 Refresh button and custom model entry fallback.
- **Sub-agent Strategy Card**: Added to Team Settings allowing users to view the auto-resolved subagent model or configure an office-wide override.

### How it works
1. **Dynamic Model Discovery (`server/opencodeModels.ts`)**:
   - Queries `opencode models` with an in-memory 60s cache and on-demand refresh.
   - Parses model lines into `OpencodeModelInfo` with `isFree` and `isCheap` flags.
   - Robust fallback list in case the OpenCode CLI is temporarily missing or unauthenticated.
2. **Sub-agent Resolution (`server/opencodeModels.ts`)**:
   - Checks priority order (`meta/muse-spark-1.3-contributor` > `opencode/nemotron-3.5-super-vl-free` > `opencode/deepseek-v4.1-flash-free` > free > cheap).
   - Generates `.opencode/opencode.json` with primary model, `agents.explore`, `agents.summary`, `agents.compaction` and `small_model` pre-configured.
3. **HQ Store & Commands (`server/hub.ts`, `server/commands.ts`)**:
   - `OfficeSnapshot` includes `opencodeModels`.
   - `refreshOpencodeModels` command triggers live discovery and emits `opencode.models` event to all connected clients.
   - On server startup and setup checks, models are automatically refreshed.
4. **UI Components (`src/ui/settings/OpencodeModelSelect.tsx`, `TeamSettings.tsx`, `WelcomeModal.tsx`)**:
   - Responsive retro-themed model picker for OpenCode agents.
   - Dynamic `<datalist id="opencode-models">` populated with all live models.
