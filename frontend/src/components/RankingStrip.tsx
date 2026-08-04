import type { CSSProperties } from 'react';
import type { PriorityScoreResponse } from '../services/priorityApi';
import { labelStyle, surface, type PanelTheme } from './panelStyles';

interface Props {
  data: PriorityScoreResponse | null;
  error: string | null;
  selectedAreaId: number | null;
  onSelectArea: (id: number) => void;
  onOpenAnalysis: () => void;
  theme: PanelTheme;
}

/**
 * The ranking, reduced to one line on the map view.
 *
 * Enough to answer "is the area I'm looking at a priority?" at a glance. The
 * full table, the weights and the sensitivity work live on the analysis view —
 * they need width, and they don't need the map.
 */
export default function RankingStrip({
  data, error, selectedAreaId, onSelectArea, onOpenAnalysis, theme,
}: Props) {
  const c = surface(theme);
  const s = mk(c, theme);
  const top = data?.results.slice(0, 6) ?? [];

  return (
    <section style={s.strip} aria-label="Priority ranking summary">
      <span style={s.label}>Priority ranking</span>

      <div style={s.chips}>
        {top.map(r => (
          <button
            key={r.planningAreaId}
            onClick={() => onSelectArea(r.planningAreaId)}
            style={{
              ...s.chip,
              borderColor: r.planningAreaId === selectedAreaId ? ACCENT : c.border,
              color: r.planningAreaId === selectedAreaId ? c.text : c.textMuted,
            }}
          >
            <span style={s.chipRank}>{r.rank}</span>
            {r.name}
          </button>
        ))}
        {!data && !error && <span style={s.muted}>Loading…</span>}
        {error && <span style={{ ...s.muted, color: '#e05252' }}>{error}</span>}
      </div>

      <button onClick={onOpenAnalysis} style={s.openButton}>
        All {data?.areaCount ?? ''} areas →
      </button>
    </section>
  );
}

const ACCENT = '#4c9fe0';

const mk = (c: ReturnType<typeof surface>, theme: PanelTheme): Record<string, CSSProperties> => ({
  strip: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 46,
    display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
    background: c.panel, color: c.text,
    borderTop: `1px solid ${c.border}`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 900,
  },
  label: { ...labelStyle(theme), flexShrink: 0 },
  chips: { display: 'flex', gap: 6, overflow: 'hidden', flex: 1 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: `1px solid ${c.border}`,
    borderRadius: 20, padding: '3px 10px', fontSize: 12,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  chipRank: { fontSize: 10.5, opacity: 0.7, fontVariantNumeric: 'tabular-nums' },
  muted: { fontSize: 12, color: c.textMuted },
  openButton: {
    background: 'none', border: 'none', color: ACCENT,
    cursor: 'pointer', fontSize: 12, padding: 0, flexShrink: 0,
    whiteSpace: 'nowrap',
  },
});