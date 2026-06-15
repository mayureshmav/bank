namespace EFRM.Core.Entities.Approval;

public class DocumentType
{
    public int DocTypeId { get; set; }
    public string DocTypeCode { get; set; } = default!;
    public string DocTypeName { get; set; } = default!;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public decimal? MaxAmountLimit { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<ApprovalStage> Stages { get; set; } = [];
}

public class ApprovalStage
{
    public int StageId { get; set; }
    public int DocTypeId { get; set; }
    public DocumentType DocType { get; set; } = default!;
    public int StageNumber { get; set; }
    public string StageName { get; set; } = default!;
    public int ApproverPositionId { get; set; }
    public bool RequiresLocationMatch { get; set; }
    public bool IsMandatory { get; set; } = true;
    public int TimeoutHours { get; set; } = 24;
    public string OnTimeoutAction { get; set; } = "ESCALATE";
    public int? EscalateToStageId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ApprovalMatrix
{
    public int MatrixId { get; set; }
    public int DocTypeId { get; set; }
    public DocumentType DocType { get; set; } = default!;
    public int PositionId { get; set; }
    public EFRM.Core.Entities.Identity.Position Position { get; set; } = default!;
    public string? LocationTypeFilter { get; set; }
    public decimal? AmountFrom { get; set; }
    public decimal? AmountTo { get; set; }
    public bool CanApprove { get; set; } = true;
    public decimal? MaxApprovalAmount { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ApprovalRequest
{
    public int RequestId { get; set; }
    public string RequestRef { get; set; } = default!;
    public int DocTypeId { get; set; }
    public DocumentType DocType { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public string EntityId { get; set; } = default!;
    public string? EntitySnapshot { get; set; }
    public decimal? Amount { get; set; }
    public int RequestedBy { get; set; }
    public DateTime RequestedAt { get; set; }
    public int LocationId { get; set; }
    public int? CurrentStageId { get; set; }
    public ApprovalStage? CurrentStage { get; set; }
    public ApprovalRequestStatus Status { get; set; } = ApprovalRequestStatus.PENDING;
    public DateTime? FinalizedAt { get; set; }
    public int? FinalizedBy { get; set; }
    public string? Comments { get; set; }

    public ICollection<ApprovalDecision> Decisions { get; set; } = [];
}

public class ApprovalDecision
{
    public int DecisionId { get; set; }
    public int RequestId { get; set; }
    public int StageId { get; set; }
    public int ApprovedBy { get; set; }
    public string Decision { get; set; } = default!;    // APPROVED, REJECTED, RETURNED
    public string? Comments { get; set; }
    public DateTime DecidedAt { get; set; }
    public bool IsAutoDecision { get; set; }
}

public enum ApprovalRequestStatus { PENDING, IN_REVIEW, APPROVED, REJECTED, CANCELLED, EXPIRED }
