import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchPriorityConfig,
  fetchPriorityScores,
  type AreaPriorityScore,
  type MetricDescriptor,
  type PriorityScoreResponse,
  type WeightMap,
} from '../services/priorityApi';

/**
 * Owns the scoring model and the current weights.
 *
 * Lifted to App because three places need the result: the drawer renders the
 * ranking, AreaSelector shows the selected area's breakdown, and the map
 * shades polygons by score. Fetching it once here keeps those three in sync
 * and avoids three components racing the same endpoint.
 */
export function usePriorityScores() {
  const [metrics, setMetrics] = useState<MetricDescriptor[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [weights, setWeights] = useState<WeightMap>({});
  const [data, setData] = useState<PriorityScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPriorityConfig()
      .then(config => {
        if (cancelled) return;
        setMetrics(config.metrics);
        setNotes(config.notes);
        setWeights(Object.fromEntries(config.metrics.map(m => [m.key, m.defaultWeight])));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the scoring model.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (Object.keys(weights).length === 0) return;

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      fetchPriorityScores(weights, controller.signal)
        .then(res => { setData(res); setError(null); })
        .catch(err => {
          if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
          setError('Scoring failed.');
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [weights]);

  const setWeight = useCallback(
    (key: string, value: number) => setWeights(w => ({ ...w, [key]: value })),
    [],
  );

  const resetWeights = useCallback(
    () => setWeights(Object.fromEntries(metrics.map(m => [m.key, m.defaultWeight]))),
    [metrics],
  );

  const isDefault = useMemo(
    () => metrics.every(m => Math.abs((weights[m.key] ?? 0) - m.defaultWeight) < 1e-6),
    [metrics, weights],
  );

  /** planningAreaId -> score, for the choropleth. */
  const scoresById = useMemo(() => {
    const map = new Map<number, AreaPriorityScore>();
    data?.results.forEach(r => map.set(r.planningAreaId, r));
    return map;
  }, [data]);

  return {
    metrics, notes, weights, setWeight, resetWeights, isDefault,
    data, scoresById, loading, error,
  };
}