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
    public decimal? Pct75AndAbove { get; set; }      // new

    public int? HdbTotal { get; set; }
    public int? Hdb1_2Room { get; set; }
    public int? Hdb3Room { get; set; }
    public int? Hdb4Room { get; set; }
    public int? Hdb5RoomExec { get; set; }
    public int? CondoOther { get; set; }
    public int? Landed { get; set; }
    public int? DwellingOthers { get; set; }

    public decimal? PctHdb { get; set; }
    public decimal? PctHdb1_2Room { get; set; }

    public PlanningArea PlanningArea { get; set; } = null!;
}