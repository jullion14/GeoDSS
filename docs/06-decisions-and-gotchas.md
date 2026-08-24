# Key decisions and gotchas

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

Things that cost time once and should not cost it twice.

```
DATABASE / ETL
 1. ST_Distance on SRID 4326 returns DEGREES. Must cast ::geography.
    Values like 0.0043 instead of 478 are the tell.
 2. ST_PointOnSurface, not ST_Centroid — a centroid can fall outside a
    concave polygon, so distances would be measured from outside the area.
 3. Nearest-facility search deliberately CROSSES planning area boundaries
    (residents near an edge use the closest facility regardless of area).
    Facility COUNTS stay within-area. The two answer different questions.
 4. import_data.py CASCADE silently drops views, materialised views and
    functions built on these tables. Nothing currently does this, but a
    scoring view would need its definition kept in the script.
 5. Facilities-per-10k is absurd for tiny areas (1 clinic in Tuas, pop 80,
    = 125 per 10k). Scoring filters on population.

BACKEND
 6. Population needs explicit HasKey(p => p.PlanningAreaId) — EF convention
    looks for Id or PopulationId and finds neither.
 7. EVERY Population property needs explicit HasColumnName — none of the
    snake_case names match C# convention. Omitting one gives a runtime
    'column "Pct15_24" does not exist'. Population and AccessibilityMetrics
    are the ONLY entities that cannot be inferred by convention.
 8. AccessibilityMetrics registered .HasNoKey().ToView(null) — required for
    FromSqlRaw projection into a non-table class.
 9. NetTopologySuite.IO.GeoJSON4STJ + GeoJsonConverterFactory registered in
    AddJsonOptions, or NTS geometries won't serialize to GeoJSON.
10. .NET webapi template uses minimal APIs by default. Controllers/ was
    created manually; REQUIRES AddControllers() AND MapControllers() in
    Program.cs or every route 404s.
11. CORS: registering the "FrontendDev" policy isn't enough —
    app.UseCors("FrontendDev") must actually be called.

FRONTEND
12. react-leaflet <GeoJSON> does NOT re-run its style function on prop
    change. The key prop must change to force a remount, or the selected
    polygon won't visually highlight.
13. preferCanvas={true} on MapContainer — Leaflet renders each CircleMarker
    as an SVG DOM node; canvas is required once bus stops are on.
14. Bus stops: ALL ~5,000 fetched, not server-filtered. The old
    ?minServices=10 filter made the layer inconsistent with the probe
    endpoint, which measures against every stop — a leg could end at a stop
    that was never sent to the browser. Noise is handled at render time
    instead: <10-service stops are smaller, fainter, and hidden below
    zoom 14.
15. CircleMarker over default Leaflet markers — default pin icons break
    under Vite (asset path resolution).
16. React <Popup> ESCAPES HTML strings, unlike Leaflet's bindPopup which
    parses it. Pass JSX, not "<b>name</b>".
17. Leaflet caches container size. Panels resizing the map need
    invalidateSize() — handled by a ResizeObserver in MapView.
18. LayerPanel iterates Object.keys(LAYER_META), so adding a layer there
    adds its checkbox, colour dot and count automatically.
19. Vite's react-ts template pins #root to a fixed width — overridden for
    the full-bleed map layout.

PROJECT
20. Secrets: dotnet user-secrets (backend), frontend/.env, LTA_ACCOUNT_KEY
    (env var). Never hardcoded — fetch_bus_data.py is committed publicly.
21. Upload functionality scoped to display-only map layers, NOT integrated
    into the analysis engine. Generalised ingestion deliberately out of
    scope.
22. Denominator change: population is now ALL residents, not HDB residents.
    Facilities-per-10k figures shifted accordingly. State this in the report
    rather than letting numbers quietly move between midterm and final.

--- Added after the 2025 data migration -------------------------
23. FromSqlRaw column lists are unforgiving. A missing comma before a new
    column block and a trailing comma before FROM both parse as syntax
    errors, and the only symptom is a 500 on every analysis endpoint. Paste
    the generated SQL into psql before assuming the C# is at fault.
24. Bus columns come from a CROSS JOIN LATERAL, so COUNT(*) returns 0 for an
    area with no stops but MAX(service_count) returns NULL. BusiestStopServices
    is int?; BusStopCount and WellServedBusStops are int. Do not "fix" the
    null.
25. Population floor for scoring is 1,000 residents, not > 0. Below that,
    per-capita rates are unstable (1 clinic in Tuas, pop 80, = 125 per 10k)
    and a single outlier stretches the min-max scale so every real area
    compresses toward zero. This is an inclusion criterion, not a bug fix —
    see 05-methodology.md and 08-limitations.md.
26. /api/analysis/priority-config returns observedMin/observedMax as NULL by
    design: bounds cannot be known until the data is scored. The frontend
    must take its MetricDescriptor list from the SCORE response, not the
    config response, or the observed ranges render as dashes forever.
27. Never hardcode the scored-area count in the frontend. It moved 25 -> 49
    -> 38 across one afternoon. StabilityBar divides by it to position the
    range, so a stale fallback silently mis-scales every bar.
28. index.css styles ALL <code> elements: display:inline-flex plus a fixed
    --code-bg. The inline-flex stops long formula strings wrapping, and the
    background ignores the panel theme. Components rendering <code> must set
    display, background and padding explicitly, or scope the global rule.
29. usePriorityScores must clear loading in the catch block as well as the
    finally. The finally skips on abort, which can leave "Loading..." and an
    error message on screen at the same time.

--- Point query session ------------------------------------------
30. A 405 on a route that clearly exists is usually the HTTPS redirection
    middleware, not the route table. "Failed to determine the https port for
    redirect" in the startup log is the tell. Wrap UseHttpsRedirection in
    if (!app.Environment.IsDevelopment()).
31. Swagger is not enabled by default in .NET 9+ webapi templates — Swashbuckle
    was replaced by Microsoft.AspNetCore.OpenApi, which serves /openapi/v1.json
    rather than a UI. A 404 on /swagger says nothing about your routes.
32. Lateral subquery aliases are not visible to the outer SELECT. Computing
    ST_Y(h.geom) in the outer list fails with "missing FROM-clause entry for
    table h" — the value must be produced inside the lateral and read back
    through its alias (nf.lat).
33. Copy-pasting a lateral block and forgetting to change the table alias is
    silent until runtime: FROM transit_exits t with ST_Y(h.geom) inside is the
    same error as above but harder to spot.
34. React props declared in the interface but NOT destructured in the function
    signature are silently undefined inside JSX, not a compile error. This
    caused two separate "renders fine but does nothing" bugs (selectedMetrics,
    then probeEnabled). Check the signature first when a feature does nothing
    at all.
35. index.css styles every <code> element with display:inline-flex and a fixed
    --code-bg. inline-flex prevents long formula strings from wrapping, and the
    background ignores the panel theme. Components rendering <code> must set
    display, background and padding explicitly.
36. Flex children default to flex-shrink: 1, so cards in a column flex layout
    compress and clip their content instead of letting the page scroll. Set
    flexShrink: 0 on cards, and use a spacer element rather than bottom padding
    at the end of a scroll container.
37. Leaflet's permanent Tooltip renders as a styled bubble. Used as a numeric
    label it needs background, border, shadow and the ::before arrow stripped —
    see .probe-label in index.css.
38. preferCanvas on MapContainer can let vector layers intercept clicks before
    the map-level handler sees them. Probe clicks are therefore handled both by
    a useMapEvents capture AND by the GeoJSON layer's own click handler.

--- Frontend refinement session ----------------------------------
39. CORRECTION to #38: the GeoJSON layer's own probe click handler has been
    removed. Probe clicks are now handled ONLY by ProbeClickCapture at the
    map level. The dual handling meant probe mode silently stopped working
    whenever the planning-areas layer was hidden, since the polygon was
    doing the work the map-level capture was supposed to do.
40. GeoJSON onEachFeature runs ONCE per layer creation. Props read inside
    the handler are captured then and go stale; the layer only rebuilds when
    its `key` changes. probeEnabled is therefore read through a ref. Symptom
    is a click handler behaving according to state from several interactions
    ago. Related to #34 — both are "silently wrong value" failures, not
    compile errors.
41. MapView's JSX nests deeply (fragment + IIFE + conditionals). Render
    blocks were twice placed inside the `selectedMetrics && selectedAreaId
    === ...` guard by accident and never rendered — first ProbeClickCapture,
    then the whole probePoints and userPosition blocks. Anything that should
    always render must be a DIRECT child of MapContainer.
42. Leaflet pane ordering (markerPane above overlayPane) does NOT compose
    with preferCanvas. Canvas renders one <canvas> per pane, so
    pointer-events cannot be re-enabled per marker: either the pane swallows
    every click or passes all of them through. Reverted — see
    08-limitations.md.
43. <input type="color"> onChange maps to the `input` event and fires
    continuously while dragging. Committing each event rebuilt ~5,900
    markers. Fixed with local draft state committed on blur. The draft must
    be cleared on commit or it permanently shadows the real value and
    "Reset colours" appears to do nothing.
44. useMemo on marker arrays only protects the OTHER layers. The layer being
    recoloured still rebuilds on every event, so #43 is required as well,
    not instead.
45. `Position` collides with both the DOM global and geojson's coordinate
    tuple. A missing import resolves silently to the wrong type and still
    compiles. Named UserPosition for this reason.
46. overflow on a container clips absolutely-positioned descendants.
    styles.topLeft had overflowY:'auto', which cut off SearchBar's results
    dropdown. Scroll belongs on the inner list, not the panel stack.
47. enableHighAccuracy:true makes desktop geolocation hang until timeout —
    laptops have no GPS, so the browser waits for a fix it cannot obtain.
    false plus a 30s timeout resolves via network lookup. Separately:
    watchPosition keeps retrying after TIMEOUT, so the error handler must
    NOT clear the watch in that branch.
48. L.svg() belongs at module scope. In the component body it constructs a
    new renderer every render and orphans the previous one.

--- AI explanation module: payload and verification ---------------
49. All figure formatting goes through ONE class (Fmt, nested in
    ExplanationPayloadBuilder). The verifier tests model output by exact
    string match against ledger values, so a figure formatted anywhere else
    breaks the check silently. Adding a metric means adding its unit case to
    BOTH Fmt.ByUnit and Fmt.RoundForDisplay.
50. Fmt.ByUnit switches on MetricCatalog's Unit strings, which are "m",
    "people/km²" and "per 10k". Guessing them ("per 10,000", "per km²")
    falls through to the default and emits an unformatted decimal. Nothing
    fails; the ledger just quietly contains "7412.31" next to properly
    formatted values.
51. Deltas must be computed from ALREADY-ROUNDED display values, not raw
    floats. Independently rounding a value, a median and their difference
    produces three individually correct figures that do not reconcile
    (1,840 − 1,200 = 640, displayed as 630). An explanation quoting all
    three looks like it cannot add up. Fmt.RoundForDisplay exists for this.
52. Verification applies ONLY to generated prose. Sections whose body is
    builder-supplied text (exclusion reason, caveats) are marked
    IsVerbatim and excluded, or the forbidden-claim check flags the
    system's own wording — the caveat "not scored or ranked" contains
    three banned terms by design.
53. RankStability exposes bestRank/worstRank AND p05Rank/p95Rank/
    rankHeldShare. Use the latter. Min-max across 1,000 Dirichlet draws is
    set by single unlucky samples and makes every area look volatile.
54. Withhold a fact rather than instructing the model not to use it. Tuas
    was handed "0.0 per 10,000 residents" (pop 80) alongside an
    instruction to report counts rather than rates. A fact that should not
    be quoted has no business being quotable — rates and weights are now
    omitted from the ledger entirely for unscored areas.
55. ToLowerInvariant mangles acronyms in metric labels ("distance to
    nearest mrt exit"). Lower() in ExplanationPayloadBuilder preserves MRT.
56. Minimal-API debug routes do not pick up AddControllers().
    AddJsonOptions(...), so enums serialise as integers there and as
    strings from ExplainController. Use ConfigureHttpJsonOptions if a
    minimal route needs the same treatment.
```
