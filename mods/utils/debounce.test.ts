import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce.js';

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does not call fn before wait elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn once after wait elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on repeated calls — only fires once for burst', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced('a');
    vi.advanceTimersByTime(100);
    debounced('b');
    vi.advanceTimersByTime(100);
    debounced('c');
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('fires again after quiet period following first call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced('first');
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    debounced('second');
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to fn', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced(42, 'hello');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(42, 'hello');
  });
});
