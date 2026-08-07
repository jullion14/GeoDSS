using NetTopologySuite.Geometries;

public class BusStop
{
    public int Id { get; set; }
    public string BusStopCode { get; set; } = null!;
    public string? RoadName { get; set; }
    public string? Description { get; set; }
    public int? ServiceCount { get; set; }
    public int? PlanningAreaId { get; set; }
    public Point Geom { get; set; } = null!;

    public PlanningArea? PlanningArea { get; set; }
}