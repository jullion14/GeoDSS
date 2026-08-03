import { useCallback, useEffect, useState } from 'react';
import api from './services/api';
import MapView from './components/MapView';
import LayerPanel from './components/LayerPanel';
import AreaSelector from './components/AreaSelector';
import PriorityDrawer from './components/PriorityDrawer';
import { useMapLayers } from './hooks/useMapLayers';
import { usePriorityScores } from './hooks/usePriorityScores';
import { BASEMAPS, type BasemapKey } from './components/basemaps';
import type { AccessibilityMetrics } from './types/analysis';

/**
 * Owns the frame. The map is the canvas at full bleed; every panel floats over
 * it and can be dismissed, so the map is never boxed in on three sides.
 *
 * Panel theme follows the basemap rather than a separate setting — dark panels
 * over light tiles read as a bug, so one control drives both.
 */
export default function App() {
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shadeByPriority, setShadeByPriority] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>('dark');

  const theme = BASEMAPS[basemap].theme;

  const { layers, visible, toggleLayer, counts, loading: layersLoading, error: layersError } = useMapLayers();
  const priority = usePriorityScores();

  const [metrics, setMetrics] = useState<AccessibilityMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAreaId == null) { setMetrics(null); return; }
    setMetricsLoading(true);
    setMetricsError(null);
    api.get(`/api/analysis/area/${selectedAreaId}`)
      .then(res => setMetrics(res.data))
      .catch(err => setMetricsError(err.message))
      .finally(() => setMetricsLoading(false));
  }, [selectedAreaId]);

  const handleSelectArea = useCallback((id: number | null) => {
    setSelectedAreaId(id);
    if (id != null) setAnalysisCollapsed(false);
  }, []);

  if (layersError) {
    return <div style={{ padding: 16 }}>Error loading map data: {layersError}</div>;
  }

  const selectedScore = selectedAreaId != null
    ? priority.scoresById.get(selectedAreaId) ?? null
    : null;

  return (
    <div style={styles.shell}>
      <MapView
        layers={layers}
        visible={visible}
        selectedAreaId={selectedAreaId}
        onSelectArea={handleSelectArea}
        scoresById={priority.scoresById}
        shadeByPriority={shadeByPriority}
        basemap={basemap}
      />

      <div style={styles.topLeft}>
        <LayerPanel
          visible={visible}
          onToggle={toggleLayer}
          counts={counts}
          loading={layersLoading}
          collapsed={layersCollapsed}
          onToggleCollapse={() => setLayersCollapsed(v => !v)}
          shadeByPriority={shadeByPriority}
          onToggleShading={() => setShadeByPriority(v => !v)}
          canShade={priority.scoresById.size > 0}
          basemap={basemap}
          onBasemapChange={setBasemap}
          theme={theme}
        />
      </div>

      <div style={{ ...styles.topRight, bottom: drawerOpen ? 'calc(46vh + 12px)' : 56 }}>
        <AreaSelector
          metrics={metrics}
          loading={metricsLoading}
          error={metricsError}
          onClose={() => handleSelectArea(null)}
          collapsed={analysisCollapsed}
          onToggleCollapse={() => setAnalysisCollapsed(v => !v)}
          score={selectedScore}
          scoreMetrics={priority.metrics}
          totalAreas={priority.data?.areaCount ?? 0}
          theme={theme}
        />
      </div>

      <PriorityDrawer
        data={priority.data}
        metrics={priority.metrics}
        notes={priority.notes}
        weights={priority.weights}
        onWeightChange={priority.setWeight}
        onResetWeights={priority.resetWeights}
        isDefault={priority.isDefault}
        loading={priority.loading}
        error={priority.error}
        selectedAreaId={selectedAreaId}
        onSelectArea={handleSelectArea}
        open={drawerOpen}
        onToggleOpen={() => setDrawerOpen(v => !v)}
        theme={theme}
      />
    </div>
  );
}

const styles = {
  shell: { position: 'relative' as const, height: '100vh', width: '100%', overflow: 'hidden' },
  // 1000 clears Leaflet's panes (max 800) and its own controls.
  topLeft: {
    position: 'absolute' as const, top: 12, left: 12, zIndex: 1000,
    maxHeight: 'calc(100% - 80px)',
  },
  topRight: {
    position: 'absolute' as const, top: 12, right: 12, zIndex: 1000,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end',
  },
};