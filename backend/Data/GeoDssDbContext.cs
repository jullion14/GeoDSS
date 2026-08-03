using GeoDSS.Api.Models;
using Microsoft.EntityFrameworkCore;

public class GeoDssDbContext : DbContext
{
    public GeoDssDbContext(DbContextOptions<GeoDssDbContext> options) : base(options) { }

    public DbSet<PlanningArea> PlanningAreas => Set<PlanningArea>();
    public DbSet<Population> Populations => Set<Population>();
    public DbSet<HealthcareFacility> HealthcareFacilities => Set<HealthcareFacility>();
    public DbSet<TransitExit> TransitExits => Set<TransitExit>();
    public DbSet<AccessibilityMetrics> AccessibilityMetrics => Set<AccessibilityMetrics>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PlanningArea>().ToTable("planning_areas");
        modelBuilder.Entity<PlanningArea>().Property(p => p.Id).HasColumnName("id");
        modelBuilder.Entity<PlanningArea>().Property(p => p.Name).HasColumnName("name");
        modelBuilder.Entity<PlanningArea>().Property(p => p.Region).HasColumnName("region");
        modelBuilder.Entity<PlanningArea>().Property(p => p.Geom).HasColumnName("geom");

        modelBuilder.Entity<Population>().ToTable("population");
        modelBuilder.Entity<Population>().HasKey(p => p.PlanningAreaId);
        modelBuilder.Entity<Population>().Property(p => p.PlanningAreaId).HasColumnName("planning_area_id");
        modelBuilder.Entity<Population>().Property(p => p.Year).HasColumnName("year");
        modelBuilder.Entity<Population>().Property(p => p.TotalPopulation).HasColumnName("total_population");
        modelBuilder.Entity<Population>().Property(p => p.PctBelow15).HasColumnName("pct_below15");
        modelBuilder.Entity<Population>().Property(p => p.Pct15_24).HasColumnName("pct_15_24");
        modelBuilder.Entity<Population>().Property(p => p.Pct25_34).HasColumnName("pct_25_34");
        modelBuilder.Entity<Population>().Property(p => p.Pct35_44).HasColumnName("pct_35_44");
        modelBuilder.Entity<Population>().Property(p => p.Pct45_54).HasColumnName("pct_45_54");
        modelBuilder.Entity<Population>().Property(p => p.Pct55_64).HasColumnName("pct_55_64");
        modelBuilder.Entity<Population>().Property(p => p.Pct65AndAbove).HasColumnName("pct_65andabove");

        modelBuilder.Entity<HealthcareFacility>().ToTable("healthcare_facilities");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.Id).HasColumnName("id");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.Name).HasColumnName("name");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.FacilityType).HasColumnName("facility_type");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.Address).HasColumnName("address");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.PostalCode).HasColumnName("postal_code");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.PlanningAreaId).HasColumnName("planning_area_id");
        modelBuilder.Entity<HealthcareFacility>().Property(p => p.Geom).HasColumnName("geom");

        modelBuilder.Entity<TransitExit>().ToTable("transit_exits");
        modelBuilder.Entity<TransitExit>().Property(p => p.Id).HasColumnName("id");
        modelBuilder.Entity<TransitExit>().Property(p => p.StationName).HasColumnName("station_name");
        modelBuilder.Entity<TransitExit>().Property(p => p.ExitCode).HasColumnName("exit_code");
        modelBuilder.Entity<TransitExit>().Property(p => p.PlanningAreaId).HasColumnName("planning_area_id");
        modelBuilder.Entity<TransitExit>().Property(p => p.Geom).HasColumnName("geom");

        modelBuilder.Entity<AccessibilityMetrics>().HasNoKey().ToView(null);
    }
}