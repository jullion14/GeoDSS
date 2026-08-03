export interface AccessibilityMetrics {
  planningAreaId: number;
  name: string;
  region: string | null;

  population: number | null;
  areaSqKm: number;
  populationDensity: number | null;

  gpCount: number;
  polyclinicCount: number;
  totalFacilities: number;
  facilitiesPer10k: number | null;

  nearestFacilityMeters: number | null;
  nearestFacilityName: string | null;
  nearestFacilityType: string | null;

  mrtExitCount: number;
  nearestMrtMeters: number | null;
  nearestMrtStation: string | null;
}