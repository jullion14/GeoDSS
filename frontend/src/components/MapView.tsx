import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, 
  Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { LayerKey } from '../hooks/useMapLayers';
import type { AreaPriorityScore } from '../services/priorityApi';
import { scoreColour, areaStroke } from './panelStyles';
import { BASEMAPS, type BasemapKey } from './basemaps';
import type { AccessibilityMetrics } from '../types/analysis';
import type { ProbePoint } from '../services/pointApi';
import { PROBE_COLOUR } from './ProbePanel';

interface Props {
  layers: Record<LayerKey, FeatureCollection | null>;
  visible: Record<LayerKey, boolean>;
  selectedAreaId: number | null;
  onSelectArea: (id: number | null) => void;
  scoresById?: Map<number, AreaPriorityScore>;
  shadeByPriority: boolean;
  basemap: BasemapKey;
  selectedMetrics: AccessibilityMetrics | null;
  probePoints: ProbePoint[];
  activeProbeId: string | null;
  probeEnabled: boolean;
  onProbeClick: (lat: number, lng: number) => void;
  onSelectProbe: (id: string) => void;
}

/** The map, and only the map. Panels are siblings rendered over it by App. */
export default function MapView({
  layers, visible, selectedAreaId, onSelectArea, scoresById, shadeByPriority, basemap,
  selectedMetrics, probePoints, activeProbeId, probeEnabled, onProbeClick, onSelectProbe
}: Props) {
  console.log('probeEnabled:', probeEnabled);
  const base = BASEMAPS[basemap];
  const stroke = areaStroke(base.theme);

  const scoreRange = (() => {
    if (!scoresById || scoresById.size === 0) return { min: 0, max: 1 };
    const vals = [...scoresById.values()].map(s => s.totalScore);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  })();

  const areaStyle = (feature: any) => {
    const id = feature.properties.id;
    const isSelected = id === selectedAreaId;
    const score = scoresById?.get(id);

    const fill = shadeByPriority && score
      ? scoreColour(score.totalScore, scoreRange.min, scoreRange.max)
      : feature.properties.population ? '#3388ff' : '#6b7280';

    return {
      fillColor: isSelected ? '#f39c12' : fill,
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#e67e22' : stroke,
      // Imagery needs a lighter touch or the polygons bury it entirely.
      fillOpacity: isSelected
        ? 0.7
        : shadeByPriority && score
          ? (basemap === 'satellite' ? 0.55 : 0.7)
          : (basemap === 'satellite' ? 0.22 : 0.35),
    };
  };

  const onEachArea = (feature: any, layer: any) => {
    layer.on({
    click: (e: any) => {
        if (probeEnabled) {
          onProbeClick(e.latlng.lat, e.latlng.lng);
        } else {
          onSelectArea(feature.properties.id);
        }
      },
    });
    const score = scoresById?.get(feature.properties.id);
    layer.bindTooltip(
      score ? `${feature.properties.name} — rank ${score.rank}` : feature.properties.name,
      { sticky: true },
    );
  };

  const renderPoints = (
    fc: FeatureCollection | null,
    color: string,
    label: (p: any) => React.ReactNode,
    radius = 4,
  ) =>
    fc?.features.map((f: any, i: number) => {
      const [lng, lat] = f.geometry.coordinates;
      return (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={radius}
          pathOptions={{
            color: base.theme === 'light' ? '#ffffff' : color,
            weight: 1,
            fillColor: color,
            fillOpacity: 0.85,
          }}
        >
          <Popup>{label(f.properties)}</Popup>
        </CircleMarker>
      );
    });

  return (
    <MapContainer
      center={[1.3521, 103.8198]}
      zoom={12}
      zoomControl={false}
      preferCanvas={true}
      style={{ position: 'absolute', inset: 0, cursor: probeEnabled ? 'crosshair' : undefined,
        background: base.theme === 'dark' ? '#0d1116' : '#e8e8e8' }}
    >
      <InvalidateOnResize />

      {/* key forces a fresh tile layer when the basemap changes */}
      <TileLayer
        key={base.key}
        attribution={base.attribution}
        url={base.url}
        maxZoom={base.maxZoom ?? 19}
      />
      {base.labelUrl && (
        <TileLayer key={`${base.key}-labels`} url={base.labelUrl} maxZoom={base.maxZoom ?? 19} />
      )}

      {visible.planningAreas && layers.planningAreas && (
        <GeoJSON
          key={`areas-${selectedAreaId}-${shadeByPriority}-${basemap}-${scoresById?.size ?? 0}`}
          data={layers.planningAreas}
          style={areaStyle}
          onEachFeature={onEachArea}
        />
      )}

      {visible.gps && renderPoints(layers.gps, '#e74c3c', p => (
        <><strong>{p.name}</strong>{p.address && <><br />{p.address}</>}</>
      ))}
      {visible.polyclinics && renderPoints(layers.polyclinics, '#27ae60', p => (
        <><strong>{p.name}</strong>{p.address && <><br />{p.address}</>}</>
      ))}
      {visible.transit && renderPoints(layers.transit, '#8e44ad', p => (
        <><strong>{p.stationName}</strong>{p.exitCode && <><br />{p.exitCode}</>}</>
      ))}
      {visible.busStops && renderPoints(layers.busStops, '#f39c12', p => (
        <>
          <strong>{p.description || p.roadName || p.busStopCode}</strong>
          <br />Stop {p.busStopCode}
          {p.serviceCount != null && <><br />{p.serviceCount} services</>}
        </>
      ), 2.5)}
      {selectedMetrics && selectedAreaId === selectedMetrics.planningAreaId && (
      <>
        {/* the point every distance is measured from */}
        <CircleMarker
          center={[selectedMetrics.repPointLat, selectedMetrics.repPointLng]}
          radius={5}
          pathOptions={{ color: '#f39c12', fillColor: '#f39c12', fillOpacity: 1, weight: 2 }}
        >
          <Popup>Reference point — all distances measured from here</Popup>
        </CircleMarker>

        {selectedMetrics.nearestFacilityLat != null && (
          <Polyline
            positions={[
              [selectedMetrics.repPointLat, selectedMetrics.repPointLng],
              [selectedMetrics.nearestFacilityLat, selectedMetrics.nearestFacilityLng!],
            ]}
            pathOptions={{ color: '#e74c3c', weight: 2, dashArray: '5 5', opacity: 0.9 }}
          />
        )}

        {selectedMetrics.nearestMrtLat != null && (
          <Polyline
            positions={[
              [selectedMetrics.repPointLat, selectedMetrics.repPointLng],
              [selectedMetrics.nearestMrtLat, selectedMetrics.nearestMrtLng!],
            ]}
            pathOptions={{ color: '#8e44ad', weight: 2, dashArray: '5 5', opacity: 0.9 }}
          />
        )}

        {/* click capture — only mounted while probing, so normal map
          interaction is untouched when the mode is off */}
        {probeEnabled && <ProbeClickCapture onClick={onProbeClick} />}

        {/* area-level measurement lines: where the area's own numbers come from */}
        {selectedMetrics && selectedAreaId === selectedMetrics.planningAreaId && (() => {
          const origin: [number, number] = [selectedMetrics.repPointLat, selectedMetrics.repPointLng];
  
          const facility = selectedMetrics.nearestFacilityLat != null
            && selectedMetrics.nearestFacilityLng != null
            ? [selectedMetrics.nearestFacilityLat, selectedMetrics.nearestFacilityLng] as [number, number]
            : null;
  
          const mrt = selectedMetrics.nearestMrtLat != null
            && selectedMetrics.nearestMrtLng != null
            ? [selectedMetrics.nearestMrtLat, selectedMetrics.nearestMrtLng] as [number, number]
            : null;
  
          return (
            <>
              {facility && (
                <Polyline
                  positions={[origin, facility]}
                  pathOptions={{ color: '#e74c3c', weight: 2, dashArray: '5 5', opacity: 0.85 }}
                />
              )}
              {mrt && (
                <Polyline
                  positions={[origin, mrt]}
                  pathOptions={{ color: '#8e44ad', weight: 2, dashArray: '5 5', opacity: 0.85 }}
                />
              )}
              <CircleMarker
                center={origin}
                radius={6}
                pathOptions={{ color: '#ffffff', fillColor: '#1a1d23', fillOpacity: 1, weight: 2.5 }}
              >
                <Popup>
                  <strong>Reference point</strong>
                  <br />The area's distances are measured from here.
                </Popup>
              </CircleMarker>
            </>
          );
        })()}
  
        {/* probe points and their measurement lines */}
        {probePoints.map(p => {
          const r = p.result;
          const origin: [number, number] = [p.lat, p.lng];
          const isActive = p.id === activeProbeId;
  
          const legs: { to: [number, number]; colour: string }[] = [];
          if (r?.nearestFacilityLat != null && r.nearestFacilityLng != null) {
            legs.push({ to: [r.nearestFacilityLat, r.nearestFacilityLng], colour: '#e74c3c' });
          }
          if (r?.nearestMrtLat != null && r.nearestMrtLng != null) {
            legs.push({ to: [r.nearestMrtLat, r.nearestMrtLng], colour: '#8e44ad' });
          }
          if (r?.nearestBusStopLat != null && r.nearestBusStopLng != null) {
            legs.push({ to: [r.nearestBusStopLat, r.nearestBusStopLng], colour: '#f39c12' });
          }
  
          return (
            <div key={p.id}>
              {/* only the active point draws its lines — eight points times
                  three legs is unreadable otherwise */}
              {isActive && legs.map((leg, i) => (
                <Polyline
                  key={i}
                  positions={[origin, leg.to]}
                  pathOptions={{ color: leg.colour, weight: 2, dashArray: '4 4', opacity: 0.85 }}
                />
              ))}
  
              <CircleMarker
                center={origin}
                radius={isActive ? 8 : 6}
                eventHandlers={{ click: () => onSelectProbe(p.id) }}
                pathOptions={{
                  color: isActive ? '#ffffff' : PROBE_COLOUR,
                  fillColor: PROBE_COLOUR,
                  fillOpacity: 1,
                  weight: isActive ? 2.5 : 1.5,
                }}
              >
                <Tooltip permanent direction="center" className="probe-label">
                  {p.label}
                </Tooltip>
            </CircleMarker>
          </div>
        );
      })}
      </>
    )}
    </MapContainer>
  );
}
/** Turns map clicks into probe points while probe mode is on. */
function ProbeClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: e => {
      console.log('map click', e.latlng);
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** The drawer opening and closing changes the visible map area. */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}