import type { AccessibilityMetrics } from '../types/analysis';
import type { AreaPriorityScore, MetricDescriptor } from '../services/priorityApi';
import {
  floatingCard, railButton, chevronStyle, sectionStyle, colourFor, surface, type PanelTheme,
} from './panelStyles';
import type { AreaTornado } from '../services/sensitivityApi';
import TornadoChart from './TornadoChart';
import { InfoTip, HELP } from './InfoTip';
import type { ProbePoint } from '../services/pointApi';
import { PROBE_COLOUR } from './ProbePanel';

interface Props {
  metrics: AccessibilityMetrics | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  score: AreaPriorityScore | null;
  scoreMetrics: MetricDescriptor[];
  totalAreas: number;
  theme: PanelTheme;
  tornado: AreaTornado | null;
  sensitivityLoading: boolean;
  activeProbe: ProbePoint | null;
}

const fmtDist = (m: number | null) =>
  m == null ? '—' : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;

const fmtNum = (n: number | null, digits = 0) =>
  n == null ? '—' : n.toLocaleString(undefined, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });

export default function AreaSelector({
  metrics, loading, error, onClose, collapsed, onToggleCollapse,
  score, scoreMetrics, totalAreas, theme, tornado, sensitivityLoading, activeProbe,
}: Props) {
  const c = surface(theme);

  const Row = ({ label, value, hint, accent, secondary }: {
    label: string;
    value: string;
    hint?: string;
    accent?: boolean;
    secondary?: string;
  }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '5px 0', borderBottom: `1px solid ${c.borderSubtle}`, gap: 12,
      borderLeft: accent ? `2px solid ${PROBE_COLOUR}` : undefined,
      paddingLeft: accent ? 7 : 0,
    }}>
      <span style={{ fontSize: 12.5, color: c.textMuted }}>
        {label}
        {hint && <span style={{ display: 'block', fontSize: 11, opacity: 0.75 }}>{hint}</span>}
      </span>
      <span style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, display: 'block' }}>{value}</span>
        {secondary && (
          <span style={{ fontSize: 10.5, color: c.textMuted, opacity: 0.8 }}>{secondary}</span>
        )}
      </span>
    </div>
  );

  if (collapsed) {
    return (
      <button onClick={onToggleCollapse} style={railButton(theme)} title="Show analysis" aria-label="Show analysis">
        ‹
      </button>
    );
  }

  return (
    <aside style={{
      ...floatingCard(theme),
      width: 300, padding: '12px 14px', maxHeight: '100%', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onToggleCollapse} style={chevronStyle(theme)} title="Hide analysis">›</button>
        {metrics && (
          <button onClick={onClose} style={{ ...chevronStyle(theme), fontSize: 18 }} title="Clear selection">×</button>
        )}
      </div>

      {error && <p style={{ color: '#e05252', fontSize: 12.5 }}>{error}</p>}
      {loading && <p style={{ fontSize: 12.5, color: c.textMuted }}>Loading…</p>}

      {!metrics && !loading && !error && (
        <p style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.5, margin: '4px 0 8px' }}>
          Select a planning area on the map, or pick one from the ranking below.
        </p>
      )}

      {metrics && !loading && (
        <>
          <h3 style={{ margin: '0 0 2px', fontSize: 15 }}>{metrics.name}</h3>
          <p style={{ margin: '0 0 8px', fontSize: 11.5, color: c.textMuted }}>{metrics.region}</p>

          {activeProbe?.result && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 9px', marginBottom: 8,
              background: 'rgba(0, 194, 168, 0.12)',
              border: `1px solid ${PROBE_COLOUR}`,
              borderRadius: 6, fontSize: 11.5, lineHeight: 1.45,
            }}>
              <span style={{
                width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                background: PROBE_COLOUR, color: '#04201c',
                fontSize: 10.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeProbe.label}
              </span>
              <span>
                Showing distances from measured point {activeProbe.label}
                {activeProbe.result.planningAreaName
                  && activeProbe.result.planningAreaId !== metrics.planningAreaId
                  && ` (in ${activeProbe.result.planningAreaName})`}
              </span>
            </div>
          )}

          {score ? (
            <>
              <h4 style={sectionStyle(theme)}>
                Priority score
                <InfoTip text={HELP.score} theme={theme} />
              </h4>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '6px 0 8px', borderBottom: `1px solid ${c.borderSubtle}`,
              }}>
                <span style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>
                  {score.totalScore.toFixed(3)}
                </span>
                <span style={{ fontSize: 12, color: c.textMuted }}>
                  rank {score.rank} of {totalAreas}
                </span>
              </div>

              <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', margin: '8px 0 10px' }}>
                {score.components.map(comp => (
                  <span key={comp.key} style={{
                    width: `${(comp.contribution / Math.max(score.totalScore, 1e-6)) * 100}%`,
                    background: colourFor(comp.key),
                    opacity: comp.isImputed ? 0.35 : 1,
                  }} />
                ))}
              </div>

              <p style={{
                margin: '0 0 6px', fontSize: 10.5, color: c.textMuted, lineHeight: 1.45,
                display: 'flex', alignItems: 'center',
              }}>
                weight × rescaled value = contribution
                <InfoTip text={HELP.normalised} theme={theme} />
              </p>

              {score.components.map(comp => {
                const m = scoreMetrics.find(x => x.key === comp.key);
                return (
                  <div key={comp.key} style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', fontSize: 11.5,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: colourFor(comp.key), flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, color: c.textMuted }}>{m?.label ?? comp.key}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: c.textMuted }}>
                      {comp.weight.toFixed(2)} × {comp.normalisedValue.toFixed(2)} ={' '}
                      <strong style={{ color: c.text }}>{comp.contribution.toFixed(3)}</strong>
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <p style={{
              fontSize: 11.5, color: c.textMuted, lineHeight: 1.5,
              margin: '8px 0 0', padding: '8px 10px',
              background: c.sunken, borderRadius: 6,
            }}>
              Not scored — this area has no resident population data, so it is
              excluded from the priority ranking.
            </p>
          )}

          {score && (
            <TornadoChart
              tornado={tornado}
              totalAreas={totalAreas}
              loading={sensitivityLoading}
              theme={theme}
            />
          )}

          <h4 style={sectionStyle(theme)}>Demographics</h4>
          <Row label="Population" value={fmtNum(metrics.population)} />
          <Row label="Area" value={`${metrics.areaSqKm.toFixed(2)} km²`} />
          <Row label="Density" hint="residents / km²" value={fmtNum(metrics.populationDensity)} />

          <h4 style={sectionStyle(theme)}>Healthcare access</h4>
          <Row label="GP clinics" value={String(metrics.gpCount)} />
          <Row label="Polyclinics" value={String(metrics.polyclinicCount)} />
          <Row label="Facilities per 10k" hint="residents" value={fmtNum(metrics.facilitiesPer10k, 2)} />

          {/* // Nearest Healthcare facility display */}
          {activeProbe?.result ? (
            <Row
              label="Nearest facility"
              hint={`from point ${activeProbe.label} · ${activeProbe.result.nearestFacilityName ?? '—'}`}
              value={fmtDist(activeProbe.result.nearestFacilityMeters)}
              accent-secondary={`area reference point: ${fmtDist(metrics.nearestFacilityMeters)}`}
            />
          ) : (
            <Row
              label="Nearest facility"
              hint={metrics.nearestFacilityName ?? undefined}
              value={fmtDist(metrics.nearestFacilityMeters)}
            />
          )}

          <h4 style={sectionStyle(theme)}>Transit access</h4>
          <Row label="MRT exits in area" value={String(metrics.mrtExitCount)} />

          {/* // Showing nearest transit station display */}
          {activeProbe?.result ? (
            <Row
              label="Nearest MRT"
              hint={`from point ${activeProbe.label} · ${activeProbe.result.nearestMrtStation ?? '—'}`}
              value={fmtDist(activeProbe.result.nearestMrtMeters)}
              accent-secondary={`area reference point: ${fmtDist(metrics.nearestMrtMeters)}`}
            />
          ) : (
            <Row
              label="Nearest MRT"
              hint={metrics.nearestMrtStation ?? undefined}
              value={fmtDist(metrics.nearestMrtMeters)}
            />
          )}

          <h4 style={sectionStyle(theme)}>Bus access</h4>
          <Row label="Bus stops in area" value={String(metrics.busStopCount)} />
          <Row label="Well-served stops" hint="10+ services"
               value={String(metrics.wellServedBusStops)} />
          <Row label="Busiest stop"
               value={metrics.busiestStopServices
                 ? `${metrics.busiestStopServices} services` : '—'} />
          {activeProbe?.result && (
            <Row
              label="Nearest bus stop"
              hint={`from point ${activeProbe.label} · ${activeProbe.result.nearestBusStopDescription ?? '—'}`}
              value={fmtDist(activeProbe.result.nearestBusStopMeters)}
            />
          )}
      

          <p style={{ fontSize: 11, color: c.textMuted, marginTop: 14, lineHeight: 1.5, opacity: 0.8 }}>
            Distances are straight-line. Area figures are measured from the
            reference point marked on the map — an interior point of the
            planning area, not its population centre. Measured points show the
            distance from wherever you clicked.
          </p>
        </>
      )}
    </aside>
  );
}