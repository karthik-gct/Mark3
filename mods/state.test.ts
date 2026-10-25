import { describe, it, expect, beforeEach } from 'vitest';
import { getState, setState, subscribe, resetState, getSubscriberCount, initialState } from './state.js';

beforeEach(() => {
  resetState();
});

describe('state store — AC-2: tool call updates state and notifies subscribers', () => {
  it('setState merges patch into current state', () => {
    setState({ phase: 'epic' });
    expect(getState().phase).toBe('epic');
  });

  it('setState notifies all subscribers with updated state', () => {
    const received: string[] = [];
    subscribe('s1', (s) => { received.push(s.phase); });
    setState({ phase: 'design' });
    expect(received).toEqual(['design']);
  });

  it('setState with lastToolCall updates lastToolCall field', () => {
    const evt = { agent: 'prod_mgmt', tool: 'read_jira_issue', timestamp: 1000, phase: 'epic' as const };
    setState({ lastToolCall: evt });
    expect(getState().lastToolCall?.tool).toBe('read_jira_issue');
    expect(getState().lastToolCall?.agent).toBe('prod_mgmt');
  });
});

describe('state store — AC-3: each subscriber called exactly once per update', () => {
  it('three subscribers each called exactly once on a single setState', () => {
    const counts = [0, 0, 0];
    subscribe('s1', () => { counts[0]++; });
    subscribe('s2', () => { counts[1]++; });
    subscribe('s3', () => { counts[2]++; });
    setState({ phase: 'code' });
    expect(counts).toEqual([1, 1, 1]);
  });

  it('subscriber receives full current state object', () => {
    let captured: unknown;
    subscribe('s1', (s) => { captured = s; });
    setState({ phase: 'qa', conceptKey: 'SCRUM-13' });
    expect((captured as typeof initialState).phase).toBe('qa');
    expect((captured as typeof initialState).conceptKey).toBe('SCRUM-13');
  });
});

describe('state store — subscriber error isolation', () => {
  it('a throwing subscriber does not prevent other subscribers from being called', () => {
    const called: string[] = [];
    subscribe('bad', () => { throw new Error('oops'); });
    subscribe('good', () => { called.push('good'); });
    setState({ phase: 'design' });
    expect(called).toEqual(['good']);
  });
});

describe('state store — AC-5: resetState clears state and subscribers', () => {
  it('resetState returns phase to idle', () => {
    setState({ phase: 'qa' });
    resetState();
    expect(getState().phase).toBe('idle');
  });

  it('resetState removes all subscribers', () => {
    subscribe('s1', () => {});
    expect(getSubscriberCount()).toBe(1);
    resetState();
    expect(getSubscriberCount()).toBe(0);
  });
});

describe('state store — unsubscribe', () => {
  it('returned unsubscribe function removes the subscriber', () => {
    const calls: number[] = [];
    const unsub = subscribe('s1', () => { calls.push(1); });
    setState({ phase: 'epic' });
    unsub();
    setState({ phase: 'design' });
    expect(calls).toHaveLength(1);
  });
});
