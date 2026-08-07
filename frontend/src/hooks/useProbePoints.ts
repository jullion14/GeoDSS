import { useCallback, useMemo, useState } from 'react';
import { fetchPointAccessibility, type ProbePoint } from '../services/pointApi';

const MAX_POINTS = 8;

/**
 * Probe points: arbitrary map locations the user has measured from.
 *
 * Deliberately a list rather than a single point. Comparing several spots
 * inside one planning area shows how much nearest-facility distance varies
 * across it — which is the variation a single representative point cannot
 * capture, and therefore evidence for a limitation the report has to state
 * anyway.
 *
 * These never feed the priority score. The unit of analysis is still the
 * planning area; this is a query tool alongside it.
 */
export function useProbePoints() {
  const [points, setPoints] = useState<ProbePoint[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  const addPoint = useCallback(async (lat: number, lng: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    let label = 1;
    setPoints(prev => {
      if (prev.length >= MAX_POINTS) return prev;
      label = (prev[prev.length - 1]?.label ?? 0) + 1;
      return [...prev, { id, lat, lng, label, result: null, loading: true, error: null }];
    });

    setActiveId(id);

    try {
      const result = await fetchPointAccessibility(lat, lng);
      setPoints(prev => prev.map(p =>
        p.id === id ? { ...p, result, loading: false } : p));
    } catch (err: any) {
      const message = err?.response?.status === 404
        ? 'Outside the Singapore data extent.'
        : 'Could not measure from this point.';
      setPoints(prev => prev.map(p =>
        p.id === id ? { ...p, loading: false, error: message } : p));
    }
  }, []);

  const removePoint = useCallback((id: string) => {
    setPoints(prev => prev.filter(p => p.id !== id));
    setActiveId(prev => (prev === id ? null : prev));
  }, []);

  const clearPoints = useCallback(() => {
    setPoints([]);
    setActiveId(null);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled(v => {
      // Leaving probe mode drops the highlight but keeps the points, so a
      // user can go back to selecting areas without losing their measurements.
      if (v) setActiveId(null);
      return !v;
    });
  }, []);

  const active = useMemo(
    () => points.find(p => p.id === activeId) ?? null,
    [points, activeId],
  );

  /**
   * Spread of nearest-facility distance across points in the same planning
   * area. Null unless at least two points share an area — that is the
   * comparison worth surfacing, and it is meaningless across areas.
   */
  const withinAreaSpread = useMemo(() => {
    const byArea = new Map<number, number[]>();

    points.forEach(p => {
      const r = p.result;
      if (!r?.planningAreaId || r.nearestFacilityMeters == null) return;
      const list = byArea.get(r.planningAreaId) ?? [];
      list.push(r.nearestFacilityMeters);
      byArea.set(r.planningAreaId, list);
    });

    for (const [areaId, values] of byArea) {
      if (values.length < 2) continue;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const name = points.find(p => p.result?.planningAreaId === areaId)?.result?.planningAreaName ?? '';
      return { areaId, name, min, max, count: values.length };
    }

    return null;
  }, [points]);

  return {
    points, active, activeId, setActiveId,
    addPoint, removePoint, clearPoints,
    enabled, toggleEnabled,
    atCapacity: points.length >= MAX_POINTS,
    withinAreaSpread,
  };
}