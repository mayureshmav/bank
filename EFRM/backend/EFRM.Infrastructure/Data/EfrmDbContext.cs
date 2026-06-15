using EFRM.Core.Entities.Identity;
using EFRM.Core.Entities.Fraud;
using EFRM.Core.Entities.Approval;
using Microsoft.EntityFrameworkCore;

namespace EFRM.Infrastructure.Data;

public class EfrmDbContext(DbContextOptions<EfrmDbContext> options) : DbContext(options)
{
    // Identity
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<PersonPositionLocation> PersonPositionLocations => Set<PersonPositionLocation>();
    public DbSet<Screen> Screens => Set<Screen>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<PositionScreenPermission> PositionScreenPermissions => Set<PositionScreenPermission>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    // Fraud
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<AlertNote> AlertNotes => Set<AlertNote>();
    public DbSet<AlertReasonCode> AlertReasonCodes => Set<AlertReasonCode>();
    public DbSet<FraudCase> FraudCases => Set<FraudCase>();
    public DbSet<CaseNote> CaseNotes => Set<CaseNote>();
    public DbSet<CaseEvidence> CaseEvidence => Set<CaseEvidence>();
    public DbSet<FraudRule> FraudRules => Set<FraudRule>();
    public DbSet<Watchlist> Watchlists => Set<Watchlist>();

    // Approval
    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();
    public DbSet<ApprovalStage> ApprovalStages => Set<ApprovalStage>();
    public DbSet<ApprovalMatrix> ApprovalMatrices => Set<ApprovalMatrix>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();
    public DbSet<ApprovalDecision> ApprovalDecisions => Set<ApprovalDecision>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Schema mapping
        mb.Entity<Location>().ToTable("Location", "identity");
        mb.Entity<Position>().ToTable("Position", "identity");
        mb.Entity<Person>().ToTable("Person", "identity");
        mb.Entity<PersonPositionLocation>().ToTable("PersonPositionLocation", "identity");
        mb.Entity<Screen>().ToTable("Screen", "identity");
        mb.Entity<Permission>().ToTable("Permission", "identity");
        mb.Entity<PositionScreenPermission>().ToTable("PositionScreenPermission", "identity");
        mb.Entity<UserSession>().ToTable("UserSession", "identity");

        mb.Entity<Alert>().ToTable("Alert", "fraud");
        mb.Entity<AlertNote>().ToTable("AlertNote", "fraud");
        mb.Entity<AlertReasonCode>().ToTable("AlertReasonCode", "fraud");
        mb.Entity<FraudCase>().ToTable("FraudCase", "fraud");
        mb.Entity<CaseNote>().ToTable("CaseNote", "fraud");
        mb.Entity<CaseEvidence>().ToTable("CaseEvidence", "fraud");
        mb.Entity<FraudRule>().ToTable("FraudRule", "fraud");
        mb.Entity<Watchlist>().ToTable("Watchlist", "fraud");

        mb.Entity<DocumentType>().ToTable("DocumentType", "approval");
        mb.Entity<ApprovalStage>().ToTable("ApprovalStage", "approval");
        mb.Entity<ApprovalMatrix>().ToTable("ApprovalMatrix", "approval");
        mb.Entity<ApprovalRequest>().ToTable("ApprovalRequest", "approval");
        mb.Entity<ApprovalDecision>().ToTable("ApprovalDecision", "approval");

        // Computed columns
        mb.Entity<Alert>().Property(a => a.AlertRef).ValueGeneratedOnAddOrUpdate();
        mb.Entity<FraudCase>().Property(c => c.CaseRef).ValueGeneratedOnAddOrUpdate();
        mb.Entity<ApprovalRequest>().Property(r => r.RequestRef).ValueGeneratedOnAddOrUpdate();

        // Alert – soft enums stored as string
        mb.Entity<Alert>().Property(a => a.Status).HasConversion<string>();
        mb.Entity<FraudCase>().Property(c => c.Status).HasConversion<string>();
        mb.Entity<FraudCase>().Property(c => c.Priority).HasConversion<string>();
        mb.Entity<ApprovalRequest>().Property(r => r.Status).HasConversion<string>();
        mb.Entity<Location>().Property(l => l.LocationType).HasConversion<string>();
        mb.Entity<Position>().Property(p => p.PositionType).HasConversion<string>();

        // Indexes
        mb.Entity<Alert>().HasIndex(a => a.Channel);
        mb.Entity<Alert>().HasIndex(a => a.Status);
        mb.Entity<Alert>().HasIndex(a => a.RiskScore);
        mb.Entity<Alert>().HasIndex(a => a.AssignedToPersonId);
        mb.Entity<Alert>().HasIndex(a => a.TransactionTimestamp);
        mb.Entity<FraudRule>().HasIndex(r => r.IsActive);
        mb.Entity<FraudRule>().HasIndex(r => r.Channel);
        mb.Entity<Watchlist>().HasIndex(w => new { w.EntityType, w.EntityValue });
        mb.Entity<Person>().HasIndex(p => p.LdapUserName);
        mb.Entity<ApprovalRequest>().HasIndex(r => r.Status);

        // PPL active constraint navigation
        mb.Entity<PersonPositionLocation>()
            .HasIndex(p => new { p.PersonId, p.PositionId, p.LocationId, p.EffectiveFrom })
            .IsUnique();
    }
}
