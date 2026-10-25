import { loadAgentDescriptors } from './config.js';
import { getState, setState, resetState, subscribe } from './state.js';
import type { ToolCallEvent } from './types.js';

// Claude Code Mods runtime globals — provided by the runtime, not imported.
declare const $: {
  agent: {
    register: (opts: { key: string; name: string; model: string; provider: string }) => void;
    deregisterAll?: () => void;
  };
};
declare function on(event: 'tool.call', handler: (event: Partial<ToolCallEvent>) => void): void;

let _initialized = false;

function mergeTokenTotals(
  current: Record<string, { input: number; output: number }>,
  event: Partial<ToolCallEvent>,
): Record<string, { input: number; output: number }> {
  const agent = event.agent ?? 'unknown';
  const existing = current[agent] ?? { input: 0, output: 0 };
  return { ...current, [agent]: existing };
}

function bootstrap(): void {
  if (_initialized) {
    $.agent.deregisterAll?.();
    resetState();
    _initialized = false;
  }

  const descriptors = loadAgentDescriptors();

  if (descriptors.length === 0) {
    console.warn('[Mark3 Mods] No agents configured — skipping registration.');
  }

  for (const d of descriptors) {
    $.agent.register({
      key: d.key,
      name: d.displayName,
      model: d.modelId,
      provider: d.provider,
    });
  }

  on('tool.call', (event) => {
    setState({
      lastToolCall: {
        agent: event.agent ?? 'unknown',
        tool: event.tool ?? 'unknown',
        timestamp: Date.now(),
        phase: getState().phase,
        args: event.args,
      },
      tokenTotals: mergeTokenTotals(getState().tokenTotals, event),
    });
  });

  _initialized = true;
  console.log(`[Mark3 Mods] Initialized — ${descriptors.length} agents registered.`);
}

bootstrap();

export { subscribe, getState };
