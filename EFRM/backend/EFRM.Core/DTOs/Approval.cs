namespace EFRM.Core.DTOs.Approval;

public record ApprovalRequestDto(
    int RequestId,
    string RequestRef,
    string DocTypeName,
    string EntityType,
    string EntityId,
    decimal? Amount,
    string RequestedByName,
    DateTime RequestedAt,
    string CurrentStageName,
    string Status,
    int StageNumber,
    int TotalStages
);

public record ApprovalDetailDto(
    int RequestId,
    string RequestRef,
    string DocTypeCode,
    string DocTypeName,
    string EntityType,
    string EntityId,
    string? EntitySnapshot,
    decimal? Amount,
    string RequestedByName,
    DateTime RequestedAt,
    string Status,
    IEnumerable<StageDecisionDto> Decisions,
    string? CurrentStageName,
    bool CanApprove,
    bool CanReject
);

public record StageDecisionDto(
    int StageNumber,
    string StageName,
    string? Decision,
    string? DecidedByName,
    DateTime? DecidedAt,
    string? Comments,
    bool IsCurrentStage
);

public record SubmitApprovalRequest(
    string DocTypeCode,
    string EntityType,
    string EntityId,
    string? EntitySnapshot,
    decimal? Amount,
    string? Comments
);

public record ApprovalDecisionRequest(string Decision, string? Comments);

public record ApprovalMatrixEntryDto(
    int MatrixId,
    string DocTypeName,
    string PositionName,
    string? LocationTypeFilter,
    decimal? AmountFrom,
    decimal? AmountTo,
    decimal? MaxApprovalAmount,
    bool IsActive
);

public record UpsertApprovalMatrixRequest(
    int DocTypeId,
    int PositionId,
    string? LocationTypeFilter,
    decimal? AmountFrom,
    decimal? AmountTo,
    decimal? MaxApprovalAmount
);
