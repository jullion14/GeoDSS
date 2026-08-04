import { useState } from 'react';
import type { ReactNode } from 'react';
import { surface, type PanelTheme } from './panelStyles';

/**
 * Inline help. Two shapes, deliberately kept small:
 *
 *   InfoTip   — a "?" next to a label, for terms a first-time user will not
 *               know ("normalised", "stability", "concentration").
 *   Callout   — a persistent one- or two-line explanation above a view, for
 *               things a tooltip is too small to carry.
 *
 * The rule applied throughout: explain what the number MEANS for a decision,
 * not what the algorithm does. "Its rank barely moves" beats "low variance
 * across Dirichlet samples".
 */

export function InfoTip({ text, theme }: { text: string; theme: PanelTheme }) {
  const [open, setOpen] = useState(false);
  const c = surface(theme);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: 5 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="What does this mean?"
        style={{
          width: 14, height: 14, borderRadius: '50%', padding: 0,
          border: `1px solid ${c.border}`, background: 'transparent',
          color: c.textMuted, fontSize: 9.5, lineHeight: 1,
          cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ?
      </button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: -8,
            width: 230, padding: '8px 10px', zIndex: 50,
            background: c.panel, color: c.text,
            border: `1px solid ${c.border}`, borderRadius: 7,
            boxShadow: c.shadow, backdropFilter: 'blur(12px)',
            fontSize: 11.5, lineHeight: 1.5, fontWeight: 400,
            textTransform: 'none', letterSpacing: 0,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function Callout({
  children, theme, tone = 'neutral',
}: {
  children: ReactNode;
  theme: PanelTheme;
  tone?: 'neutral' | 'note';
}) {
  const c = surface(theme);
  return (
    <p style={{
      margin: '0 0 10px',
      padding: '8px 10px',
      background: c.sunken,
      borderLeft: tone === 'note' ? `2px solid ${c.border}` : undefined,
      borderRadius: 6,
      fontSize: 11.5,
      lineHeight: 1.55,
      color: c.textMuted,
    }}>
      {children}
    </p>
  );
}

/**
 * Copy shared across the sensitivity views. Kept in one place so the wording
 * stays consistent, and so it can be revised without hunting through JSX.
 */
export const HELP = {
  weights:
    'Weights set how much each factor counts toward the score. Raising one makes the ranking respond more strongly to that factor, and automatically lowers the influence of the others.',
  direction:
    'Some factors raise priority as they increase (longer distance to a clinic means worse access). Others lower it (more facilities per resident means better provision). The score accounts for this automatically.',
  normalised:
    'Each factor is rescaled to a 0–1 range so they can be added together. 0 is the lowest value across all areas, 1 is the highest. Raw units like metres and people per km² cannot be compared directly.',
  score:
    'Each factor\'s normalised value is multiplied by its weight, and the results are added. A higher total means higher priority for intervention, not better access.',
  stability:
    'Where this area would rank if the factors were weighted differently. A short bar means its position holds up whatever you decide. A long bar means the rank shown depends on the weights you picked.',
  stabilityLabels:
    'Holds: the position barely moves. Shifts: it moves a few places. Depends: the position is mostly a consequence of your weighting, so read it as indicative only.',
  tornado:
    'How far this area would move if one factor were the only thing that mattered, compared with it being ignored entirely. A long bar means this area\'s position hinges on that one judgement.',
  sweep:
    'Drag a factor\'s weight from none to all and watch every area\'s rank change. Where two lines cross is the point at which one area overtakes another — that is where the decision genuinely flips.',
  seed:
    'The sampling uses a fixed starting value, so running this again gives exactly the same numbers. The analysis stays reproducible.',
} as const;