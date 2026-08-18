import { floatingCard, surface, type PanelTheme } from './panelStyles';

export type ViewKey = 'map' | 'analysis';

const TABS: { key: ViewKey; label: string }[] = [
  { key: 'map', label: 'Map' },
  { key: 'analysis', label: 'Analysis' },
];

export default function ViewTabs({
  view, onChange, theme, analysisBadge,
}: {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  theme: PanelTheme;
  analysisBadge?: number;
}) {
  const c = surface(theme);

  return (
    <nav style={{ ...floatingCard(theme), display: 'flex', padding: 3, gap: 2 }} aria-label="View">
      {TABS.map(tab => {
        const active = tab.key === view;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '5px 16px',
              fontSize: 12.5,
              cursor: 'pointer',
              borderRadius: 7,
              border: 'none',
              background: active ? c.sunken : 'transparent',
              color: active ? c.text : c.textMuted,
              fontWeight: active ? 500 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ lineHeight: 1 }}>{tab.label}</span>
            {tab.key === 'analysis' && analysisBadge != null && (
              <span style={{ fontSize: 10.5, color: c.textMuted, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {analysisBadge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}