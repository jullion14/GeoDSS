# Status and roadmap

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

```
DONE — Oct: database + backend architecture
DONE — Nov: GIS integration + interactive map
DONE — Dec: spatial analysis engine
DONE — Jan: decision support (scoring, weights, ranking, sensitivity)

- Feb: AI EXPLANATION MODULE
  -> AIExplanationService.cs + Gemini API integration
  -> ExplainController.cs, ExplanationPanel in the frontend
  -> Prompt: pass all computed metrics AND score components explicitly;
     constrain the model to reason only from supplied values; no DB access.
     Bus figures and dwelling-type mix are good context for it to mention.
  -> Sensitivity output is strong material: the model can say a ranking is
     or isn't robust to reweighting.
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
```
