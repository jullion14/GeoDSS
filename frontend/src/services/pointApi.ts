import api from './api';

export interface PointAccessibility {
  lat: number;
  lng: number;

  planningAreaId: number | null;
  planningAreaName: string | null;
  region: string | null;
  metresFromAreaRepPoint: number | null;

  nearestFacilityMeters: number | null;
  nearestFacilityName: string | null;
  nearestFacilityType: string | null;
  nearestFacilityLat: number | null;
  nearestFacilityLng: number | null;

  nearestMrtMeters: number | null;
  nearestMrtStation: string | null;
  nearestMrtLat: number | null;
  nearestMrtLng: number | null;

  nearestBusStopMeters: number | null;
  nearestBusStopDescription: string | null;
  nearestBusStopServices: number | null;
  nearestBusStopLat: number | null;
  nearestBusStopLng: number | null;
}

/** A probe point plus its result. Kept together so the panel can render pending state. */
export interface ProbePoint {
  id: string;
  lat: number;
  lng: number;
  label: number;
  result: PointAccessibility | null;
  loading: boolean;
  error: string | null;
}

export async function fetchPointAccessibility(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PointAccessibility> {
  const { data } = await api.get<PointAccessibility>('/api/analysis/point', {
    params: { lat, lng },
    signal,
  });
  return data;
}