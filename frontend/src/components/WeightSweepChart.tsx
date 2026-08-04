import { useMemo, useState } from 'react';
import type { WeightSweep } from '../services/sensitivityApi';
import type { MetricDescriptor } from '../services/priorityApi';
import { colourFor, surface, type PanelTheme } from './panelStyles';
import { InfoTip, HELP } from './InfoTip';

interface Props {
  sweep: WeightSweep | null;
  metrics: MetricDescriptor[];
  sweepMetricKey: string | null;
  onSweepMetricChange: (key: string) => void;
  selectedAreaId: number | null;
  onSelectArea: (id: number) => void;
  areaNames: Map<number, string>;
  loading: boolean;
  theme: PanelTheme;
}

const W = 640;
const H = 220;
const PAD = { top: 12, right: 96, bottom: 30, left: 32 };

/**
 * Rank vs weight, one line per area.
 *
 * Hand-rolled SVG rather than a charting library: 25 polylines is not worth a
 * dependency, and it keeps full control over which lines are emphasised.
 * Everything is grey except the selected area, because 25 coloured lines is
 * noise — the point is to follow one area through the crossovers.
 */
export default function WeightSweepChart({
  sweep, metrics, sweepMetricKey, onSweepMetricChange,
  selectedAreaId, onSelectArea, areaNames, loading, theme,
}: Props) {
  const c = surface(theme);
  const [hovered, setHovered] = useState<number | null>(null);

  const areaCount = useMemo(
    () => (sweep ? Object.keys(sweep.steps[0]?.ranks ?? {}).length : 0),
    [sweep],
  );

  const x = (w: number) => PAD.left + w * (W - PAD.left - PAD.right);
  const y = (rank: number) =>
    PAD.top + ((rank - 1) / Math.max(areaCount - 1, 1)) * (H - PAD.top - PAD.bottom);

  const lines = useMemo(() => {
    if (!sweep || areaCount === 0) return [];
    const ids = Object.keys(sweep.steps[0].ranks).map(Number);
    return ids.map(id => ({
      id,
      name: areaNames.get(id) ?? String(id),
      points: sweep.steps.map(s => `${x(s.weight)},${y(s.ranks[id])}`).join(' '),
      endRank: sweep.steps[sweep.steps.length - 1].ranks[id],
    }));
  }, [sweep, areaCount, areaNames]);

  const accent = colourFor(sweepMetricKey ?? '');

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexWrap: 'wrap', marginBottom: 6,
      }}>
        <span style={{ fontSize: 12, color: c.textMuted }}>
          Sweep the weight for
          <InfoTip text={HELP.sweep} theme={theme} />
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => onSweepMetricChange(m.key)}
              style={{
                padding: '3px 9px', fontSize: 11, cursor: 'pointer', borderRadius: 5,
                border: `1px solid ${m.key === sweepMetricKey ? colourFor(m.key) : c.border}`,
                background: 'transparent',
                color: m.key === sweepMetricKey ? c.text : c.textMuted,
              }}
            >
              {m.label.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {loading && !sweep && (
        <p style={{ fontSize: 11.5, color: c.textMuted }}>Computing sweep…</p>
      )}

      {sweep && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
               aria-label={`Rank of each planning area as the weight for ${sweep.label} varies from 0 to 1`}>
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke={c.border} />
            <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={c.border} />

            {/* current weight marker */}
            <line
              x1={x(sweep.currentWeight)} y1={PAD.top}
              x2={x(sweep.currentWeight)} y2={H - PAD.bottom}
              stroke={accent} strokeWidth={1.5} strokeDasharray="3 3"
            />
            <text x={x(sweep.currentWeight)} y={PAD.top - 2} fill={c.textMuted}
                  fontSize={10} textAnchor="middle">
              now
            </text>

            {/* crossover markers: where the leading area changes */}
            {sweep.leadChanges.map(w => (
              <circle key={w} cx={x(w)} cy={y(1)} r={3} fill="none" stroke={c.textMuted} strokeWidth={1} />
            ))}

            {lines.map(l => {
              const active = l.id === selectedAreaId || l.id === hovered;
              return (
                <polyline
                  key={l.id}
                  points={l.points}
                  fill="none"
                  stroke={active ? accent : c.textMuted}
                  strokeWidth={active ? 2 : 1}
                  opacity={active ? 1 : 0.22}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(l.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectArea(l.id)}
                />
              );
            })}

            {/* label the emphasised line at its right edge */}
            {lines.filter(l => l.id === (hovered ?? selectedAreaId)).map(l => (
              <text key={l.id} x={W - PAD.right + 6} y={y(l.endRank) + 3}
                    fill={c.text} fontSize={11}>
                {l.name}
              </text>
            ))}

            <text x={PAD.left - 6} y={y(1) + 3} fill={c.textMuted} fontSize={10} textAnchor="end">1</text>
            <text x={PAD.left - 6} y={y(areaCount) + 3} fill={c.textMuted} fontSize={10} textAnchor="end">
              {areaCount}
            </text>
            <text x={PAD.left} y={H - 8} fill={c.textMuted} fontSize={10}>weight 0</text>
            <text x={W - PAD.right} y={H - 8} fill={c.textMuted} fontSize={10} textAnchor="end">1</text>
          </svg>

          <p style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.5, margin: '4px 0 0' }}>
            {sweep.leadChanges.length === 0
              ? `The top-ranked area stays the same no matter how ${sweep.label.toLowerCase()} is weighted.`
              : `The leading area changes at weight ${sweep.leadChanges.map(w => w.toFixed(2)).join(' and ')} — below and above those points, a different area comes out on top.`}
            {' '}Hover a line to follow one area; click to select it.
          </p>
        </>
      )}
    </div>
  );
}