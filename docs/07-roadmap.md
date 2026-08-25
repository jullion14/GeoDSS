# Status and roadmap

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

```
DONE — Oct: database + backend architecture
DONE — Nov: GIS integration + interactive map
DONE — Dec: spatial analysis engine
DONE — Jan: decision support (scoring, weights, ranking, sensitivity)

- Feb: AI EXPLANATION MODULE
  DONE -> ExplanationPayload + ExplanationPayloadBuilder (closed fact ledger)
  DONE -> ExplanationVerifier (numeric provenance check)
  DONE -> TemplateExplanationWriter (deterministic fallback)
  DONE -> PromptBuilder (prompt filter, serialisation, system instruction)
  DONE -> verified across all 55 planning areas, zero findings
  -> AIExplanationService.cs + Gemini call, responseSchema, Live|Cached|Offline
  -> ExplainController.cs, ExplanationPanel in the frontend
  -> deliberate failure-mode runs for the evaluation chapter

Deferred: pairwise comparison mode (designed, cheap — same payload twice plus
a precomputed delta block); ranking-as-a-whole and probe point explanations.

- Mar: testing, evaluation, final report
- Apr: final refinements + presentation

Also outstanding: DatasetsController upload endpoint (display-only layers) —
required by the proposal, not yet built.

Deliverables: full-stack web app, interactive GIS dashboard, spatial analysis
engine, decision-support module with sensitivity analysis, AI-assisted
explanation module, RESTful backend API, PostgreSQL/PostGIS spatial database,
Final Technical Report (requirements, design, implementation, testing), user
guide as appendix/README.

--- Completed since last update -----------------------------------
- Point-level accessibility queries (probe points, up to 8, with within-area
  spread comparison)
- Measurement lines showing where each area's distances are measured from
- Two-view layout (map | analysis) with shared selection state
- Basemap switcher, panel theme follows basemap

Remaining major build: AI explanation module (Gemini). It now has a rich
deterministic payload to work from — score components, tornado effects, rank
stability, and optionally probe point results — all pre-computed, which is
exactly the constraint the supervisor set: the model explains numbers it is
given and calculates nothing.

Authentication was considered and deliberately not built. The application holds
no user data and persists nothing between sessions, so there is no resource to
protect. Recorded as a deployment consideration in 08-limitations.md rather
than an omission.

- Cross-dataset facility search (/api/search) with scope filters and a
  "measure from here" action feeding probe points
- Opt-in geolocation with accuracy circle
- User-customisable layer colours, persisted to localStorage
- All ~5,000 bus stops rendered, density handled by zoom rather than by a
  server-side service-count filter
- App icon and page title

- Demo safety: freeze prompt, regenerate RecordedExplanations for demo
  areas, commit them, verify Mode:Offline works with the network down
```
