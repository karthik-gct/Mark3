import type { PipelineState, StateSubscriber } from './types.js';

export const initialState: PipelineState = {
  conceptKey: null,
  phase: 'idle',
  storyProgress: {},
  tokenTotals: {},
  isAwaitingApproval: false,
  pendingApprovals: [],
  currentPrompt: '',
  lastToolCall: null,
  sessionId: `session-${Date.now()}`,
  agentLogPaths: {},
};

let _state: PipelineState = { ...initialState, sessionId: `session-${Date.now()}` };
const _subscribers = new Map<string, StateSubscriber>();

export function getState(): Readonly<PipelineState> {
  return _state;
}

export function setState(patch: Partial<PipelineState>): void {
  _state = { ..._state, ...patch };
  for (const [id, cb] of _subscribers) {
    try {
      cb(_state);
    } catch (err) {
      console.error(`[Mark3 Mods] Subscriber "${id}" threw:`, err);
    }
  }
}

export function subscribe(id: string, callback: StateSubscriber): () => void {
  _subscribers.set(id, callback);
  return () => { _subscribers.delete(id); };
}

export function resetState(): void {
  _state = { ...initialState, sessionId: `session-${Date.now()}` };
  _subscribers.clear();
}

export function getSubscriberCount(): number {
  return _subscribers.size;
}

/**
 * Register an agent's log file path in state.
 * Called when an agent is started so the Command Center knows which log to tail.
 * FR-6: Agent log paths stored in state for consumption by launch-command-center.sh
 *
 * @param agent  Agent name (e.g. "DesignAgent")
 * @param logPath  Absolute path to the agent's log file
 */
export function registerAgentLogPath(agent: string, logPath: string): void {
  setState({ agentLogPaths: { ..._state.agentLogPaths, [agent]: logPath } });
}
