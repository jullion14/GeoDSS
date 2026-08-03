import { LAYER_META, type LayerKey } from '../hooks/useMapLayers';
import { floatingCard, railButton, chevronStyle, surface, SCORE_RAMP_STOPS, type PanelTheme } from './panelStyles';
import { BASEMAPS, BASEMAP_ORDER, type BasemapKey } from './basemaps';

interface Props {
  visible: Record<LayerKey, boolean>;
  onToggle: (key: LayerKey) => void;
  counts?: Partial<Record<LayerKey, number>>;
  loading?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  shadeByPriority: boolean;
  onToggleShading: () => void;
  canShade: boolean;
  basemap: BasemapKey;
  onBasemapChange: (key: BasemapKey) => void;
  theme: PanelTheme;
}

export default function LayerPanel({
  visible, onToggle, counts, loading, collapsed, onToggleCollapse,
  shadeByPriority, onToggleShading, canShade, basemap, onBasemapChange, theme,
}: Props) {
  const c = surface(theme);

  if (collapsed) {
    return (
      <button onClick={onToggleCollapse} style={railButton(theme)} title="Show layers" aria-label="Show layers">
        ▦
      </button>
    );
  }

  return (
    <aside style={{ ...floatingCard(theme), width: 214, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Layers</h3>
        <button onClick={onToggleCollapse} style={chevronStyle(theme)} title="Hide layers">«</button>
      </div>

      {/* --- basemap --- */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {BASEMAP_ORDER.map(key => {
          const active = key === basemap;
          return (
            <button
              key={key}
              onClick={() => onBasemapChange(key)}
              title={BASEMAPS[key].label}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 10.5,
                cursor: 'pointer',
                borderRadius: 5,
                border: `1px solid ${active ? 'var(--accent)' : c.border}`,
                background: active ? 'var(--accent-bg, rgba(120,120,255,0.14))' : 'transparent',
                color: active ? c.text : c.textMuted,
                fontWeight: active ? 600 : 400,
              }}
            >
              {BASEMAPS[key].label}
            </button>
          );
        })}
      </div>

      {loading && <p style={{ fontSize: 12, color: c.textMuted }}>Loading…</p>}

      {(Object.keys(LAYER_META) as LayerKey[]).map(key => {
        const meta = LAYER_META[key];
        return (
          <label key={key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 7, fontSize: 13, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={() => onToggle(key)}
              style={{ accentColor: meta.color }}
            />
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{meta.label}</span>
            {counts?.[key] !== undefined && (
              <span style={{ fontSize: 11, color: c.textMuted }}>{counts[key]}</span>
            )}
          </label>
        );
      })}

      {/* Shading is a property of the planning-areas layer, so it belongs here
          even though the values come from the scoring service. */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${c.border}` }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
          cursor: canShade ? 'pointer' : 'default', opacity: canShade ? 1 : 0.5,
        }}>
          <input type="checkbox" checked={shadeByPriority} onChange={onToggleShading} disabled={!canShade} />
          <span>Shade by priority</span>
        </label>

        {shadeByPriority && canShade && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              {SCORE_RAMP_STOPS.map(col => <span key={col} style={{ flex: 1, background: col }} />)}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10.5, color: c.textMuted, marginTop: 3,
            }}>
              <span>Lower</span>
              <span>Higher priority</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}