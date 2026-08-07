# GeoDSS

A web-based Geospatial Decision Support System for analysing healthcare and
transport accessibility across Singapore's planning areas.

Deterministic PostGIS analysis computes the accessibility metrics and a
multi-criteria priority score. An LLM explains the results in plain language —
it never performs the analysis. Every weight, normalisation bound and formula
is exposed through the API and displayed in the interface, so a ranking can
always be traced back to the numbers that produced it.

CEG3001 Capstone Project · Singapore Institute of Technology

---

## What it does

**Maps the data.** Planning area boundaries, 237 GP clinics, 26 polyclinics,
613 MRT station exits and around 5,000 bus stops, on four switchable basemaps
with the panel theme following the map.

**Computes accessibility per area.** Population density, facilities per 10,000
residents, distance to the nearest healthcare facility and MRT exit, and bus
service context — all from PostGIS, all deterministic.

**Ranks areas by priority.** A weighted linear combination over min-max
normalised criteria. Weights are adjustable, the formula is displayed as it
runs, and each area's score breaks down into `weight × normalised =
contribution` per criterion.

**Tests how much the ranking depends on your choices.** Every area is re-scored
under 1,000 sampled weightings. The table shows where each area would rank if
the factors were weighted differently; the side panel shows which criterion
drives the area you have selected.

**Measures from any point.** Click anywhere to get the straight-line distance
to the nearest clinic, MRT exit and bus stop. Place several points inside one
planning area and the panel reports the spread — which is the variation a
single representative point per area cannot capture.

## Screenshots

<!-- Add two or three:
     1. Map view with priority choropleth and a selected area
     2. Analysis view with weights, formula and the ranked table
     3. Probe points inside one planning area showing the distance spread
-->

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite), Leaflet via react-leaflet |
| Backend | ASP.NET Core Web API (.NET 10), EF Core, NetTopologySuite |
| Database | PostgreSQL 18 + PostGIS 3.6 |
| ETL | Python (psycopg2, openpyxl) |
| AI | Google Gemini API |

All data is public, from [data.gov.sg](https://data.gov.sg) — URA, MOH,
SingStat and LTA. Spatial data is WGS84 / EPSG:4326 throughout, with no
reprojection.

## Getting started

**Prerequisites:** PostgreSQL 18 with PostGIS, .NET 10 SDK, Node.js, Python 3.

```bash
# database
createdb geodss_db
psql geodss_db -c "CREATE EXTENSION postgis;"

# data
pip install psycopg2-binary openpyxl requests
python import_data.py --dry-run     # validate the source files first
python import_data.py               # create schema and import

# backend
cd backend && dotnet run            # http://localhost:5170

# frontend
cd frontend && npm install && npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` — it needs
`VITE_API_URL=http://localhost:5170`.

Bus stops are optional. Without `bus_stops.geojson` the import prints a note
and everything else loads, so a tester without an LTA DataMall key still gets a
working database.

Full instructions in [`docs/01-setup.md`](docs/01-setup.md).

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/planningareas/geojson` | Planning area polygons |
| `GET /api/healthcare/geojson?type=GP\|Polyclinic` | Facility points |
| `GET /api/transit/geojson` | MRT exits |
| `GET /api/analysis/area/{id}` | Accessibility metrics for one area |
| `GET /api/analysis/areas` | Metrics for all scored areas |
| `GET /api/analysis/point?lat=&lng=` | Accessibility at any location |
| `GET /api/analysis/priority-config` | Criteria, directions, default weights |
| `POST /api/analysis/priority-score` | Score and rank under given weights |
| `POST /api/analysis/sensitivity` | Rank stability and tornado effects |

## Documentation

| Doc | Contents |
|---|---|
| [01 · Setup](docs/01-setup.md) | Fresh clone to running app |
| [02 · Data sources](docs/02-data-sources.md) | Datasets, source quirks, what was rejected |
| [03 · Database schema](docs/03-database-schema.md) | Tables, columns, indexes |
| [04 · Architecture](docs/04-architecture.md) | Repository layout, what each file does |
| [05 · Methodology](docs/05-methodology.md) | Metrics, scoring, sensitivity, point queries |
| [06 · Decisions and gotchas](docs/06-decisions-and-gotchas.md) | Things that cost time once |
| [07 · Roadmap](docs/07-roadmap.md) | Milestones and what's outstanding |
| [08 · Limitations](docs/08-limitations.md) | Known weaknesses, recorded as encountered |

## Design principles

**The analysis is deterministic and auditable.** Nothing in the scoring path is
probabilistic. Weights, normalisation bounds and the formula are served by the
API and rendered from that response, so the model displayed is always the model
that ran. Where randomness is unavoidable — the Monte Carlo sensitivity
sampling — the seed is fixed and returned with the results, so any figure can
be reproduced exactly.

**The AI explains; it does not calculate.** The Gemini module receives
pre-computed score components, sensitivity results and rankings, and turns them
into prose. It performs no arithmetic and makes no decisions.

**Limitations are documented, not hidden.** Min-max normalisation is
outlier-sensitive; weights are set by judgement rather than formal elicitation;
weighted linear combination is fully compensatory; distances are straight-line
rather than travel-time. All known limitations are listed in
[`docs/08-limitations.md`](docs/08-limitations.md) with the reasoning behind
each.

## Status

Data pipeline, spatial analysis, decision support, sensitivity analysis and
point queries are complete. The AI explanation module is the remaining major
build.

Authentication is deliberately not implemented — the application holds no user
data and persists nothing between sessions, so there is no resource to protect.
See limitation 19.