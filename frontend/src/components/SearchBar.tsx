import { useEffect, useRef, useState } from 'react';
import { searchFacilities, type SearchHit, type SearchHitType } from '../services/searchApi';
import { surface, floatingCard } from './panelStyles';
import type { LayerKey } from '../hooks/useMapLayers';

const SCOPES: { key: SearchHitType; label: string; layer: LayerKey }[] = [
  { key: 'gp',          label: 'GP',     layer: 'gps' },
  { key: 'polyclinic',  label: 'Poly',   layer: 'polyclinics' },
  { key: 'mrt',         label: 'MRT',    layer: 'transit' },
  { key: 'bus',         label: 'Bus',    layer: 'busStops' },
];

interface Props {
  theme: 'light' | 'dark';
  colours: Record<LayerKey, string>;
  onGoTo: (hit: SearchHit) => void;
  onMeasureFrom: (hit: SearchHit) => void;
  onOpenChange?: (open: boolean) => void;
}

export default function SearchBar({ theme, colours, onGoTo, onMeasureFrom, onOpenChange }: Props) {
  const c = surface(theme);
  const [q, setQ] = useState('');
  const [scopes, setScopes] = useState<SearchHitType[]>(['gp', 'polyclinic', 'mrt', 'bus']);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced, and aborts the in-flight request so a slow early query can't
  // land after a fast later one and overwrite it.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || scopes.length === 0) {
      setHits([]); setLoading(false); return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchFacilities(term, scopes, ctrl.signal)
        .then(r => { setHits(r); setCursor(-1); })
        .catch(() => { /* aborted or failed; leave previous results */ })
        .finally(() => setLoading(false));
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, scopes]);

  // Click-away
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    onOpenChange?.(open && q.trim().length >= 2);
    }, [open, q, onOpenChange]);

  const toggleScope = (k: SearchHitType) =>
    setScopes(prev => prev.includes(k) ? prev.filter(s => s !== k) : [...prev, k]);

  const select = (hit: SearchHit) => {
    onGoTo(hit);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(i => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); select(hits[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const dotColour = (t: SearchHitType) =>
    t === 'gp' ? colours.gps
    : t === 'polyclinic' ? colours.polyclinics
    : t === 'mrt' ? colours.transit
    : colours.busStops;

  return (
    <div ref={boxRef} style={{ ...floatingCard(theme), width: 268, padding: 10, position: 'relative', zIndex: 2 }}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search clinics, MRT exits, bus stops"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '7px 9px', fontSize: 13,
          background: c.sunken, color: c.text,
          border: `1px solid ${c.border}`, borderRadius: 6, outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
        {SCOPES.map(s => {
          const on = scopes.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggleScope(s.key)}
              style={{
                flex: 1, padding: '3px 0', fontSize: 11, cursor: 'pointer',
                borderRadius: 999, border: `1px solid ${on ? colours[s.layer] : c.border}`,
                background: on ? `${colours[s.layer]}22` : 'transparent',
                color: on ? c.text : c.textMuted,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {open && q.trim().length >= 2 && (
        <div style={{
          ...floatingCard(theme),
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
          maxHeight: 300, overflowY: 'auto', zIndex: 1100, padding: 4,
        }}>
          {loading && hits.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: c.textMuted }}>Searching…</div>
          )}
          {!loading && hits.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: c.textMuted }}>
              Nothing matches “{q.trim()}”.
            </div>
          )}
          {hits.map((h, i) => (
            <div
              key={`${h.type}-${h.id}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => select(h)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 8px', borderRadius: 5, cursor: 'pointer',
                background: i === cursor ? c.sunken : 'transparent',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: dotColour(h.type),
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, color: c.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{h.name}</div>
                {h.subtitle && (
                  <div style={{
                    fontSize: 11, color: c.textMuted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{h.subtitle}</div>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onMeasureFrom(h); setOpen(false); }}
                title="Add a measuring point here"
                style={{
                  flexShrink: 0, padding: '2px 7px', fontSize: 10.5, cursor: 'pointer',
                  background: 'transparent', color: c.textMuted,
                  border: `1px solid ${c.border}`, borderRadius: 4,
                }}
              >
                Measure
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}