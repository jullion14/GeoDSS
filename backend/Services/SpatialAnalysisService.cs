using GeoDSS.Api.Models;
using Microsoft.EntityFrameworkCore;

public class SpatialAnalysisService
{
    private readonly GeoDssDbContext _db;
    public SpatialAnalysisService(GeoDssDbContext db) => _db = db;

    private const string MetricsSql = @"
WITH a AS (
    SELECT pa.id, pa.name, pa.region, pa.geom,
           ST_PointOnSurface(pa.geom) AS rep_point
    FROM planning_areas pa
    {0}
)
SELECT
    a.id                                        AS ""PlanningAreaId"",
    a.name                                      AS ""Name"",
    a.region                                    AS ""Region"",
    p.total_population                          AS ""Population"",
    ST_Area(a.geom::geography) / 1000000.0       AS ""AreaSqKm"",
    CASE WHEN p.total_population IS NOT NULL
         THEN p.total_population / NULLIF(ST_Area(a.geom::geography) / 1000000.0, 0)
    END                                          AS ""PopulationDensity"",

    gp.cnt                                       AS ""GpCount"",
    pc.cnt                                       AS ""PolyclinicCount"",
    (gp.cnt + pc.cnt)                            AS ""TotalFacilities"",
    CASE WHEN p.total_population > 0
         THEN (gp.cnt + pc.cnt) * 10000.0 / p.total_population
    END                                          AS ""FacilitiesPer10k"",

    nf.dist                                      AS ""NearestFacilityMeters"",
    nf.name                                      AS ""NearestFacilityName"",
    nf.facility_type                             AS ""NearestFacilityType"",

    mx.cnt                                       AS ""MrtExitCount"",
    nm.dist                                      AS ""NearestMrtMeters"",
    nm.station_name                              AS ""NearestMrtStation""
FROM a
LEFT JOIN population p ON p.planning_area_id = a.id

CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt FROM healthcare_facilities h
    WHERE h.planning_area_id = a.id AND h.facility_type = 'GP'
) gp
CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt FROM healthcare_facilities h
    WHERE h.planning_area_id = a.id AND h.facility_type = 'Polyclinic'
) pc
CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt FROM transit_exits t
    WHERE t.planning_area_id = a.id
) mx

LEFT JOIN LATERAL (
    SELECT h.name, h.facility_type,
           ST_Distance(a.rep_point::geography, h.geom::geography) AS dist
    FROM healthcare_facilities h
    ORDER BY a.rep_point <-> h.geom
    LIMIT 1
) nf ON TRUE

LEFT JOIN LATERAL (
    SELECT t.station_name,
           ST_Distance(a.rep_point::geography, t.geom::geography) AS dist
    FROM transit_exits t
    ORDER BY a.rep_point <-> t.geom
    LIMIT 1
) nm ON TRUE
";

    public async Task<AccessibilityMetrics?> GetForAreaAsync(int planningAreaId)
    {
        var sql = string.Format(MetricsSql, "WHERE pa.id = {0}");
        return await _db.AccessibilityMetrics
            .FromSqlRaw(sql, planningAreaId)
            .AsNoTracking()
            .FirstOrDefaultAsync();
    }

    public async Task<List<AccessibilityMetrics>> GetAllAsync()
    {
        // Only areas with population data (excludes industrial/reserve areas)
        var sql = string.Format(MetricsSql,
            "WHERE EXISTS (SELECT 1 FROM population pp WHERE pp.planning_area_id = pa.id)");
        return await _db.AccessibilityMetrics
            .FromSqlRaw(sql)
            .AsNoTracking()
            .ToListAsync();
    }
}