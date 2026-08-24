# Analysis methodology

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

This is the report-facing document: what is computed, how, and why.
Known weaknesses are collected separately in [`08-limitations.md`](08-limitations.md).

## Inclusion criteria — which areas are scored

Of 55 planning areas, **38 are scored**. Two filters, applied in
`SpatialAnalysisService.GetAllAsync`:

| Filter | Effect | Why |
|---|---|---|
| Has a `population` row | 55 -> 49 | Industrial, reserve and water-catchment areas have no residents, so density and per-capita rates are undefined. |
| `total_population >= 1000` | 49 -> 38 | Below this, per-capita rates are unstable and distort the shared normalisation scale. |

The 1,000 floor matches the threshold the ETL already uses to null out
percentage bands, so it is one criterion applied consistently rather than an
arbitrary cutoff chosen to improve results.

**Why the floor matters.** Min-max normalisation takes its bounds from the
data, so bounds are shared across all scored areas. Tuas has one clinic and
roughly 80 residents, giving 125 facilities per 10,000 — around six times the
next highest value. Including it sets the maximum for that criterion so high
that every genuine area compresses into the bottom few percent of the scale
and the criterion stops discriminating between them. One unrepresentative area
degrades the score for all the others.

Unscored areas are not hidden. Selecting one on the map shows its metrics with
an explicit note that it is excluded from the ranking and why.

## Metrics

```
GET /api/analysis/area/{id} returns per planning area:

  AreaSqKm                ST_Area(geom::geography) / 1e6
  PopulationDensity       population / area
  GpCount / PolyclinicCount / TotalFacilities
  FacilitiesPer10k        facilities * 10000 / population
  NearestFacilityMeters   ST_Distance from ST_PointOnSurface, KNN (<->)
  NearestFacilityName / NearestFacilityType
  MrtExitCount
  NearestMrtMeters / NearestMrtStation
  BusStopCount / WellServedBusStops / BusiestStopServices   [context only]

Scored metrics (MetricCatalog): dist_healthcare, pop_density,
facilities_per_10k, dist_mrt. Bus metrics are deliberately NOT scored.

===============================================================
DECISION SUPPORT + SENSITIVITY
===============================================================
Scoring: weighted linear combination over min-max normalised metrics, with
cost-direction metrics inverted. Formula string is generated and exposed in
the API so the UI can display it rather than hiding it.

Sensitivity (SensitivityService):
  1. Dirichlet Monte Carlo over the weight simplex -> rank stability
     intervals. Defaults: 1000 samples, concentration 40, seed 20260803.
  2. One-at-a-time perturbation -> tornado (which criterion drives an area).
  3. Weight sweep -> crossover points where the ordering flips.

ON DETERMINISM: Monte Carlo introduces randomness into a system whose whole
premise is being deterministic and auditable. The seed is fixed and always
echoed in the response, so any figure quoted in the report is reproducible.
```

## Bus metric validation — key finding

```
Four candidate bus accessibility metrics tested for construct validity:

  avg services per stop      vs distance from CBD    r = -0.802   REJECTED
  % stops with 10+ services  vs distance from CBD    r = -0.815   REJECTED
  stops per km²              vs population density   r =  0.783   REJECTED
  busiest stop (max)         vs distance from CBD    r =  0.385   marginal

avg services also correlated 0.622 with facilities_per_10k — redundant twice.

INTERPRETATION: Singapore's bus network is radial, so any measure of how many
services pass a stop is structurally determined by that stop's position
relative to the city centre. Aggregating to planning-area level then removes
the variation that would have been meaningful — the difference between a
well-served and a quiet stop WITHIN the same town.

DECISION: bus data retained as descriptive context in AreaSelector, NOT as a
weighted input. MetricCatalog unchanged. The underlying limitation (bus
accessibility needs household-level, not area-level, measurement) is the same
constraint that put building-level analysis out of scope.

Queries preserved in bus_metric_validation.sql.
```

## Point queries (probe points)

The area-level analysis measures every distance from one representative point
per planning area, produced by `ST_PointOnSurface`. That guarantees an interior
point for concave polygons, but a single point cannot describe a whole area.

Probe points let a user click any location and measure the straight-line
distance from that spot to the nearest healthcare facility, MRT exit and bus
stop. Up to eight points can be placed at once.

**Scope boundary.** This is a query tool, not a scoring input. `MetricCatalog`
is untouched, the priority score and ranking are unchanged, and nothing a user
clicks feeds back into the analysis. The unit of analysis remains the planning
area.

**What it contributes.** Placing several points inside one planning area shows
how much nearest-facility distance varies across it. The panel reports that
spread directly ("3 points measured, nearest clinic ranges from 210 m to
1.4 km"). This turns limitation #10 from an assertion into a measurement, and
the figure is worth reproducing in the evaluation chapter.

**Implementation.** `GET /api/analysis/point?lat=&lng=` runs the same
KNN-then-refine pattern as the area query: the `<->` operator orders candidates
by degrees on raw geometry (cheap, uses the GiST index), then the top 20 are
re-ranked by true geodesic distance. A bounding-box guard rejects coordinates
outside Singapore before the query runs. `ST_Contains` against `planning_areas`
identifies the containing area, or returns null over water.

## Measurement lines

Area-level distances are drawn on the map: the representative point is marked,
with dashed lines to the nearest facility (red) and nearest MRT exit (purple),
matching the layer colours. Two things become visible that the numbers alone did
not convey — that the reference point is an interior point rather than a
population centre, and that lines frequently cross planning-area boundaries,
because nearest-facility search is deliberately cross-boundary.

## AI explanation module

The explanation module operates on a **closed fact ledger**. Every figure the
model may state is supplied to it as a `{ id, label, value }` record where
`value` is a pre-formatted string produced in C#. The model is never handed a
raw float, so no arithmetic path exists from its inputs to the text shown to
the user. Comparative figures — medians, deltas, percentile positions — are
computed by `ExplanationPayloadBuilder` and supplied as facts in their own
right, removing any legitimate reason for the model to calculate.

The constraint is enforced at three tiers, of decreasing strength:

| Tier | Mechanism | Guarantee |
|---|---|---|
| Structural | `AIExplanationService` takes `HttpClient`, `IOptions` and `ILogger` only — no `DbContext`, no analysis service | Cannot reach the database. Compile-time. |
| Preventive | Closed ledger, formatted strings, filtered prompt, low temperature | Reduces invention. Best-effort. |
| Detective | `ExplanationVerifier` checks every numeric token against the supplied values | An untraceable figure cannot reach the user unflagged. |

The third tier is the module's contribution. Prevention is best-effort;
detection is the guarantee.

The ledger returned to the frontend is complete, because the grounding panel
shows the user everything the analysis produced. The ledger sent to the model
is filtered — normalised intermediate values, alternative rank ranges and
observed bounds are withheld — because every fact in the prompt is a figure
the verifier will accept wherever it appears. Filtering can never cause a
false positive, since verification still runs against the full ledger.

**Verified across all 55 planning areas.** Deterministic explanations were
generated for every area, scored and excluded, and checked: 38 scored areas
yielded 30–32 verifiable figures each, 17 excluded areas 3–5, with zero
findings in every case.