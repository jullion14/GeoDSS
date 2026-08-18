import { useCallback, useEffect, useRef, useState } from 'react';
import api from './services/api';
import MapView from './components/MapView';
import LayerPanel from './components/LayerPanel';
import AreaSelector from './components/AreaSelector';
import RankingStrip from './components/RankingStrip';
import AnalysisView from './components/AnalysisView';
import SearchBar from './components/SearchBar';
import ViewTabs, { type ViewKey } from './components/ViewTabs';
import { useMapLayers } from './hooks/useMapLayers';
import { usePriorityScores } from './hooks/usePriorityScores';
import { useSensitivity } from './hooks/useSensitivity';
import { BASEMAPS, type BasemapKey } from './components/basemaps';
import { surface, railButton, floatingCard } from './components/panelStyles';
import type { AccessibilityMetrics } from './types/analysis';
import ProbePanel from './components/ProbePanel';
import { useProbePoints } from './hooks/useProbePoints';
import { useLayerColours } from './hooks/useLayerColours';
import { useGeolocation } from './hooks/useGeolocation';
import { flyTarget, type FlyTarget } from './types/map';


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
  const [basemap, setBasemap] = useState<BasemapKey>('light');
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  

  const [probeCollapsed, setProbeCollapsed] = useState(false);
  const probe = useProbePoints();

  const theme = BASEMAPS[basemap].theme;
  const c = surface(theme);
  const layerColours = useLayerColours();

  const geo = useGeolocation();
  const flownToUser = useRef(false);
  const [centredOnUser, setCentredOnUser] = useState(false);
  const handleUserPanned = useCallback(() => setCentredOnUser(false), []);

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

  // Fly to the first fix — a marker that appears off-screen reads as nothing
  // having happened.
    useEffect(() => {
      if (!geo.position || flownToUser.current) return;
      flownToUser.current = true;
      setFlyTo(flyTarget(geo.position.lat, geo.position.lng, 16));
      setCentredOnUser(true);
  }, [geo.position]);

    const handleLocate = () => {
      if (geo.status !== 'tracking' || !geo.position) {
        flownToUser.current = false;
        setCentredOnUser(false);
        geo.toggle();
        return;
      }
      if (centredOnUser) {
        flownToUser.current = false;
        setCentredOnUser(false);
        geo.stop();
      } else {
        setFlyTo(flyTarget(geo.position.lat, geo.position.lng, 16));
        setCentredOnUser(true);
      }
  };

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
          selectedMetrics={metrics}
          colours={layerColours.colours}
          probePoints={probe.points}
          activeProbeId={probe.activeId}
          probeEnabled={probe.enabled}
          onProbeClick={probe.addPoint}
          onSelectProbe={probe.setActiveId}
          userPosition={geo.position}
          flyTo={flyTo}
          onUserPanned={handleUserPanned}
        />

        <div style={styles.topLeft}>
          <SearchBar
            theme={theme}
            colours={layerColours.colours}
            onGoTo={hit => setFlyTo(flyTarget(hit.lat, hit.lng, 17, hit))}
            onMeasureFrom={hit => probe.addPoint(hit.lat, hit.lng)}
            onOpenChange={setSearchOpen}
          />
          <div style={{
              position: 'relative', zIndex: 1,
              opacity: searchOpen ? 0.4 : 1,
              transition: 'opacity 0.15s',
              pointerEvents: searchOpen ? 'none' : undefined,
            }}>
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
              colours={layerColours.colours}
              onColourChange={layerColours.setColour}
              onResetColours={layerColours.resetColours}
              coloursCustomised={layerColours.isCustomised}
            />
          </div>
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
            activeProbe={probe.active}
          />
        </div>

        {/* Bottom-left, sitting above the ranking strip. */}
 
        <div style={styles.bottomLeft}>
          <ProbePanel
            points={probe.points}
            activeId={probe.activeId}
            onSelect={probe.setActiveId}
            onRemove={probe.removePoint}
            onClear={probe.clearPoints}
            enabled={probe.enabled}
            onToggleEnabled={probe.toggleEnabled}
            atCapacity={probe.atCapacity}
            withinAreaSpread={probe.withinAreaSpread}
            collapsed={probeCollapsed}
            onToggleCollapse={() => setProbeCollapsed(v => !v)}
            theme={theme}
            colours={layerColours.colours}
          />
        </div>
        
         <div style={styles.locateControl}>
          <button
            onClick={handleLocate}
            style={{
              ...railButton(theme),
              color: geo.status === 'tracking' ? '#2f80ed' : c.textMuted,
            }}
            title={
              geo.status === 'locating' ? 'Locating…'
              : geo.status !== 'tracking' ? 'Show my location'
              : centredOnUser ? 'Hide my location'
              : 'Centre on my location'
            }
            aria-label={
              geo.status === 'locating' ? 'Locating'
              : geo.status !== 'tracking' ? 'Show my location'
              : centredOnUser ? 'Hide my location'
              : 'Centre on my location'
            }
          >
            {geo.status === 'locating' ? '◌' : '◎'}
          </button>

          {geo.message && (
            <div style={{
              ...floatingCard(theme),
              padding: '6px 10px', fontSize: 11.5, maxWidth: 220, lineHeight: 1.45,
            }}>
              {geo.message}
            </div>
          )}
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
    display: 'flex', flexDirection: 'column' as const, gap: 10,
  },
  topRight: {
    position: 'absolute' as const, top: 12, right: 12, bottom: 58, zIndex: 1000,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end',
  },
  bottomLeft: {
    position: 'absolute' as const, left: 12, bottom: 58, zIndex: 1000,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start',
  },
   locateControl: {
    position: 'absolute' as const, right: 12, bottom: 58, zIndex: 1000,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 6,
  },
};