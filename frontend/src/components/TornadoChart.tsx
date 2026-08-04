import type { AreaTornado } from '../services/sensitivityApi';
import { colourFor, sectionStyle, surface, type PanelTheme } from './panelStyles';
import { InfoTip, HELP } from './InfoTip';

interface Props {
  tornado: AreaTornado | null;
  totalAreas: number;
  loading: boolean;
  theme: PanelTheme;
}

/**
 * Which criteria drive this area's rank.
 *
 * Bars extend left (rank improves, moves toward 1) and right (rank worsens)
 * from the area's current position. Length is rank positions moved, so the
 * axis is directly readable: "this area would climb 4 places".
 */
export default function TornadoChart({ tornado, totalAreas, loading, theme }: Props) {
  const c = surface(theme);

  if (loading && !tornado) {
    return <p style={{ fontSize: 11.5, color: c.textMuted, margin: '8px 0' }}>Testing weightings…</p>;
  }
  if (!tornado) return null;

  const maxSwing = Math.max(...tornado.effects.map(e => Math.max(
    Math.abs(e.bestRank - tornado.baseRank),
    Math.abs(e.worstRank - tornado.baseRank),
  )), 1);

  return (
    <>
      <h4 style={sectionStyle(theme)}>
        What drives this rank
        <InfoTip text={HELP.tornado} theme={theme} />
      </h4>

      <p style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.5, margin: '2px 0 10px' }}>
        {tornado.summary}
      </p>

      <div style={{ position: 'relative', paddingBottom: 2 }}>
        {/* centre line = current rank */}
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 16,
          width: 1, background: c.border,
        }} />

        {tornado.effects.map(e => {
          const better = tornado.baseRank - e.bestRank;   // positive = climbs
          const worse = e.worstRank - tornado.baseRank;   // positive = falls
          const leftPct = (better / maxSwing) * 50;
          const rightPct = (worse / maxSwing) * 50;

          return (
            <div key={e.metricKey} style={{ marginBottom: 9 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: c.textMuted, marginBottom: 3,
              }}>
                <span>{e.label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {e.swing === 0 ? 'no effect' : `${e.swing} place${e.swing === 1 ? '' : 's'}`}
                </span>
              </div>

              <div style={{ position: 'relative', height: 13 }}>
                {better > 0 && (
                  <div
                    title={`Rises to ${e.bestRank} if this factor dominates`}
                    style={{
                      position: 'absolute', right: '50%', width: `${leftPct}%`,
                      height: 13, borderRadius: '3px 0 0 3px',
                      background: colourFor(e.metricKey),
                    }}
                  />
                )}
                {worse > 0 && (
                  <div
                    title={`Falls to ${e.worstRank} if this factor is ignored`}
                    style={{
                      position: 'absolute', left: '50%', width: `${rightPct}%`,
                      height: 13, borderRadius: '0 3px 3px 0',
                      background: colourFor(e.metricKey), opacity: 0.55,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10.5, color: c.textMuted, marginTop: 5,
        }}>
          <span>higher priority</span>
          <span>rank {tornado.baseRank} of {totalAreas}</span>
          <span>lower</span>
        </div>
      </div>
    </>
  );
}