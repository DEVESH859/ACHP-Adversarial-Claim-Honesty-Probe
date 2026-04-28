export interface AnalysisState {
  id: string;
  claim: string;
  status: "pending" | "running" | "completed" | "error";
  events: Array<{
    agent: string;
    status: string;
    message?: string;
    latency_ms?: number;
    delay?: number;
  }>;
  result?: any;
}

export const analyses = new Map<string, AnalysisState>();
export const subscribers = new Map<string, Set<any>>();
