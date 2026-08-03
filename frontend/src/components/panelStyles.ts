import type { CSSProperties } from 'react';

/* -------------------------------------------------------------------------
   Panel surfaces
   Panels float over the map, so they need enough opacity for text to hold up
   against whatever tiles are underneath — including satellite imagery, which
   is the worst case. 0.92 keeps a hint of the map visible without the text
   fighting it; the blur does most of the separation work.
   ------------------------------------------------------------------------- */

interface Surface {
  panel: string;
  sunken: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  shadow: string;
}

const DARK: Surface = {
  panel: 'rgba(18, 22, 28, 0.92)',
  sunken: 'rgba(0, 0, 0, 0.30)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  text: '#e6e9ef',
  textMuted: '#98a1b0',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
};

const LIGHT: Surface = {
  panel: 'rgba(252, 252, 253, 0.94)',
  sunken: 'rgba(0, 0, 0, 0.05)',
  border: 'rgba(0, 0, 0, 0.13)',
  borderSubtle: 'rgba(0, 0, 0, 0.07)',
  text: '#1a1d23',
  textMuted: '#5c6470',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.18)',
};

export type PanelTheme = 'dark' | 'light';

export const surface = (theme: PanelTheme): Surface => (theme === 'dark' ? DARK : LIGHT);

/** Card that sits on the map. backdropFilter is what makes 0.92 read as clean. */
export const floatingCard = (theme: PanelTheme): CSSProperties => {
  const c = surface(theme);
  return {
    background: c.panel,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    boxShadow: c.shadow,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    textAlign: 'left',
  };
};

export const railButton = (theme: PanelTheme): CSSProperties => ({
  ...floatingCard(theme),
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 15,
  color: surface(theme).textMuted,
  padding: 0,
});

export const chevronStyle = (theme: PanelTheme): CSSProperties => ({
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 16,
  color: surface(theme).textMuted,
  padding: 4,
  lineHeight: 1,
});

export const sectionStyle = (theme: PanelTheme): CSSProperties => ({
  margin: '16px 0 4px',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: surface(theme).textMuted,
});

export const labelStyle = (theme: PanelTheme): CSSProperties => ({
  ...sectionStyle(theme),
  margin: 0,
});

/* -------------------------------------------------------------------------
   Metric identity
   One colour per criterion, shared by sliders, contribution bars and swatches.
   Kept in TS rather than CSS because the bars are div widths — the value is
   needed in JavaScript. Chosen to hold up on both light and dark surfaces.
   ------------------------------------------------------------------------- */

export const METRIC_COLOURS: Record<string, string> = {
  dist_healthcare: '#2b9fd4',
  pop_density: '#e08b2a',
  facilities_per_10k: '#4ca832',
  dist_mrt: '#9b6dd6',
};

export const FALLBACK_COLOUR = '#7a828f';

export const colourFor = (key: string) => METRIC_COLOURS[key] ?? FALLBACK_COLOUR;

/* -------------------------------------------------------------------------
   Priority choropleth
   Sequential single-hue ramp: the quantity has one direction ("how urgent"),
   so a diverging or red-green scheme would misrepresent it — and red-green
   fails for roughly 8% of men. Amber reads on dark, light and satellite tiles.
   ------------------------------------------------------------------------- */

const SCORE_RAMP = ['#3b2f1c', '#7a5a20', '#b8862a', '#e0ab3a', '#f7cf6b'];

export function scoreColour(score: number, min: number, max: number): string {
  if (!Number.isFinite(score)) return '#555b66';
  const range = max - min;
  const t = range < 1e-9 ? 0.5 : (score - min) / range;
  const i = Math.min(SCORE_RAMP.length - 1, Math.max(0, Math.round(t * (SCORE_RAMP.length - 1))));
  return SCORE_RAMP[i];
}

export const SCORE_RAMP_STOPS = SCORE_RAMP;

/** Planning-area outline colour, which has to flip with the basemap. */
export const areaStroke = (theme: PanelTheme) =>
  theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(30,35,45,0.55)';