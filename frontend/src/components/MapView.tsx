import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { LayerKey } from '../hooks/useMapLayers';
import type { AreaPriorityScore } from '../services/priorityApi';
import { scoreColour, areaStroke } from './panelStyles';
import { BASEMAPS, type BasemapKey } from './basemaps';

interface Props {
  layers: Record<LayerKey, FeatureCollection | null>;
  visible: Record<LayerKey, boolean>;
  selectedAreaId: number | null;
  onSelectArea: (id: number | null) => void;
  scoresById?: Map<number, AreaPriorityScore>;
  shadeByPriority: boolean;
  basemap: BasemapKey;
}

/** The map, and only the map. Panels are siblings rendered over it by App. */
export default function MapView({
  layers, visible, selectedAreaId, onSelectArea, scoresById, shadeByPriority, basemap,
}: Props) {
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
    layer.on({ click: () => onSelectArea(feature.properties.id) });
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
  ) =>
    fc?.features.map((f: any, i: number) => {
      const [lng, lat] = f.geometry.coordinates;
      return (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={4}
          pathOptions={{
            color: base.theme === 'light' ? '#ffffff' : color,
            weight: base.theme === 'light' ? 1 : 1,
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
      style={{ position: 'absolute', inset: 0, background: base.theme === 'dark' ? '#0d1116' : '#e8e8e8' }}
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
    </MapContainer>
  );
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