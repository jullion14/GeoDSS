import type { RankStability } from '../services/sensitivityApi';
import { surface, type PanelTheme } from './panelStyles';

/** Reader-facing wording for the stability buckets. */
const PLAIN: Record<string, string> = {
  stable: 'holds',
  moderate: 'shifts',
  volatile: 'depends',
};

const TONE: Record<string, string> = {
  stable: '#1baf7a',
  moderate: '#eda100',
  volatile: '#eb6834',
};

/**
 * Where an area landed across every sampled weighting.
 *
 * The bar spans the 5th–95th percentile ranks; the tick marks the rank it
 * currently holds. A short bar means the position survives disagreement about
 * the weights, which is the only kind of ranking worth acting on.
 */
export default function StabilityBar({
  stability, totalAreas, theme,
}: {
  stability: RankStability | undefined;
  totalAreas: number;
  theme: PanelTheme;
}) {
  const c = surface(theme);

  if (!stability) {
    return <span style={{ fontSize: 11, color: c.textMuted }}>—</span>;
  }

  const span = Math.max(totalAreas - 1, 1);
  const left = ((stability.p05Rank - 1) / span) * 100;
  const width = Math.max(((stability.p95Rank - stability.p05Rank) / span) * 100, 2);
  const tick = ((stability.baseRank - 1) / span) * 100;
  const tone = TONE[stability.stability] ?? c.textMuted;

  const label = PLAIN[stability.stability] ?? '';

  const title =
    stability.p05Rank === stability.p95Rank
      ? `Stays at rank ${stability.baseRank} under every weighting tested.`
      : `Would rank between ${stability.p05Rank} and ${stability.p95Rank} depending on how the ` +
        `factors are weighted. Kept rank ${stability.baseRank} in ` +
        `${Math.round(stability.rankHeldShare * 100)}% of the weightings tested.`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={title}>
      <div style={{ position: 'relative', height: 12, flex: 1, minWidth: 70 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 5,
          height: 2, background: c.sunken, borderRadius: 1,
        }} />
        <div style={{
          position: 'absolute', left: `${left}%`, width: `${width}%`, top: 3,
          height: 6, borderRadius: 3, background: tone,
        }} />
        <div style={{
          position: 'absolute', left: `calc(${tick}% - 1px)`, top: 0,
          width: 2, height: 12, background: c.text,
        }} />
      </div>

      <span style={{
        fontSize: 10.5, color: c.textMuted, whiteSpace: 'nowrap',
        minWidth: 78, fontVariantNumeric: 'tabular-nums',
      }}>
        {stability.p05Rank === stability.p95Rank
          ? `always ${stability.baseRank}`
          : `${stability.p05Rank}–${stability.p95Rank}`}
        {label && ` · ${label}`}
      </span>
    </div>
  );
}