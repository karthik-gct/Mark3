import { loadAgentDescriptors } from './config.js';
import { getState, setState, resetState, subscribe } from './state.js';
import type { ToolCallEvent, PipelineState } from './types.js';
import { TelemetryFooter } from './panes/telemetryFooter.js';
import { createPipelineStateStore } from './store/pipelineState.js';
import { initPipelineStatusPane } from './panes/pipelineStatusPane.js';
import { initPersistence, loadConfig, type PersistableStore } from './persistence.js';

// Claude Code Mods runtime globals — provided by the runtime, not imported.
declare const $: {
  agent: {
    register: (opts: { key: string; name: string; model: string; provider: string }) => void;
    deregisterAll?: () => void;
  };
};
declare function on(event: 'tool.call', handler: (event: Partial<ToolCallEvent>) => void): void;

let _initialized = false;
let _telemetryFooter: TelemetryFooter | null = null;
let _persistenceTeardown: (() => void) | null = null;

function mergeTokenTotals(
  current: Record<string, { input: number; output: number }>,
  event: Partial<ToolCallEvent>,
): Record<string, { input: number; output: number }> {
  const agent = event.agent ?? 'unknown';
  const existing = current[agent] ?? { input: 0, output: 0 };
  return { ...current, [agent]: existing };
}

function createPersistAdapter(): PersistableStore {
  return {
    getState: () => getState() as unknown as Record<string, unknown>,
    subscribe: (cb) => subscribe('persistence', cb as (s: PipelineState) => void),
    hydrate: (saved) => setState(saved as Partial<PipelineState>),
  };
}

function bootstrap(): void {
  if (_initialized) {
    $.agent.deregisterAll?.();
    resetState();
    _telemetryFooter?.destroy();
    _telemetryFooter = null;
    _persistenceTeardown?.();
    _persistenceTeardown = null;
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

  const store = createPipelineStateStore(descriptors);
  _telemetryFooter = new TelemetryFooter(store);
  _telemetryFooter.mount();

  initPipelineStatusPane();

  const conceptKey = getState().conceptKey ?? '';
  loadConfig().then(cfg => {
    initPersistence(createPersistAdapter(), conceptKey, cfg).then(teardown => {
      _persistenceTeardown = teardown;
    }).catch(err => console.error('[Mark3 Mods] Persistence init failed:', err));
  }).catch(() => {
    initPersistence(createPersistAdapter(), conceptKey).then(teardown => {
      _persistenceTeardown = teardown;
    }).catch(err => console.error('[Mark3 Mods] Persistence init failed:', err));
  });

  _initialized = true;
  console.log(`[Mark3 Mods] Initialized — ${descriptors.length} agents registered.`);
}

bootstrap();

export { subscribe, getState };
