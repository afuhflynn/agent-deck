import { useState } from "react";
import { nextAgentName } from "../../data/names";
import { CLI_LABEL, type AgentCli, type AgentConfig, type AgentMode } from "../../data/types";
import { officeActions, useOffice } from "../../store/office";
import { agentPalette } from "../../theme/tokens";
import { Field, Portrait, SectionTitle } from "../kit";
import { CommitInput } from "./controls";
import { RemoveAgentDialog } from "./RemoveAgentDialog";
import { OpencodeModelSelect } from "./OpencodeModelSelect";

export function CliSelect({ value, onChange }: { value: AgentCli; onChange: (v: AgentCli) => void }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value as AgentCli)} aria-label="Coding agent">
      {(Object.keys(CLI_LABEL) as AgentCli[]).map((c) => (
        <option key={c} value={c}>
          {CLI_LABEL[c]}
        </option>
      ))}
    </select>
  );
}
export const ROLE_SUGGESTIONS = ["Developer", "QA", "Designer", "Docs", "DevOps", "Security"];

export function TeamSettings() {
  const team = useOffice((s) => s.snap?.config.team);
  const [open, setOpen] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AgentConfig | null>(null);
  if (!team) return null;
  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionTitle>Team · {team.length} agents</SectionTitle>
        <p className="mb-3 text-[14px] text-muted">
          Changes to model, mode or folder apply the next time the agent starts. One lead plans and assigns work. Every other agent gets its own desk, sandbox and (optionally) environment. The office grows as you add agents.
        </p>
        <div className="flex flex-col gap-2">
          {team.map((a) => (
            <AgentRow key={a.id} agent={a} expanded={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onRemove={() => setRemoving(a)} />
          ))}
        </div>
      </section>
      <AddAgent />
      {team.some((a) => a.cli === "opencode") && <OpencodeSubagentsSettings />}
      {removing && <RemoveAgentDialog agent={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}

function OpencodeSubagentsSettings() {
  const workflow = useOffice((s) => s.snap?.config.workflow);
  const models = useOffice((s) => s.snap?.opencodeModels) ?? [];
  const current = workflow?.opencodeSubagentModel ?? "";

  const resolved =
    models.find((m) => m.id === "meta/muse-spark-1.3-contributor")?.id ||
    models.find((m) => m.id === "opencode/nemotron-3.5-super-vl-free")?.id ||
    models.find((m) => m.id === "opencode/deepseek-v4.1-flash-free")?.id ||
    models.find((m) => m.isFree)?.id ||
    "meta/muse-spark-1.3-contributor";

  return (
    <section className="border-[3px] border-ink bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>OpenCode Sub-agents · Cost Optimization</SectionTitle>
        <span className="border-2 border-ink bg-cream-2 px-2 py-0.5 text-[11px] font-bold text-ink">
          {current ? "Custom Model" : "Auto Free/Cheap Tier"}
        </span>
      </div>
      <p className="mb-3 text-[14px] text-muted">
        OpenCode agents spawn auxiliary sub-agents for exploration, session summary compression, and token compaction.
        JSM HQ automatically directs these sub-tasks to free or contributor models so your main reasoning budget isn&apos;t consumed.
      </p>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 max-w-[550px]">
        <Field
          label="Sub-agent Model Strategy"
          hint={current ? `Using custom sub-agent model: ${current}` : `Auto-resolved: ${resolved} (Priority: muse-spark-1.3-contributor → nemotron-3.5-super-vl-free → deepseek-v4.1-flash-free)`}
        >
          <OpencodeModelSelect
            value={current}
            placeholder={`Auto: ${resolved}`}
            onChange={(val) => officeActions.updateWorkflow({ opencodeSubagentModel: val || null })}
          />
        </Field>
      </div>
    </section>
  );
}

function AgentRow({ agent, expanded, onToggle, onRemove }: { agent: AgentConfig; expanded: boolean; onToggle: () => void; onRemove: () => void }) {
  const set = (patch: Parameters<typeof officeActions.updateAgent>[1]) => officeActions.updateAgent(agent.id, patch);
  return (
    <div className="border-[3px] border-ink bg-white">
      <div className="grid grid-cols-[40px_1fr_1fr_150px_130px_auto] items-end gap-2.5 p-2.5">
        <Portrait color={agent.color} lead={agent.isLead} />
        <Field label="Name">
          <CommitInput className="field" value={agent.name} onCommit={(v) => v.trim() && set({ name: v.trim() })} />
        </Field>
        <Field label="Role">
          {agent.isLead ? (
            <div className="field flex h-9 items-center bg-cream-2">Lead</div>
          ) : (
            <CommitInput className="field" value={agent.role} list="role-suggestions" onCommit={(v) => v.trim() && set({ role: v.trim() })} />
          )}
        </Field>
        <Field label="Agent">
          <CliSelect value={agent.cli} onChange={(cli) => set({ cli })} />
        </Field>
        <Field label="Runs in">
          <select className="field" value={agent.mode} onChange={(e) => set({ mode: e.target.value as AgentMode })}>
            <option value="sandbox">Sandbox</option>
            <option value="local">Local</option>
          </select>
        </Field>
        <div className="flex gap-1.5">
          <button className="btn px-2 text-[13px]" aria-expanded={expanded} onClick={onToggle}>
            {expanded ? "Less" : "More"}
          </button>
          {!agent.isLead && (
            <button
              className="btn px-2 text-[13px] text-red"
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {agent.mode === "local" && (
        <div className="border-t-2 border-dashed border-cream-3 px-3 py-1 text-[12px] text-muted">
          Local mode runs plain <code>{agent.cli}</code> in the agent's own folder. Permission prompts stay on.
        </div>
      )}
      {expanded && (
        <div className="grid grid-cols-2 gap-3 border-t-[3px] border-ink bg-cream p-3">
          <Field label="Colour">
            <div className="flex flex-wrap gap-1.5">
              {agentPalette.map((c) => (
                <button
                  key={c}
                  className="h-6 w-6 border-[3px] border-ink"
                  style={{ background: c, outline: c === agent.color ? "3px solid #241a2e" : undefined, outlineOffset: 1 }}
                  aria-label={`Colour ${c}`}
                  onClick={() => set({ color: c })}
                />
              ))}
            </div>
          </Field>
          <Field label="Start with model" hint="Optional. Leave empty to use the CLI's default — you can always switch with /model in the terminal. Set it to keep a choice across restarts (e.g. Opus for the lead).">
            {agent.cli === "opencode" ? (
              <OpencodeModelSelect
                value={agent.model}
                isLead={agent.isLead}
                onChange={(m) => set({ model: m.trim() })}
              />
            ) : (
              <CommitInput
                className="field"
                value={agent.model}
                placeholder={`${CLI_LABEL[agent.cli]} default`}
                list={agent.cli === "codex" ? "codex-models" : "claude-models"}
                onCommit={(v) => set({ model: v.trim() })}
              />
            )}
          </Field>
          <Field label="Skills" hint="Comma separated. Copied into the agent's .claude/skills.">
            <CommitInput
              className="field"
              value={agent.skills.join(", ")}
              onCommit={(v) => set({ skills: v.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Folder" hint="Leave empty and HQ keeps its own clone of the repo for this agent. Or enter an existing git folder.">
              <CommitInput
                className="field font-term text-[17px]"
                value={agent.workspacePath ?? ""}
                placeholder={`HQ-managed: ~/.jsmhq/…/${agent.id}`}
                onCommit={(v) => set({ workspacePath: v.trim() || null })}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="ROLE.md" hint="Who this agent is. HQ adds the team, rules and tools, writes it to .jsmhq-role.md in the agent's folder (never committed) and loads it when the session starts. A ROLE.md the folder already has is included too, never overwritten.">
              <CommitInput multiline className="field h-[120px] resize-y font-term text-[17px] leading-tight" value={agent.roleMd} onCommit={(v) => set({ roleMd: v })} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAgent() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Developer");
  const [cli, setCli] = useState<AgentCli>("claude");
  const [mode, setMode] = useState<AgentMode>("sandbox");
  const team = useOffice((s) => s.snap?.config.team) ?? [];
  const opencodeModels = useOffice((s) => s.snap?.opencodeModels) ?? [];
  const suggested = nextAgentName(team.map((a) => a.name));
  const add = () => {
    officeActions.addAgent({ name: name.trim() || suggested, role, cli, mode });
    setName("");
  };
  return (
    <section className="border-[3px] border-dashed border-ink p-3">
      <SectionTitle>Add an agent</SectionTitle>
      <form
        className="grid grid-cols-[1fr_1fr_150px_130px_auto] items-end gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Field label="Name">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={suggested} />
        </Field>
        <Field label="Role">
          <input className="field" value={role} list="role-suggestions" onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="Agent">
          <CliSelect value={cli} onChange={setCli} />
        </Field>
        <Field label="Runs in">
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value as AgentMode)}>
            <option value="sandbox">Sandbox</option>
            <option value="local">Local</option>
          </select>
        </Field>
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      <p className="mt-2 text-[12px] text-muted">
        HQ starts a new sandbox with the lead's network policy and allows it to reach HQ at host.docker.internal.
      </p>
      <datalist id="codex-models">
        <option value="gpt-5.6-sol" />
      </datalist>
      <datalist id="opencode-models">
        {opencodeModels.length > 0 ? (
          opencodeModels.map((m) => <option key={m.id} value={m.id} />)
        ) : (
          <>
            <option value="meta/muse-spark-1.3" />
            <option value="meta/muse-spark-1.3-contributor" />
            <option value="opencode/nemotron-3.5-super-vl-free" />
            <option value="opencode/deepseek-v4.1-flash-free" />
            <option value="google/gemini-2.5-flash" />
          </>
        )}
      </datalist>
      <datalist id="claude-models">
        <option value="opus" />
        <option value="sonnet" />
        <option value="haiku" />
      </datalist>
      <datalist id="role-suggestions">
        {ROLE_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </section>
  );
}
