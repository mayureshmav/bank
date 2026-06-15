namespace EFRM.Core.Entities.Fraud;

public class Alert
{
    public long AlertId { get; set; }
    public string AlertRef { get; set; } = default!;   // computed
    public string? TransactionRef { get; set; }
    public string Channel { get; set; } = default!;
    public string? CustomerId { get; set; }
    public string? AccountNumber { get; set; }
    public decimal? TransactionAmount { get; set; }
    public string TransactionCurrency { get; set; } = "INR";
    public decimal RiskScore { get; set; }
    public string RiskLevel { get; set; } = default!;  // computed: LOW/MEDIUM/HIGH/CRITICAL
    public AlertStatus Status { get; set; } = AlertStatus.OPEN;
    public string? FraudType { get; set; }
    public string? ReasonCodes { get; set; }    // JSON
    public string? ModelOutputs { get; set; }   // JSON
    public bool CustomerNotified { get; set; }
    public DateTime? CustomerNotifiedAt { get; set; }
    public int? AssignedToPersonId { get; set; }
    public DateTime? AssignedAt { get; set; }
    public int? LocationId { get; set; }
    public DateTime? SlaBreachAt { get; set; }
    public bool IsSlaBreach { get; set; }
    public int? EscalatedToPersonId { get; set; }
    public DateTime? EscalatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int? ClosedBy { get; set; }
    public string? ClosureNotes { get; set; }
    public DateTime TransactionTimestamp { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsDuplicate { get; set; }
    public long? DuplicateOfAlertId { get; set; }

    public ICollection<AlertNote> Notes { get; set; } = [];
    public ICollection<AlertReasonCode> ReasonCodesList { get; set; } = [];
}

public class AlertNote
{
    public int NoteId { get; set; }
    public long AlertId { get; set; }
    public string Note { get; set; } = default!;
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AlertReasonCode
{
    public int Id { get; set; }
    public long AlertId { get; set; }
    public string ReasonCode { get; set; } = default!;
    public string ReasonDesc { get; set; } = default!;
    public string? FeatureValue { get; set; }
    public decimal? ShapValue { get; set; }
    public int SortOrder { get; set; }
}

public class FraudCase
{
    public int CaseId { get; set; }
    public string CaseRef { get; set; } = default!;
    public string CaseTitle { get; set; } = default!;
    public string? CaseType { get; set; }
    public CaseStatus Status { get; set; } = CaseStatus.OPEN;
    public CasePriority Priority { get; set; } = CasePriority.MEDIUM;
    public decimal TotalExposureAmount { get; set; }
    public int? AssignedToPersonId { get; set; }
    public int? SupervisorId { get; set; }
    public int? LocationId { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? SlaBreachAt { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<CaseNote> Notes { get; set; } = [];
    public ICollection<CaseEvidence> Evidence { get; set; } = [];
}

public class CaseNote
{
    public int NoteId { get; set; }
    public int CaseId { get; set; }
    public string Note { get; set; } = default!;
    public string NoteType { get; set; } = "GENERAL";
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CaseEvidence
{
    public int EvidenceId { get; set; }
    public int CaseId { get; set; }
    public string EvidenceType { get; set; } = default!;
    public string? FileName { get; set; }
    public string? FilePath { get; set; }
    public string? FileHash { get; set; }
    public int UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class FraudRule
{
    public int RuleId { get; set; }
    public string RuleCode { get; set; } = default!;
    public string RuleName { get; set; } = default!;
    public string? RuleCategory { get; set; }
    public string? Channel { get; set; }
    public string RuleDefinition { get; set; } = default!; // JSON DSL
    public decimal ScoreWeight { get; set; } = 10;
    public string Action { get; set; } = "SCORE";
    public int Priority { get; set; } = 100;
    public bool IsActive { get; set; }
    public int Version { get; set; } = 1;
    public int? ParentRuleId { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
}

public class Watchlist
{
    public long WatchlistId { get; set; }
    public string EntityType { get; set; } = default!;
    public string EntityValue { get; set; } = default!;
    public string WatchlistType { get; set; } = default!;
    public string? Reason { get; set; }
    public string? Source { get; set; }
    public int? AddedBy { get; set; }
    public DateTime AddedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public enum AlertStatus
{
    OPEN, IN_INVESTIGATION, ESCALATED, PENDING_APPROVAL,
    CLOSED_TP, CLOSED_FP, CLOSED_INCONCLUSIVE
}

public enum CaseStatus { OPEN, INVESTIGATION, LEGAL_REFERRAL, CLOSED_TP, CLOSED_FP, ARCHIVED }
public enum CasePriority { LOW, MEDIUM, HIGH, CRITICAL }
