import { useState } from "react";
import { OPENCODE_LEAD_DEFAULT_MODEL, type OpencodeModelInfo } from "../../data/types";
import { officeActions, useOffice } from "../../store/office";

interface Props {
  value: string;
  onChange: (val: string) => void;
  isLead?: boolean;
  className?: string;
  placeholder?: string;
}

export function OpencodeModelSelect({ value, onChange, isLead, className = "field", placeholder }: Props) {
  const models = useOffice((s) => s.snap?.opencodeModels) ?? [];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState(value);

  const defaultPlaceholder = isLead ? `Default: ${OPENCODE_LEAD_DEFAULT_MODEL}` : "OpenCode default";
  const displayPlaceholder = placeholder || defaultPlaceholder;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      officeActions.refreshOpencodeModels();
      // brief visual indication
      setTimeout(() => setIsRefreshing(false), 800);
    } catch {
      setIsRefreshing(false);
    }
  };

  // Group models
  const freeModels = models.filter((m) => m.isFree);
  const cheapModels = models.filter((m) => m.isCheap && !m.isFree);

  // Group remainder by provider
  const providerGroups = new Map<string, OpencodeModelInfo[]>();
  for (const m of models) {
    const list = providerGroups.get(m.provider) ?? [];
    list.push(m);
    providerGroups.set(m.provider, list);
  }

  // Check if current value exists in known models
  const isKnown = !value || models.some((m) => m.id === value);

  if (customMode || (!isKnown && value)) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          className={`${className} flex-1`}
          value={customInput}
          placeholder="e.g. meta/muse-spark-1.3"
          onChange={(e) => setCustomInput(e.target.value)}
          onBlur={() => onChange(customInput.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(customInput.trim());
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
        <button
          type="button"
          className="btn h-9 px-2 text-[12px] border-[3px] border-ink"
          title="Back to model list"
          onClick={() => {
            setCustomMode(false);
            if (!isKnown) {
              setCustomInput("");
              onChange("");
            }
          }}
        >
          List
        </button>
        <button
          type="button"
          className={`btn h-9 px-2 text-[13px] border-[3px] border-ink ${isRefreshing ? "opacity-50" : ""}`}
          title="Refresh models from OpenCode"
          onClick={handleRefresh}
        >
          {isRefreshing ? "…" : "🔄"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        className={`${className} flex-1 text-[13px]`}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "__custom__") {
            setCustomMode(true);
            setCustomInput(value);
          } else {
            onChange(val);
          }
        }}
        aria-label="Select OpenCode model"
      >
        <option value="">{displayPlaceholder}</option>

        {isLead && (
          <option value={OPENCODE_LEAD_DEFAULT_MODEL}>
            ★ Lead Default: {OPENCODE_LEAD_DEFAULT_MODEL}
          </option>
        )}

        {freeModels.length > 0 && (
          <optgroup label="🟢 Free Models (Zen / Built-in)">
            {freeModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} (Free)
              </option>
            ))}
          </optgroup>
        )}

        {cheapModels.length > 0 && (
          <optgroup label="⚡ Ultra-Cheap & Fast Models">
            {cheapModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </optgroup>
        )}

        {Array.from(providerGroups.entries()).map(([prov, list]) => (
          <optgroup key={prov} label={`Provider: ${prov.toUpperCase()}`}>
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </optgroup>
        ))}

        <option value="__custom__">Custom model…</option>
      </select>

      <button
        type="button"
        className={`btn h-9 px-2 text-[13px] border-[3px] border-ink ${isRefreshing ? "opacity-50" : ""}`}
        title="Refresh available models from OpenCode"
        onClick={handleRefresh}
      >
        {isRefreshing ? "…" : "🔄"}
      </button>
    </div>
  );
}
