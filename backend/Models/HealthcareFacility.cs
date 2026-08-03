using NetTopologySuite.Geometries;
public class HealthcareFacility
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string FacilityType { get; set; } = null!;  // "GP" or "Polyclinic"
    public string? Address { get; set; }
    public string? PostalCode { get; set; }
    public int? PlanningAreaId { get; set; }
    public Point Geom { get; set; } = null!;

    public PlanningArea? PlanningArea { get; set; }
}