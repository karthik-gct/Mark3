export interface ApprovalRequest {
  id: string;          // UUID
  prompt: string;      // Full text shown in the red block
  createdAt: number;   // Date.now() when queued
  resolvedAt?: number; // Set when operator approves/rejects
}
