import type { SearchHitType } from '../services/searchApi';

/** A request to move the map. Used by search results and the locate button. */
export interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
  /** Changes on every request, so flying to the same place twice still fires. */
  nonce: number;
  /** Present only when the target came from a search result. */
  type?: SearchHitType;
  id?: number;
}

export function flyTarget(
  lat: number, lng: number, zoom: number,
  hit?: { type: SearchHitType; id: number },
): FlyTarget {
  return { lat, lng, zoom, nonce: Date.now(), type: hit?.type, id: hit?.id };
}