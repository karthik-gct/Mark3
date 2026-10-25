export interface TokenStats {
  agentKey: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  isDone: boolean;
  isStale: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

export interface ClockHandle {
  cancel(): void;
}
