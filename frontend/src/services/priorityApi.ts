import api from "./api"; // your existing axios instance (baseURL = VITE_API_URL)

export type MetricDirection = "benefit" | "cost";

export interface MetricDescriptor {
  key: string;
  label: string;
  unit: string;
  direction: MetricDirection;
  defaultWeight: number;
  rationale: string;
  /** Effective weight for a scored run; absent on the config endpoint. */
  weight?: number;
  observedMin?: number;
  observedMax?: number;
}

export interface PriorityConfig {
  method: string;
  normalisation: string;
  formulaTemplate: string;
  metrics: MetricDescriptor[];
  notes: string[];
}

export interface MetricComponent {
  key: string;
  rawValue: number | null;
  normalisedValue: number;
  weight: number;
  contribution: number;
  isImputed: boolean;
}

export interface AreaPriorityScore {
  planningAreaId: number;
  name: string;
  region: string | null;
  totalScore: number;
  rank: number;
  components: MetricComponent[];
}

export interface PriorityScoreResponse {
  method: string;
  normalisation: string;
  formula: string;
  metrics: MetricDescriptor[];
  results: AreaPriorityScore[];
  areaCount: number;
  weightsWereRescaled: boolean;
  warnings: string[];
}

export type WeightMap = Record<string, number>;

export async function fetchPriorityConfig(): Promise<PriorityConfig> {
  const { data } = await api.get<PriorityConfig>("/api/analysis/priority-config");
  return data;
}

export async function fetchPriorityScores(
  weights?: WeightMap,
  signal?: AbortSignal,
): Promise<PriorityScoreResponse> {
  const { data } = await api.post<PriorityScoreResponse>(
    "/api/analysis/priority-score",
    { weights },
    { signal },
  );
  return data;
}