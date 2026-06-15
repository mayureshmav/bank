using EFRM.Core.Entities.Identity;
using EFRM.Core.Entities.Fraud;
using EFRM.Core.Entities.Approval;
using EFRM.Core.Entities.Audit;
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

    // Audit
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

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

        // Computed columns (SQL Server uses DB-computed expressions; SQLite needs a non-null default)
        mb.Entity<Alert>().Property(a => a.AlertRef).ValueGeneratedOnAddOrUpdate();
        mb.Entity<FraudCase>().Property(c => c.CaseRef).ValueGeneratedOnAddOrUpdate();
        mb.Entity<ApprovalRequest>().Property(r => r.RequestRef).ValueGeneratedOnAddOrUpdate();

        if (Database.ProviderName?.Contains("Sqlite") == true)
        {
            mb.Entity<Alert>().Property(a => a.AlertRef).HasDefaultValue("");
            mb.Entity<FraudCase>().Property(c => c.CaseRef).HasDefaultValue("");
            mb.Entity<ApprovalRequest>().Property(r => r.RequestRef).HasDefaultValue("");
        }

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

        // Explicit primary keys for non-convention property names
        mb.Entity<Location>().HasKey(e => e.LocationId);
        mb.Entity<Position>().HasKey(e => e.PositionId);
        mb.Entity<Person>().HasKey(e => e.PersonId);
        mb.Entity<PersonPositionLocation>().HasKey(e => e.AssignmentId);
        mb.Entity<Screen>().HasKey(e => e.ScreenId);
        mb.Entity<Permission>().HasKey(e => e.PermissionId);
        mb.Entity<PositionScreenPermission>().HasKey(e => new { e.PositionId, e.ScreenId, e.PermissionId });
        mb.Entity<UserSession>().HasKey(e => e.SessionId);

        mb.Entity<Alert>().HasKey(e => e.AlertId);
        mb.Entity<AlertNote>().HasKey(e => e.NoteId);
        mb.Entity<FraudCase>().HasKey(e => e.CaseId);
        mb.Entity<CaseNote>().HasKey(e => e.NoteId);
        mb.Entity<CaseEvidence>().HasKey(e => e.EvidenceId);
        mb.Entity<FraudRule>().HasKey(e => e.RuleId);
        mb.Entity<Watchlist>().HasKey(e => e.WatchlistId);

        mb.Entity<DocumentType>().HasKey(e => e.DocTypeId);
        mb.Entity<ApprovalStage>().HasKey(e => e.StageId);
        mb.Entity<ApprovalMatrix>().HasKey(e => e.MatrixId);
        mb.Entity<ApprovalRequest>().HasKey(e => e.RequestId);
        mb.Entity<ApprovalDecision>().HasKey(e => e.DecisionId);

        // Audit log is in a separate schema not mapped by default — add if needed
        mb.Entity<EFRM.Core.Entities.Audit.AuditLog>().ToTable("AuditLog", "audit").HasKey(e => e.AuditId);

        // PPL active constraint navigation
        mb.Entity<PersonPositionLocation>()
            .HasIndex(p => new { p.PersonId, p.PositionId, p.LocationId, p.EffectiveFrom })
            .IsUnique();
    }
}
