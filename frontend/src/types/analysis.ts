export interface AccessibilityMetrics {
  planningAreaId: number;
  name: string;
  region: string | null;

  repPointLat: number;
  repPointLng: number;
  nearestFacilityLat: number | null;
  nearestFacilityLng: number | null;
  nearestMrtLat: number | null;
  nearestMrtLng: number | null;

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

  busStopCount: number;
  wellServedBusStops: number;
  busiestStopServices: number | null;
}