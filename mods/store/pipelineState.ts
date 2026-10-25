import type { PipelineState, AgentDescriptor } from '../types.js';
import type { TokenStats } from '../types/telemetry.js';

export interface PipelineStateStore {
  getState(): PipelineStateWithTokens;
  subscribe(callback: (state: PipelineStateWithTokens) => void): () => void;
  dispatch(updater: (state: PipelineStateWithTokens) => PipelineStateWithTokens): void;
  updateTokenStats(agentKey: string, stats: Partial<TokenStats>): void;
  readonly registeredAgents: AgentDescriptor[];
}

export interface PipelineStateWithTokens extends PipelineState {
  agentTokenStats: Record<string, TokenStats>;
  registeredAgents: AgentDescriptor[];
}

export function createPipelineStateStore(agents: AgentDescriptor[]): PipelineStateStore {
  let state: PipelineStateWithTokens = {
    conceptKey: null,
    phase: 'idle',
    storyProgress: {},
    tokenTotals: {},
    isAwaitingApproval: false,
    pendingApprovals: [],
    lastToolCall: null,
    sessionId: `session-${Date.now()}`,
    registeredAgents: agents,
    agentTokenStats: Object.fromEntries(
      agents.map(a => [a.key, {
        agentKey: a.key,
        modelId: a.modelId,
        inputTokens: 0,
        outputTokens: 0,
        isDone: false,
        isStale: false,
      }])
    ),
  };

  const subscribers = new Set<(s: PipelineStateWithTokens) => void>();

  return {
    getState: () => state,
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    dispatch(updater) {
      state = updater(state);
      for (const cb of subscribers) cb(state);
    },
    updateTokenStats(agentKey, stats) {
      const existing = state.agentTokenStats[agentKey] ?? {
        agentKey, modelId: '', inputTokens: 0, outputTokens: 0, isDone: false, isStale: false,
      };
      state = {
        ...state,
        agentTokenStats: {
          ...state.agentTokenStats,
          [agentKey]: { ...existing, ...stats },
        },
      };
      for (const cb of subscribers) cb(state);
    },
    get registeredAgents() { return state.registeredAgents; },
  };
}
