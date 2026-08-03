"""
GeoDSS data import script
Loads planning areas, population/age data, healthcare facilities, and MRT exits
into a PostGIS database.

Requirements:
    pip install psycopg2-binary

Usage:
    1. Edit the DB_CONFIG below with your local PostgreSQL credentials.
    2. Place this script in the same folder as your /data directory
       (or edit DATA_DIR below).
    3. Run: python import_data.py
"""

import json
import csv
import psycopg2

# ---------------------------------------------------------------------------
# CONFIG — edit these before running
# ---------------------------------------------------------------------------
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "geodss_db",
    "user": "postgres",
    "password": "<insert password here>",   # <-- change this
}

DATA_DIR = "data"  # folder containing the geojson/csv files

PLANNING_AREA_FILE = f"{DATA_DIR}/MasterPlan2019PlanningAreaBoundaryNoSea.geojson"
POPULATION_FILE = f"{DATA_DIR}/hdb_population_2018.csv"
GP_FILE = f"{DATA_DIR}/GP_Locations.geojson"
POLYCLINIC_FILE = f"{DATA_DIR}/Polyclinics.geojson"
MRT_FILE = f"{DATA_DIR}/LTAMRTStationExitGEOJSON.geojson"

# Manual name fixes: planning area name (title case) -> CSV town_estate name
# Only needed where names don't match automatically after .title()
NAME_OVERRIDES = {
    # Kallang planning area already matches "Kallang" after your CSV edit
}

