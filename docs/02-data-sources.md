# Data sources

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

All from data.gov.sg. All spatial data WGS84 / EPSG:4326 — no reprojection.

```
All from data.gov.sg. All spatial data WGS84 / EPSG:4326 — no reprojection.

  Master Plan 2019 Planning Area Boundary (No Sea)   55 polygons   [URA]
  Resident Population by Planning Area, Age Group,
    Sex and Type of Dwelling, 2025                                 [SingStat]
    (respopagesextod2025e.xlsx)
  GP Locations                                      237 points     [MOH]
  Polyclinics                                        26 points     [MOH]
  LTA MRT Station Exit                              613 points     [LTA]
  Bus stops (via LTA DataMall API)                 ~5,000 points   [LTA]

Population coverage: 49 of 55 planning areas have residents;
38 have populations large enough for reliable percentages.

--- Source quirks handled in the ETL -----------------------------
- "-" in the population xlsx means NIL OR NEGLIGIBLE (per the sheet's own
  footer), not suppression. Parsed as 0.
- Figures rounded to nearest 10, so components do not always sum to totals
  (Ang Mo Kio: bands sum 158,740 vs stated 158,720). Always use the
  published Total row, never a computed sum.
- Percentages set NULL below 1,000 residents — rounding plus "-" cells make
  them meaningless at that scale (seven areas produced 0% across all bands;
  Western Water Catchment summed to 105.2%).
- Trailing annotation rows after the data are detected and excluded.
- Polyclinics geojson uses the STRING "None" for missing fields, not null.
- Bus stops: (0,0) and null coordinates, duplicate stop codes, and
  out-of-Singapore coordinates all filtered.

--- Datasets evaluated and rejected ------------------------------
Master Plan 2019 Subzone Boundaries — DEFERRED, not rejected.
  Joins perfectly (332/332 against the xlsx) and would address the
  representative-point limitation, but changes the unit of analysis and
  would require reworking the scoring module. Viable future work.

MRT Station polygons — transit_exits already covers LRT; exits are the
  better accessibility unit than station centroids.

HDB Existing Building — inconsistent with all-dwelling-type population data.
  Distributing all residents across HDB-only building locations would
  systematically bias results toward HDB-dominant areas. This is now a
  METHODOLOGICAL rejection, not a time constraint.

Master Plan 2014 Rail Lines — 21.75 MB, no line-identity field, 2014
  vintage against current station data, 74% underground. Visual only.
```
