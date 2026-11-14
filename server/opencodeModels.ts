// Dynamic OpenCode model discovery and sub-agent cost optimization.

import { run } from "./lib/exec";
import type { OpencodeModelInfo } from "../src/data/types";

export const DEFAULT_OPENCODE_LEAD_MODEL = "opencode/nemotron-3.5-super-vl-free";

export const DEFAULT_OPENCODE_SUBAGENT_PRIORITIES = [
  "opencode/nemotron-3.5-super-vl-free",
  "opencode/deepseek-v4.1-flash-free",
  "meta/muse-spark-1.3-contributor",
] as const;

let cachedModels: OpencodeModelInfo[] | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60_000;

function parseModelLine(line: string): OpencodeModelInfo {
  const trimmed = line.trim();
  const slash = trimmed.indexOf("/");
  const provider = slash > 0 ? trimmed.slice(0, slash) : "opencode";
  const name = slash > 0 ? trimmed.slice(slash + 1) : trimmed;
  const isFree = provider === "opencode" || trimmed.endsWith("-free") || trimmed.includes("-free");
  const isCheap =
    isFree ||
    provider === "groq" ||
    trimmed.includes("flash") ||
    trimmed.includes("lite") ||
    trimmed.includes("spark") ||
    trimmed.includes("haiku") ||
    trimmed.includes("mini") ||
    trimmed.includes("contributor");

  return {
    id: trimmed,
    provider,
    name,
    isFree,
    isCheap,
  };
}

/** Fallback models in case opencode CLI is temporarily not in PATH or not yet authenticated */
export function getFallbackOpencodeModels(): OpencodeModelInfo[] {
  return [
    "meta/muse-spark-1.3",
    "meta/muse-spark-1.3-contributor",
    "opencode/nemotron-3.5-super-vl-free",
    "opencode/deepseek-v4.1-flash-free",
    "opencode/glm-5.3-flash-free",
    "opencode/minimax-m3.1-flash-free",
    "opencode/mimo-v2.6-flash-free",
    "opencode/beam-free",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-pro",
    "anthropic/claude-3-7-sonnet",
    "openai/o3-mini",
  ].map(parseModelLine);
}

/**
 * Queries `opencode models` to list all available models for the current user's environment.
 * Results are cached in memory for 60 seconds unless forceRefresh is true.
 */
export async function getAvailableOpencodeModels(forceRefresh = false): Promise<OpencodeModelInfo[]> {
  const now = Date.now();
  if (!forceRefresh && cachedModels && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedModels;
  }

  try {
    const res = await run("opencode", ["models"], { timeoutMs: 10_000 });
    if (res.ok && res.stdout.trim()) {
      const lines = res.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("=") && !l.includes(" "));

      if (lines.length > 0) {
        cachedModels = lines.map(parseModelLine);
        lastFetchedAt = now;
        return cachedModels;
      }
    }
  } catch {
    /* opencode binary not available or timed out */
  }

  return cachedModels ?? getFallbackOpencodeModels();
}

/**
 * Resolves the optimal model for OpenCode subagents (explore, summary, compaction).
 * Follows the team's priority decision:
 * 1. Explicit override if provided.
 * 2. meta/muse-spark-1.3-contributor
 * 3. opencode/nemotron-3.5-super-vl-free
 * 4. opencode/deepseek-v4.1-flash-free
 * 5. Any other free model (isFree)
 * 6. Any other ultra-cheap model (isCheap)
 */
export function resolveOpencodeSubagentModel(
  availableModels: OpencodeModelInfo[] = [],
  override?: string | null,
): string {
  if (override && override.trim()) {
    return override.trim();
  }

  const modelMap = new Map<string, OpencodeModelInfo>();
  for (const m of availableModels) {
    modelMap.set(m.id.toLowerCase(), m);
    modelMap.set(m.name.toLowerCase(), m);
  }

  // Check team prioritized defaults
  for (const priority of DEFAULT_OPENCODE_SUBAGENT_PRIORITIES) {
    const target = priority.toLowerCase();
    const found = modelMap.get(target) || availableModels.find((m) => m.id.toLowerCase().includes(target) || m.name.toLowerCase().includes(target));
    if (found) {
      return found.id;
    }
  }

  // Any other free model
  const freeModel = availableModels.find((m) => m.isFree);
  if (freeModel) return freeModel.id;

  // Any cheap model
  const cheapModel = availableModels.find((m) => m.isCheap);
  if (cheapModel) return cheapModel.id;

  // Fallback to top team subagent model
  return DEFAULT_OPENCODE_SUBAGENT_PRIORITIES[0];
}
