import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchSensitivity,
  type AreaTornado,
  type RankStability,
  type SensitivityResponse,
} from '../services/sensitivityApi';
import type { WeightMap } from '../services/priorityApi';

/**
 * Sensitivity is opt-in: it only runs while the user has the panel open.
 * A 1,000-sample run is cheap on the server but it is a different mode of
 * looking — interrogating the model rather than reading the result — so it
 * should not fire on every slider nudge in the background.
 */
export function useSensitivity(
  weights: WeightMap,
  enabled: boolean,
  sweepMetricKey: string | null,
) {
  const [data, setData] = useState<SensitivityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || Object.keys(weights).length === 0) return;

    // Longer debounce than scoring: this is heavier and less glanceable.
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      fetchSensitivity({ weights, sweepMetricKey }, controller.signal)
        .then(res => { setData(res); setError(null); })
        .catch(err => {
          if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
          setError('Sensitivity analysis failed.');
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [weights, enabled, sweepMetricKey]);

  const stabilityById = useMemo(() => {
    const map = new Map<number, RankStability>();
    data?.stability.forEach(s => map.set(s.planningAreaId, s));
    return map;
  }, [data]);

  const tornadoById = useMemo(() => {
    const map = new Map<number, AreaTornado>();
    data?.tornado.forEach(t => map.set(t.planningAreaId, t));
    return map;
  }, [data]);

  return { data, stabilityById, tornadoById, loading, error };
}