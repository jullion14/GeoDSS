public class Population
{
    public int PlanningAreaId { get; set; }
    public int Year { get; set; }
    public int? TotalPopulation { get; set; }
    public decimal? PctBelow15 { get; set; }
    public decimal? Pct15_24 { get; set; }
    public decimal? Pct25_34 { get; set; }
    public decimal? Pct35_44 { get; set; }
    public decimal? Pct45_54 { get; set; }
    public decimal? Pct55_64 { get; set; }
    public decimal? Pct65AndAbove { get; set; }

    public PlanningArea PlanningArea { get; set; } = null!;
}