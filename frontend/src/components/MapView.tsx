import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, 
  Popup, Tooltip, useMap, useMapEvents, Circle } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { LayerKey } from '../hooks/useMapLayers';
import type { AreaPriorityScore } from '../services/priorityApi';
import { scoreColour, areaStroke } from './panelStyles';
import { BASEMAPS, type BasemapKey } from './basemaps';
import type { AccessibilityMetrics } from '../types/analysis';
import type { ProbePoint } from '../services/pointApi';
import { PROBE_COLOUR } from './ProbePanel';
import type { UserPosition } from '../hooks/useGeolocation';
import L from 'leaflet';
import type { SearchHitType } from '../services/searchApi';
import type { FlyTarget } from '../types/map';

const svgRenderer = L.svg();

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
  colours: Record<LayerKey, string>;
  userPosition: UserPosition | null;
  flyTo: FlyTarget | null;
  onUserPanned: () => void;
}

/** The map, and only the map. Panels are siblings rendered over it by App. */
export default function MapView({
  layers, visible, selectedAreaId, onSelectArea, scoresById, shadeByPriority, basemap,
  selectedMetrics, probePoints, activeProbeId, probeEnabled, onProbeClick, onSelectProbe, colours,
  userPosition, flyTo, onUserPanned,
}: Props) {
  const base = BASEMAPS[basemap];
  const stroke = areaStroke(base.theme);
  const [zoom, setZoom] = useState(12);
  const [highlight, setHighlight] = useState<{ lat: number; lng: number } | null>(null);

  const USER_COLOUR = '#2f80ed';

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
    : feature.properties.population ? colours.planningAreas : '#6b7280';

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
  const probeEnabledRef = useRef(probeEnabled);
  probeEnabledRef.current = probeEnabled;

  const onEachArea = (feature: any, layer: any) => {
    layer.on({
      click: () => { if (!probeEnabledRef.current) onSelectArea(feature.properties.id); }
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
    radius = 5,
  ) =>
    fc?.features.map((f: any, i: number) => {
      const [lng, lat] = f.geometry.coordinates;
      // Dots shrink where density is highest and grow where you're trying to
      // click one.
      const r = zoom >= 16 ? radius + 2 : zoom >= 14 ? radius + 1 : radius;
      return (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={r}
          pathOptions={{
            color: base.theme === 'light' ? '#ffffff' : color,
            weight: 1,
            fillColor: color,
            fillOpacity: 0.85,
          }}
          interactive={!probeEnabled}
        >
          <Popup>{label(f.properties)}</Popup>
        </CircleMarker>
      );
    });

    // Each layer's markers rebuild only when that layer's own inputs change.
    // Without this, changing one colour re-renders all ~5,900 markers.
    const gpMarkers = useMemo(
      () => renderPoints(layers.gps, colours.gps, p => (
        <><strong>{p.name}</strong>{p.address && <><br />{p.address}</>}</>
      )),
      [layers.gps, colours.gps, zoom, base.theme, probeEnabled],
    );

    const polyMarkers = useMemo(
      () => renderPoints(layers.polyclinics, colours.polyclinics, p => (
        <><strong>{p.name}</strong>{p.address && <><br />{p.address}</>}</>
      ), 6),
      [layers.polyclinics, colours.polyclinics, zoom, base.theme, probeEnabled],
    );

    const transitMarkers = useMemo(
      () => renderPoints(layers.transit, colours.transit, p => (
        <><strong>{p.stationName}</strong>{p.exitCode && <><br />{p.exitCode}</>}</>
      )),
      [layers.transit, colours.transit, zoom, base.theme, probeEnabled],
    );

    const busMarkers = useMemo(
      () => layers.busStops?.features.map((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        const services = f.properties.serviceCount ?? 0;
        const wellServed = services >= 10;
        if (!wellServed && zoom < 14) return null;

        const busR = wellServed ? 5 : 3.5;
        const r = zoom >= 16 ? busR + 2 : zoom >= 14 ? busR + 1 : busR;

        return (
          <CircleMarker
            key={f.properties.id}
            center={[lat, lng]}
            radius={r}
            pathOptions={{
              color: base.theme === 'light' ? '#ffffff' : colours.busStops,
              weight: wellServed ? 1 : 0.5,
              fillColor: colours.busStops,
              fillOpacity: wellServed ? 0.85 : 0.45,
            }}
          >
            <Popup>
              <strong>{f.properties.description}</strong>
              <br />
              <span style={{ opacity: 0.7 }}>{f.properties.busStopCode}</span>
              {f.properties.roadName && <> · {f.properties.roadName}</>}
              <br />{services} service{services === 1 ? '' : 's'}
            </Popup>
          </CircleMarker>
        );
      }),
      [layers.busStops, colours.busStops, zoom, base.theme],
    );

    // The ring is temporary on purpose: it answers "which one did I search for"
    // and then gets out of the way, rather than becoming a second kind of marker.
    useEffect(() => {
      if (!flyTo) return;
      setHighlight({ lat: flyTo.lat, lng: flyTo.lng });
      const t = setTimeout(() => setHighlight(null), 4000);
      return () => clearTimeout(t);
    }, [flyTo?.nonce]);

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
      <ZoomWatch onZoom={setZoom} />
      <DragWatch onDrag={onUserPanned} />
      {probeEnabled && <ProbeClickCapture onClick={onProbeClick} />}
      <PanToActiveProbe point={probePoints.find(p => p.id === activeProbeId) ?? null} />
      <FlyToTarget target={flyTo} />

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
          key={`areas-${selectedAreaId}-${shadeByPriority}-${basemap}-${scoresById?.size ?? 0}-${colours.planningAreas}`}
          data={layers.planningAreas}
          style={areaStyle}
          onEachFeature={onEachArea}
        />
      )}

      {visible.gps && gpMarkers}
      {visible.polyclinics && polyMarkers}
      {visible.transit && transitMarkers}
      {visible.busStops && busMarkers}

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
                  pathOptions={{ color: colours.gps, weight: 2, dashArray: '5 5', opacity: 0.85 }}
                />
              )}
              {mrt && (
                <Polyline
                  positions={[origin, mrt]}
                  pathOptions={{ color: colours.transit, weight: 2, dashArray: '5 5', opacity: 0.85 }}
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
            legs.push({
              to: [r.nearestFacilityLat, r.nearestFacilityLng],
              colour: r.nearestFacilityType === 'Polyclinic' ? colours.polyclinics : colours.gps,
            });
          }
          if (r?.nearestMrtLat != null && r.nearestMrtLng != null) {
            legs.push({ to: [r.nearestMrtLat, r.nearestMrtLng], colour: colours.transit });
          }
          if (r?.nearestBusStopLat != null && r.nearestBusStopLng != null) {
            legs.push({ to: [r.nearestBusStopLat, r.nearestBusStopLng], colour: colours.busStops });
          }
  
          return (
            <Fragment key={p.id}>
              {/* only the active point draws its lines — eight points times
                  three legs is unreadable otherwise */}
              {isActive && legs.map((leg, i) => (
                <Fragment key={i}>
                  <Polyline
                    positions={[origin, leg.to]}
                    pathOptions={{ color: leg.colour, weight: 2, dashArray: '4 4', opacity: 0.85 }}
                  />
                  <CircleMarker
                    center={leg.to}
                    radius={5}
                    pathOptions={{
                      color: '#ffffff', weight: 1.5,
                      fillColor: leg.colour, fillOpacity: 1,
                    }}
                  />
                </Fragment>
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
          </Fragment>
        );
      })}
      {userPosition && (
        <>
          {/* Accuracy matters here: a 2 km fix would otherwise imply a precision
              the reading doesn't have, and these are accessibility distances. */}
          <Circle
            center={[userPosition.lat, userPosition.lng]}
            radius={userPosition.accuracy}
            pathOptions={{ color: USER_COLOUR, weight: 1, fillColor: USER_COLOUR, fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={6}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: USER_COLOUR, fillOpacity: 1 }}
          >
            <Popup>
              <strong>Your location</strong><br />
              Accurate to about {Math.round(userPosition.accuracy)} m
            </Popup>
          </CircleMarker>
        </>
      )}
      {highlight && (
        <CircleMarker
          center={[highlight.lat, highlight.lng]}
          radius={13}
          className="search-pulse"
          interactive={false}
          pathOptions={{ color: '#FF2D95', weight: 2.5, fill: false, opacity: 0.95, renderer: svgRenderer }}
        />
      )}
    </MapContainer>
  );
}
/** Turns map clicks into probe points while probe mode is on. */
function ProbeClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: e => {
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

/** Selecting a point off-screen otherwise looks like nothing happened. */
function PanToActiveProbe({ point }: { point: ProbePoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    const r = point.result;
    const pts: [number, number][] = [[point.lat, point.lng]];
    if (r?.nearestFacilityLat != null) pts.push([r.nearestFacilityLat, r.nearestFacilityLng!]);
    if (r?.nearestMrtLat != null) pts.push([r.nearestMrtLat, r.nearestMrtLng!]);
    if (r?.nearestBusStopLat != null) pts.push([r.nearestBusStopLat, r.nearestBusStopLng!]);

    if (pts.length === 1) map.panTo(pts[0]);
    else map.flyToBounds(pts, { padding: [80, 80], maxZoom: 16, duration: 0.6 });
  }, [point?.id, map]);
  return null;
}

function ZoomWatch({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

/** Search results are usually off-screen, and at low zoom a minor bus stop
 *  isn't even rendered — so this flies rather than pans. */
function FlyToTarget({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 });
  }, [target?.nonce, map]);
  return null;
}

function DragWatch({ onDrag }: { onDrag: () => void }) {
  useMapEvents({ dragstart: onDrag });
  return null;
}