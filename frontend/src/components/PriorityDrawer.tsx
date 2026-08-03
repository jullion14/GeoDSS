import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AreaPriorityScore, MetricDescriptor, PriorityScoreResponse, WeightMap } from '../services/priorityApi';
import { colourFor, labelStyle, surface, type PanelTheme } from './panelStyles';

interface Props {
  data: PriorityScoreResponse | null;
  metrics: MetricDescriptor[];
  notes: string[];
  weights: WeightMap;
  onWeightChange: (key: string, value: number) => void;
  onResetWeights: () => void;
  isDefault: boolean;
  loading: boolean;
  error: string | null;
  selectedAreaId: number | null;
  onSelectArea: (id: number) => void;
  open: boolean;
  onToggleOpen: () => void;
  theme: PanelTheme;
}

/**
 * Ranked comparison as a bottom drawer.
 *
 * Collapsed by default to a single strip: the leading areas as chips, so the
 * map stays the primary surface. The full table, the weights and the formula
 * are one click away — they are read occasionally, not continuously.
 *
 * Row expansion was removed deliberately: the per-criterion breakdown now
 * lives in AreaSelector next to that area's metrics, so selecting a row
 * populates the side panel rather than duplicating it here.
 */
export default function PriorityDrawer({
  data, metrics, notes, weights, onWeightChange, onResetWeights, isDefault,
  loading, error, selectedAreaId, onSelectArea, open, onToggleOpen, theme,
}: Props) {
  const c = surface(theme);
  const [showWeights, setShowWeights] = useState(false);
  const [sortKey, setSortKey] = useState<string>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const s = mk(c, theme);

  const weightSum = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);

  const rows = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.results];
    sorted.sort((a, b) => {
      let d = 0;
      if (sortKey === 'rank') d = a.rank - b.rank;
      else if (sortKey === 'name') d = a.name.localeCompare(b.name);
      else d = rawOf(a, sortKey) - rawOf(b, sortKey);
      return sortAsc ? d : -d;
    });
    return sorted;
  }, [data, sortKey, sortAsc]);

  const maxScore = useMemo(
    () => (data ? Math.max(...data.results.map(r => r.totalScore), 1e-4) : 1),
    [data],
  );

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(key === 'rank' || key === 'name'); }
  };

  const top = data?.results.slice(0, 5) ?? [];

  return (
    <section style={{ ...s.drawer, height: open ? '46vh' : 44 }} aria-label="Priority ranking">
      {/* --- always-visible strip --- */}
      <div style={s.strip} onClick={onToggleOpen} role="button" tabIndex={0}
           onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggleOpen(); }}>
        <span style={s.stripLabel}>Priority ranking</span>

        <div style={s.chips}>
          {top.map(r => (
            <button
              key={r.planningAreaId}
              onClick={e => { e.stopPropagation(); onSelectArea(r.planningAreaId); }}
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
          {!data && !error && <span style={s.stripMuted}>Loading…</span>}
          {error && <span style={{ ...s.stripMuted, color: '#e05252' }}>{error}</span>}
        </div>

        <span style={s.stripChevron}>{open ? '⌄' : '⌃'}</span>
      </div>

      {open && (
        <div style={s.body}>
          {/* --- weights, folded away by default --- */}
          <div style={s.toolbar}>
            <button onClick={() => setShowWeights(v => !v)} style={s.toolButton}>
              {showWeights ? 'Hide weights' : 'Adjust weights'}
            </button>
            {!isDefault && (
              <button onClick={onResetWeights} style={s.toolButton}>Reset to defaults</button>
            )}
            {data && <code style={s.formulaInline}>{data.formula}</code>}
          </div>

          {showWeights && (
            <div style={s.weightGrid}>
              {metrics.map(m => (
                <div key={m.key} style={s.weightCell}>
                  <div style={s.weightTop}>
                    <span style={s.weightLabel}>
                      <span style={{ ...s.swatch, background: colourFor(m.key) }} />
                      {m.label}
                    </span>
                    <span style={s.weightValue}>{(weights[m.key] ?? 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={weights[m.key] ?? 0}
                    onChange={e => onWeightChange(m.key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: colourFor(m.key) }}
                    aria-label={`Weight for ${m.label}`}
                  />
                  <p style={s.weightHint}>
                    {m.direction === 'cost' ? 'Higher lowers priority. ' : 'Higher raises priority. '}
                    Range {fmt(m.observedMin)}–{fmt(m.observedMax)} {m.unit}
                  </p>
                </div>
              ))}
              <p style={s.sumNote}>
                Weights total {weightSum.toFixed(2)}
                {Math.abs(weightSum - 1) > 0.001 && ' — rescaled to 1 before scoring.'}
              </p>
            </div>
          )}

          {data?.warnings.map(w => <p key={w} style={s.warning}>{w}</p>)}

          {/* --- ranked table --- */}
          <div style={{ ...s.tableWrap, opacity: loading ? 0.55 : 1 }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th} onClick={() => toggleSort('rank')}>#{ind(sortKey === 'rank', sortAsc)}</th>
                  <th style={{ ...s.th, textAlign: 'left' }} onClick={() => toggleSort('name')}>
                    Planning area{ind(sortKey === 'name', sortAsc)}
                  </th>
                  <th style={s.th}>Score</th>
                  {metrics.map(m => (
                    <th key={m.key} style={s.th} title={`${m.label} (${m.unit})`}
                        onClick={() => toggleSort(m.key)}>
                      {short(m.key)}{ind(sortKey === m.key, sortAsc)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.planningAreaId}
                    onClick={() => onSelectArea(row.planningAreaId)}
                    style={{
                      ...s.tr,
                      background: row.planningAreaId === selectedAreaId
                        ? ACCENT_BG : 'transparent',
                    }}
                  >
                    <td style={s.tdRank}>{row.rank}</td>
                    <td style={s.tdName}>
                      <div>{row.name}</div>
                      <div style={s.bar}>
                        {row.components.map(c => (
                          <span key={c.key} style={{
                            width: `${(c.contribution / maxScore) * 100}%`,
                            background: colourFor(c.key),
                            opacity: c.isImputed ? 0.35 : 1,
                          }} />
                        ))}
                      </div>
                    </td>
                    <td style={s.tdScore}>{row.totalScore.toFixed(3)}</td>
                    {metrics.map(m => {
                      const c = row.components.find(x => x.key === m.key);
                      return (
                        <td key={m.key} style={s.td}>
                          {c?.rawValue == null
                            ? <span style={s.missing}>—</span>
                            : fmt(c.rawValue)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {notes.length > 0 && (
            <details style={s.notes}>
              <summary style={s.notesSummary}>About this score</summary>
              <ul style={s.notesList}>{notes.map(n => <li key={n}>{n}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

const ACCENT = '#4c9fe0';
const ACCENT_BG = 'rgba(76, 159, 224, 0.16)';

// --- helpers ---------------------------------------------------------------

function rawOf(a: AreaPriorityScore, key: string) {
  return a.components.find(c => c.key === key)?.rawValue ?? Number.NEGATIVE_INFINITY;
}

function short(key: string) {
  return ({
    dist_healthcare: 'Clinic (m)',
    pop_density: 'Density',
    facilities_per_10k: 'Per 10k',
    dist_mrt: 'MRT (m)',
  } as Record<string, string>)[key] ?? key;
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—';
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function ind(active: boolean, asc: boolean) {
  return active ? <span style={{ opacity: 0.6 }}>{asc ? ' ▲' : ' ▼'}</span> : null;
}

// --- styles ----------------------------------------------------------------

const mk = (c: ReturnType<typeof surface>, theme: PanelTheme): Record<string, CSSProperties> => ({
  drawer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    background: c.panel,
    color: c.text,
    borderTop: `1px solid ${c.border}`,
    boxShadow: c.shadow,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex', flexDirection: 'column',
    transition: 'height 180ms ease',
    zIndex: 900,
  },
  strip: {
    display: 'flex', alignItems: 'center', gap: 12,
    height: 44, padding: '0 14px', flexShrink: 0, cursor: 'pointer',
  },
  stripLabel: { ...labelStyle(theme), flexShrink: 0 },
  chips: { display: 'flex', gap: 6, overflow: 'hidden', flex: 1 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: `1px solid ${c.border}`,
    borderRadius: 20, padding: '3px 10px', fontSize: 12,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  chipRank: { fontSize: 10.5, opacity: 0.7, fontVariantNumeric: 'tabular-nums' },
  stripMuted: { fontSize: 12, color: c.textMuted },
  stripChevron: { color: c.textMuted, fontSize: 14, flexShrink: 0 },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 14px' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 },
  toolButton: {
    background: 'none', border: 'none', color: ACCENT,
    cursor: 'pointer', fontSize: 12, padding: 0,
  },
  formulaInline: {
    fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11, color: c.textMuted,
    flex: 1, minWidth: 200,
  },
  weightGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14, padding: 12, marginBottom: 12,
    background: c.sunken, borderRadius: 8,
  },
  weightCell: { display: 'flex', flexDirection: 'column', gap: 4 },
  weightTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  weightLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  weightValue: { fontSize: 12, fontVariantNumeric: 'tabular-nums' },
  weightHint: { margin: 0, fontSize: 10.5, color: c.textMuted, lineHeight: 1.4 },
  swatch: { width: 8, height: 8, borderRadius: 2, display: 'inline-block', flexShrink: 0 },
  sumNote: { gridColumn: '1 / -1', margin: 0, fontSize: 11, color: c.textMuted },
  tableWrap: { overflowX: 'auto', transition: 'opacity 120ms ease' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: {
    textAlign: 'right', padding: '5px 8px', borderBottom: `1px solid ${c.border}`,
    color: c.textMuted, fontWeight: 600, fontSize: 11,
    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
  },
  tr: { cursor: 'pointer' },
  td: {
    textAlign: 'right', padding: '5px 8px',
    borderBottom: `1px solid ${c.borderSubtle}`,
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  },
  tdRank: {
    textAlign: 'right', padding: '5px 8px',
    borderBottom: `1px solid ${c.borderSubtle}`,
    color: c.textMuted, fontVariantNumeric: 'tabular-nums',
  },
  tdName: { padding: '5px 8px', borderBottom: `1px solid ${c.borderSubtle}`, minWidth: 150 },
  tdScore: {
    textAlign: 'right', padding: '5px 8px',
    borderBottom: `1px solid ${c.borderSubtle}`,
    fontVariantNumeric: 'tabular-nums', fontWeight: 600,
  },
  bar: {
    display: 'flex', height: 3, marginTop: 4, borderRadius: 2,
    overflow: 'hidden', background: c.sunken, maxWidth: 220,
  },
  missing: { color: c.textMuted },
  warning: { margin: '0 0 6px', fontSize: 11.5, color: '#c9821f' },
  notes: { fontSize: 12, color: c.textMuted, marginTop: 12 },
  notesSummary: { cursor: 'pointer', fontSize: 11.5 },
  notesList: { margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6, fontSize: 11.5 },
});