import type { CSSProperties } from 'react';
import type { ProbePoint } from '../services/pointApi';
import { floatingCard, railButton, chevronStyle, surface, type PanelTheme } from './panelStyles';
import { LAYER_META, type LayerKey } from '../hooks/useMapLayers';

interface Props {
  points: ProbePoint[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  enabled: boolean;
  onToggleEnabled: () => void;
  atCapacity: boolean;
  withinAreaSpread: { areaId: number; name: string; min: number; max: number; count: number } | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: PanelTheme;
  colours: Record<LayerKey, string>;
}

const PROBE_COLOUR = '#00c2a8';

const fmtDist = (m: number | null | undefined) =>
  m == null ? '—' : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;

/**
 * Measured points, listed bottom-left.
 *
 * The comparison line is the reason this is a list: two points in the same
 * planning area with different nearest-facility distances demonstrate the
 * limitation of describing a whole area by one representative point.
 */
export default function ProbePanel({
  points, activeId, onSelect, onRemove, onClear,
  enabled, onToggleEnabled, atCapacity, withinAreaSpread,
  collapsed, onToggleCollapse, theme, colours,
}: Props) {
  const c = surface(theme);
  const s = mk(c);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        style={{ ...railButton(theme), color: points.length ? PROBE_COLOUR : c.textMuted }}
        title="Show measured points"
        aria-label="Show measured points"
      >
        ⊹
      </button>
    );
  }

  return (
    <aside style={{ ...floatingCard(theme), width: 300, padding: '12px 14px' }}>
      <div style={s.head}>
        <h3 style={s.title}>Measure from a point</h3>
        <button onClick={onToggleCollapse} style={chevronStyle(theme)} title="Hide">⌄</button>
      </div>

      <button
        onClick={onToggleEnabled}
        style={{
          ...s.modeButton,
          borderColor: enabled ? PROBE_COLOUR : c.border,
          color: enabled ? c.text : c.textMuted,
          background: enabled ? 'rgba(0, 194, 168, 0.12)' : 'transparent',
        }}
      >
        {enabled ? 'Click the map to measure · on' : 'Turn on measuring'}
      </button>

      {enabled && (
        <p style={s.hint}>
          Each click measures the straight-line distance from that spot to the
          nearest clinic, MRT exit and bus stop. Area selection is paused while
          this is on.
        </p>
      )}

      {atCapacity && <p style={s.warn}>Maximum of 8 points. Remove one to add another.</p>}

      {points.length === 0 && !enabled && (
        <p style={s.hint}>No points measured yet.</p>
      )}

      {points.length > 0 && (
        <ul style={s.list}>
          {points.map(p => {
            const isActive = p.id === activeId;
            return (
              <li key={p.id}>
                <div
                  onClick={() => onSelect(p.id)}
                  style={{
                    ...s.item,
                    background: isActive ? 'rgba(0, 194, 168, 0.12)' : 'transparent',
                    borderColor: isActive ? PROBE_COLOUR : 'transparent',
                  }}
                >
                  <span style={s.badge}>{p.label}</span>

                  <div style={s.itemBody}>
                    {p.loading && <span style={s.muted}>Measuring…</span>}
                    {p.error && <span style={s.error}>{p.error}</span>}
                    {p.result && (
                      <>
                        <div style={s.itemTitle}>
                          {p.result.planningAreaName ?? 'Outside any planning area'}
                        </div>
                        <div style={s.itemRow}>
                          <span style={{ ...s.tick, background: p.result.nearestFacilityType === 'Polyclinic'
                                ? colours.polyclinics
                                : colours.gps, }} />
                          <span style={s.dist}>{fmtDist(p.result.nearestFacilityMeters)}</span>
                          <span style={s.itemSub} title={p.result.nearestFacilityName ?? ''}>
                            {p.result.nearestFacilityName}</span>
                        </div>
                        <div style={s.itemRow}>
                          <span style={{ ...s.tick, background: colours.transit }} />
                          <span style={s.dist}>{fmtDist(p.result.nearestMrtMeters)}</span>
                          <span style={s.itemSub} title={p.result.nearestMrtStation ?? ''}>
                            {p.result.nearestMrtStation}
                          </span>
                        </div>
                        <div style={s.itemRow}>
                          <span style={{ ...s.tick, background: colours.busStops }} />
                          <span style={s.dist}>{fmtDist(p.result.nearestBusStopMeters)}</span>
                          <span style={s.itemSub} title={p.result.nearestBusStopDescription ?? ''}>
                            {p.result.nearestBusStopServices != null
                              ? `${p.result.nearestBusStopServices} services`
                              : p.result.nearestBusStopDescription}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); onRemove(p.id); }}
                    style={s.remove}
                    title="Remove this point"
                    aria-label={`Remove point ${p.label}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {withinAreaSpread && (
        <div style={s.compare}>
          <strong style={s.compareTitle}>Within {withinAreaSpread.name}</strong>
          <p style={s.compareBody}>
            {withinAreaSpread.count} points measured, nearest clinic ranges from{' '}
            {fmtDist(withinAreaSpread.min)} to {fmtDist(withinAreaSpread.max)}. The
            area-level figure uses one representative point, so it cannot show this
            spread.
          </p>
        </div>
      )}

      {points.length > 0 && (
        <button onClick={onClear} style={s.clear}>Clear all points</button>
      )}
    </aside>
  );
}

const mk = (c: ReturnType<typeof surface>): Record<string, CSSProperties> => ({
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { margin: 0, fontSize: 14, fontWeight: 500 },
  modeButton: {
    width: '100%', padding: '6px 10px', fontSize: 12, cursor: 'pointer',
    borderRadius: 6, border: '1px solid', marginBottom: 8,
  },
  hint: { margin: '0 0 8px', fontSize: 11.5, color: c.textMuted, lineHeight: 1.5 },
  warn: { margin: '0 0 8px', fontSize: 11.5, color: '#c9821f', lineHeight: 1.5 },
  list: {
    margin: 0, padding: 0, listStyle: 'none',
    display: 'flex', flexDirection: 'column', gap: 4,
    maxHeight: 260, overflowY: 'auto',
  },
  item: {
    display: 'flex', gap: 8, alignItems: 'flex-start',
    padding: '6px 7px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid transparent',
  },
  badge: {
    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
    background: PROBE_COLOUR, color: '#04201c',
    fontSize: 11, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  itemBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  itemTitle: { fontSize: 12.5, fontWeight: 500 },
  itemRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, fontVariantNumeric: 'tabular-nums',
  },
  dist: {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  minWidth: 52,          // aligns names into a column across rows
  textAlign: 'right',
  },
  itemSub: {
    flex: 1, minWidth: 0,
    color: c.textMuted, fontSize: 11,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tick: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  muted: { fontSize: 11.5, color: c.textMuted },
  error: { fontSize: 11.5, color: '#e05252' },
  remove: {
    background: 'none', border: 'none', color: c.textMuted,
    cursor: 'pointer', fontSize: 15, padding: '0 2px', lineHeight: 1,
  },
  compare: {
    marginTop: 10, padding: '8px 10px',
    background: c.sunken, borderRadius: 6,
    borderLeft: `2px solid ${PROBE_COLOUR}`,
  },
  compareTitle: { fontSize: 11.5, display: 'block', marginBottom: 3 },
  compareBody: { margin: 0, fontSize: 11, color: c.textMuted, lineHeight: 1.5 },
  clear: {
    marginTop: 10, background: 'none', border: 'none',
    color: c.textMuted, cursor: 'pointer', fontSize: 11.5, padding: 0,
    alignSelf: 'flex-start',
  },
});

export { PROBE_COLOUR };