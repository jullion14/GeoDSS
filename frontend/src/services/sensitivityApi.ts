import api from './api';
import type { WeightMap } from './priorityApi';

export type StabilityLabel = 'stable' | 'moderate' | 'volatile';

export interface RankStability {
  planningAreaId: number;
  name: string;
  baseRank: number;
  bestRank: number;
  worstRank: number;
  medianRank: number;
  p05Rank: number;
  p95Rank: number;
  rankHeldShare: number;
  stability: StabilityLabel;
}

export interface TornadoEffect {
  metricKey: string;
  label: string;
  rankAtZero: number;
  rankAtFull: number;
  bestRank: number;
  worstRank: number;
  swing: number;
}

export interface AreaTornado {
  planningAreaId: number;
  name: string;
  baseRank: number;
  effects: TornadoEffect[];
  summary: string;
}

export interface SweepStep {
  weight: number;
  ranks: Record<number, number>;
}

export interface WeightSweep {
  metricKey: string;
  label: string;
  currentWeight: number;
  steps: SweepStep[];
  leadChanges: number[];
}

export interface SensitivityResponse {
  method: string;
  samples: number;
  concentration: number;
  seed: number;
  stability: RankStability[];
  tornado: AreaTornado[];
  sweep: WeightSweep | null;
  headline: string;
  notes: string[];
}

export interface SensitivityRequest {
  weights?: WeightMap;
  samples?: number;
  concentration?: number;
  seed?: number;
  sweepMetricKey?: string | null;
}

export async function fetchSensitivity(
  request: SensitivityRequest,
  signal?: AbortSignal,
): Promise<SensitivityResponse> {
  const { data } = await api.post<SensitivityResponse>('/api/analysis/sensitivity', request, { signal });
  return data;
}