# ---------------------------------------------------------------------------
# SCHEMA
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS planning_areas (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    region TEXT,
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_planning_areas_geom ON planning_areas USING GIST (geom);

CREATE TABLE IF NOT EXISTS population (
    planning_area_id INT PRIMARY KEY REFERENCES planning_areas(id),
    year INT NOT NULL DEFAULT 2018,
    total_population INT,
    pct_below15 NUMERIC(4,1),
    pct_15_24 NUMERIC(4,1),
    pct_25_34 NUMERIC(4,1),
    pct_35_44 NUMERIC(4,1),
    pct_45_54 NUMERIC(4,1),
    pct_55_64 NUMERIC(4,1),
    pct_65andabove NUMERIC(4,1)
);

CREATE TABLE IF NOT EXISTS healthcare_facilities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    facility_type TEXT NOT NULL CHECK (facility_type IN ('GP', 'Polyclinic')),
    address TEXT,
    postal_code TEXT,
    planning_area_id INT REFERENCES planning_areas(id),
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_healthcare_geom ON healthcare_facilities USING GIST (geom);

CREATE TABLE IF NOT EXISTS transit_exits (
    id SERIAL PRIMARY KEY,
    station_name TEXT NOT NULL,
    exit_code TEXT,
    planning_area_id INT REFERENCES planning_areas(id),
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transit_geom ON transit_exits USING GIST (geom);
"""


def connect():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    return conn


def create_schema(cur):
    print("Creating schema...")
    cur.execute(SCHEMA_SQL)


def import_planning_areas(cur):
    print("Importing planning areas...")
    with open(PLANNING_AREA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    name_to_id = {}
    for feat in data["features"]:
        props = feat["properties"]
        name = props["PLN_AREA_N"].title()
        region = props.get("REGION_N", "").title()
        geom_json = json.dumps(feat["geometry"])

        cur.execute(
            """
            INSERT INTO planning_areas (name, region, geom)
            VALUES (%s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
            ON CONFLICT (name) DO UPDATE SET geom = EXCLUDED.geom
            RETURNING id
            """,
            (name, region, geom_json),
        )
        area_id = cur.fetchone()[0]
        name_to_id[name] = area_id

    print(f"  Inserted {len(name_to_id)} planning areas.")
    return name_to_id


def import_population(cur, name_to_id):
    print("Importing population data...")
    inserted, skipped = 0, []

    with open(POPULATION_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            town = row["town_estate"].strip()
            area_id = name_to_id.get(town) or name_to_id.get(NAME_OVERRIDES.get(town, ""))

            if area_id is None:
                skipped.append(town)
                continue

            def to_float(v):
                return float(v) if v not in ("", None) else None

            cur.execute(
                """
                INSERT INTO population
                    (planning_area_id, year, total_population,
                     pct_below15, pct_15_24, pct_25_34, pct_35_44,
                     pct_45_54, pct_55_64, pct_65andabove)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (planning_area_id) DO UPDATE SET
                    total_population = EXCLUDED.total_population
                """,
                (
                    area_id,
                    int(row["shs_year"]),
                    int(row["population"]) if row["population"] else None,
                    to_float(row["pct_below15"]),
                    to_float(row["pct_15_24"]),
                    to_float(row["pct_25_34"]),
                    to_float(row["pct_35_44"]),
                    to_float(row["pct_45_54"]),
                    to_float(row["pct_55_64"]),
                    to_float(row["pct_65andabove"]),
                ),
            )
            inserted += 1

    print(f"  Inserted {inserted} population rows.")
    if skipped:
        print(f"  WARNING: could not match these towns to a planning area: {skipped}")


def import_points(cur, filepath, facility_type_or_none, table, extra_cols_fn):
    """
    Generic point importer for healthcare facilities / transit exits.
    extra_cols_fn(props) -> dict of column_name: value (excluding geom, planning_area_id)
    """
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for feat in data["features"]:
        props = feat["properties"]
        geom_json = json.dumps(feat["geometry"])
        cols = extra_cols_fn(props)

        col_names = list(cols.keys())
        placeholders = ", ".join(["%s"] * len(col_names))
        col_sql = ", ".join(col_names)

        cur.execute(
            f"""
            INSERT INTO {table} ({col_sql}, geom)
            VALUES ({placeholders}, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            """,
            (*cols.values(), geom_json),
        )
        count += 1

    return count


def import_healthcare(cur):
    print("Importing healthcare facilities...")

    gp_count = import_points(
        cur,
        GP_FILE,
        "GP",
        "healthcare_facilities",
        lambda p: {
            "name": p.get("NAME"),
            "facility_type": "GP",
            "address": p.get("ADDRESS"),
            "postal_code": p.get("POSTALCODE"),
        },
    )

    def polyclinic_cols(p):
        address_parts = [
            p.get("ADDRESSBLOCKHOUSENUMBER"),
            p.get("ADDRESSSTREETNAME"),
        ]
        address = " ".join(x for x in address_parts if x)
        return {
            "name": p.get("NAME"),
            "facility_type": "Polyclinic",
            "address": address,
            "postal_code": p.get("ADDRESSPOSTALCODE"),
        }

    poly_count = import_points(
        cur, POLYCLINIC_FILE, "Polyclinic", "healthcare_facilities", polyclinic_cols
    )

    print(f"  Inserted {gp_count} GPs + {poly_count} polyclinics.")


def import_transit(cur):
    print("Importing MRT station exits...")
    count = import_points(
        cur,
        MRT_FILE,
        None,
        "transit_exits",
        lambda p: {
            "station_name": p.get("STATION_NA"),
            "exit_code": p.get("EXIT_CODE"),
        },
    )
    print(f"  Inserted {count} MRT exits.")


def backfill_planning_area_ids(cur):
    """Point-in-polygon: assign planning_area_id to each facility/exit."""
    print("Backfilling planning_area_id via spatial join...")
    for table in ("healthcare_facilities", "transit_exits"):
        cur.execute(
            f"""
            UPDATE {table} t
            SET planning_area_id = pa.id
            FROM planning_areas pa
            WHERE ST_Contains(pa.geom, t.geom)
              AND t.planning_area_id IS NULL
            """
        )
        print(f"  {table}: {cur.rowcount} rows matched to a planning area.")


def main():
    conn = connect()
    try:
        with conn.cursor() as cur:
            create_schema(cur)
            name_to_id = import_planning_areas(cur)
            import_population(cur, name_to_id)
            import_healthcare(cur)
            import_transit(cur)
            backfill_planning_area_ids(cur)
        conn.commit()
        print("\nDone. All data committed.")
    except Exception:
        conn.rollback()
        print("\nError occurred, transaction rolled back.")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()