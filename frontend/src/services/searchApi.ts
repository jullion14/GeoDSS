import api from './api';

export type SearchHitType = 'gp' | 'polyclinic' | 'mrt' | 'bus';

export interface SearchHit {
  type: SearchHitType;
  id: number;
  name: string;
  subtitle: string | null;
  lat: number;
  lng: number;
}

export async function searchFacilities(
  q: string,
  types: SearchHitType[],
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const res = await api.get<SearchHit[]>('/api/search', {
    params: { q, types: types.join(',') },
    signal,
  });
  return res.data;
}