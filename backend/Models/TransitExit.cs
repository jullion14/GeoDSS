using NetTopologySuite.Geometries;
public class TransitExit
{
    public int Id { get; set; }
    public string StationName { get; set; } = null!;
    public string? ExitCode { get; set; }
    public int? PlanningAreaId { get; set; }
    public Point Geom { get; set; } = null!;

    public PlanningArea? PlanningArea { get; set; }
}