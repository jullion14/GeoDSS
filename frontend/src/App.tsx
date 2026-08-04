import { useCallback, useEffect, useState } from 'react';
import api from './services/api';
import MapView from './components/MapView';
import LayerPanel from './components/LayerPanel';
import AreaSelector from './components/AreaSelector';
import RankingStrip from './components/RankingStrip';
import AnalysisView from './components/AnalysisView';
import ViewTabs, { type ViewKey } from './components/ViewTabs';
import { useMapLayers } from './hooks/useMapLayers';
import { usePriorityScores } from './hooks/usePriorityScores';
import { useSensitivity } from './hooks/useSensitivity';
import { BASEMAPS, type BasemapKey } from './components/basemaps';
import { surface } from './components/panelStyles';
import type { AccessibilityMetrics } from './types/analysis';

/**
 * Two views over one state.
 *
 * Map: the geographic surface — choropleth, layers, the selected area's
 * metrics, and a one-line ranking summary.
 * Analysis: weights, sensitivity and the full table, which need width and are
 * read deliberately rather than glanced at.
 *
 * Selection, weights and sensitivity all live here, so switching views never
 * loses context: an area picked in the table is already highlighted on the map.
 */
export default function App() {
  const [view, setView] = useState<ViewKey>('map');
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);
  const [shadeByPriority, setShadeByPriority] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>('dark');

  const theme = BASEMAPS[basemap].theme;
  const c = surface(theme);

  const { layers, visible, toggleLayer, counts, loading: layersLoading, error: layersError } = useMapLayers();
  const priority = usePriorityScores();
  // Always on: stability feeds the table, the side panel and (next) the AI
  // explanation, so it is infrastructure rather than a feature to toggle.
  const sensitivity = useSensitivity(priority.weights, true, null);

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

  /** From the analysis table: select and jump to the map. */
  const showOnMap = useCallback((id: number) => {
    setSelectedAreaId(id);
    setAnalysisCollapsed(false);
    setView('map');
  }, []);

  if (layersError) {
    return <div style={{ padding: 16 }}>Error loading map data: {layersError}</div>;
  }

  const selectedScore = selectedAreaId != null
    ? priority.scoresById.get(selectedAreaId) ?? null
    : null;

  return (
    <div style={{ ...styles.shell, background: theme === 'dark' ? '#0d1116' : '#f2f2f0' }}>
      <div style={styles.tabs}>
        <ViewTabs
          view={view}
          onChange={setView}
          theme={theme}
          analysisBadge={priority.data?.areaCount}
        />
      </div>

      {/* The map stays mounted across view switches: remounting Leaflet loses
          zoom and pan, and tile reloads make the switch feel broken. */}
      <div style={{ ...styles.pane, visibility: view === 'map' ? 'visible' : 'hidden' }}>
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

        <div style={styles.topRight}>
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
            tornado={selectedAreaId != null ? sensitivity.tornadoById.get(selectedAreaId) ?? null : null}
            sensitivityLoading={sensitivity.loading}
          />
        </div>

        <RankingStrip
          data={priority.data}
          error={priority.error}
          selectedAreaId={selectedAreaId}
          onSelectArea={handleSelectArea}
          onOpenAnalysis={() => setView('analysis')}
          theme={theme}
        />
      </div>

      {view === 'analysis' && (
        <div style={{ ...styles.pane, background: theme === 'dark' ? '#0d1116' : '#f2f2f0' }}>
          <AnalysisView
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
            theme={theme}
            stabilityById={sensitivity.stabilityById}
            onShowOnMap={showOnMap}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  shell: { position: 'relative' as const, height: '100vh', width: '100%', overflow: 'hidden' },
  pane: { position: 'absolute' as const, inset: 0 },
  tabs: { position: 'absolute' as const, top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1100 },
  topLeft: {
    position: 'absolute' as const, top: 12, left: 12, zIndex: 1000,
    maxHeight: 'calc(100% - 80px)',
  },
  topRight: {
    position: 'absolute' as const, top: 12, right: 12, bottom: 58, zIndex: 1000,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end',
  },
};