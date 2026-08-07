# Setup (fresh clone / tester)

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

```
  CREATE DATABASE geodss_db;
  \c geodss_db
  CREATE EXTENSION postgis;

  pip install psycopg2-binary openpyxl requests
  python import_data.py --dry-run     # validate files, no DB changes
  python import_data.py               # create schema + import everything

import_data.py DROPS AND RECREATES all tables every run. All data derives
from the source files, so this is idempotent — re-running gives identical
counts. Bus stops are OPTIONAL: absent bus_stops.geojson prints a note and
everything else still imports, so a tester without an LTA key gets a working
database.

fetch_bus_data.py regenerates bus_stops.geojson; needs LTA_ACCOUNT_KEY (env
var or --key). Committed for provenance — it documents which endpoints the
GeoJSON came from and how ServiceCount was derived.
```

## Running the app

```
cd backend  && dotnet run          # http://localhost:5170
cd frontend && npm install && npm run dev
```

`frontend/.env` needs `VITE_API_URL=http://localhost:5170` (copy `.env.example`).
Backend secrets go in `dotnet user-secrets`; `LTA_ACCOUNT_KEY` is an env var.
