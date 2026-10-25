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
