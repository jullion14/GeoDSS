import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import api from '../services/api';

export type LayerKey = 'planningAreas' | 'gps' | 'polyclinics' | 'transit';

export const LAYER_META: Record<LayerKey, { label: string; color: string }> = {
  planningAreas: { label: 'Planning Areas', color: '#3388ff' },
  gps: { label: 'GP Clinics', color: '#e74c3c' },
  polyclinics: { label: 'Polyclinics', color: '#27ae60' },
  transit: { label: 'MRT Exits', color: '#8e44ad' },
};

/** Layer data and visibility, lifted out of MapView so the map component only renders. */
export function useMapLayers() {
  const [layers, setLayers] = useState<Record<LayerKey, FeatureCollection | null>>({
    planningAreas: null, gps: null, polyclinics: null, transit: null,
  });
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    planningAreas: true, gps: true, polyclinics: true, transit: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/planningareas/geojson'),
      api.get('/api/healthcare/geojson?type=GP'),
      api.get('/api/healthcare/geojson?type=Polyclinic'),
      api.get('/api/transit/geojson'),
    ])
      .then(([pa, gp, poly, tr]) => {
        setLayers({
          planningAreas: pa.data,
          gps: gp.data,
          polyclinics: poly.data,
          transit: tr.data,
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleLayer = (key: LayerKey) => setVisible(v => ({ ...v, [key]: !v[key] }));

  const counts = useMemo(
    () => Object.fromEntries(
      (Object.keys(layers) as LayerKey[]).map(k => [k, layers[k]?.features.length]),
    ) as Partial<Record<LayerKey, number>>,
    [layers],
  );

  return { layers, visible, toggleLayer, counts, loading, error };
}