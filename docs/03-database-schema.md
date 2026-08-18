# Database schema (`geodss_db`)

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

```
planning_areas
  id SERIAL PK, name TEXT UNIQUE, region TEXT,
  geom GEOMETRY(MultiPolygon, 4326)              [GiST]

population                                        (1:1 with planning_areas)
  planning_area_id INT PK -> planning_areas(id)
  year INT, total_population INT
  pct_below15, pct_15_24, pct_25_34, pct_35_44,
  pct_45_54, pct_55_64, pct_65andabove,
  pct_75andabove                          NUMERIC(4,1)
  hdb_total, hdb_1_2_room, hdb_3_room, hdb_4_room,
  hdb_5_room_exec, condo_other, landed,
  dwelling_others                         INT
  pct_hdb, pct_hdb_1_2_room               NUMERIC(4,1)

healthcare_facilities
  id SERIAL PK, name TEXT, facility_type TEXT ('GP'|'Polyclinic'),
  address TEXT, postal_code TEXT,
  planning_area_id INT FK, geom GEOMETRY(Point,4326)   [GiST + area idx]

transit_exits
  id SERIAL PK, station_name TEXT, exit_code TEXT,
  planning_area_id INT FK, geom GEOMETRY(Point,4326)   [GiST + area idx]

bus_stops
  id SERIAL PK, bus_stop_code TEXT UNIQUE, road_name TEXT,
  description TEXT, service_count INT,
  planning_area_id INT FK, geom GEOMETRY(Point,4326)   [GiST + area idx]

Search indexes (pg_trgm) — /api/search uses ILIKE '%x%', which is a
sequential scan without them:
  idx_bus_desc_trgm         bus_stops(description)          GIN
  idx_transit_station_trgm  transit_exits(station_name)     GIN
  idx_healthcare_name_trgm  healthcare_facilities(name)     GIN
  idx_bus_code              bus_stops(bus_stop_code)        btree

planning_area_id on all point tables is pre-computed at import via
ST_Contains, so per-area counts are a plain WHERE clause rather than a
spatial join on every query.

NOTE: pct_75andabove is more informative than 65+ for healthcare
accessibility (mobility constraints rise sharply). pct_hdb_1_2_room acts as
a socioeconomic proxy (Punggol 7.4% vs Tampines 2.9%).
```

Regenerate with `python import_data.py` — see [`01-setup.md`](01-setup.md).
