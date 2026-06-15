namespace EFRM.Core.DTOs.Alert;

public record AlertListRequest(
    int Page = 1,
    int PageSize = 25,
    string? Channel = null,
    string? RiskLevel = null,
    string? Status = null,
    string? AssignedToMe = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? Search = null
);

public record AlertListResponse(
    long AlertId,
    string AlertRef,
    string Channel,
    string? CustomerId,
    decimal? TransactionAmount,
    decimal RiskScore,
    string RiskLevel,
    string Status,
    string? FraudType,
    DateTime TransactionTimestamp,
    DateTime CreatedAt,
    string? AssignedTo,
    bool IsSlaBreach,
    DateTime? SlaBreachAt,
    bool CustomerNotified
);

public record AlertDetailResponse(
    long AlertId,
    string AlertRef,
    string? TransactionRef,
    string Channel,
    string? CustomerId,
    string? AccountNumber,
    decimal? TransactionAmount,
    string TransactionCurrency,
    decimal RiskScore,
    string RiskLevel,
    string Status,
    string? FraudType,
    ModelOutputDto? ModelOutputs,
    IEnumerable<ReasonCodeDto> ReasonCodes,
    DateTime TransactionTimestamp,
    DateTime CreatedAt,
    string? AssignedTo,
    int? AssignedToPersonId,
    bool IsSlaBreach,
    DateTime? SlaBreachAt,
    bool CustomerNotified,
    IEnumerable<AlertNoteDto> Notes
);

public record ModelOutputDto(
    decimal RuleScore,
    decimal BehavioralScore,
    decimal MlScore,
    decimal CompositeScore,
    string? ModelVersion
);

public record ReasonCodeDto(
    string ReasonCode,
    string ReasonDesc,
    string? FeatureValue,
    decimal? ShapValue
);

public record AlertNoteDto(
    int NoteId,
    string Note,
    string CreatedByName,
    DateTime CreatedAt
);

public record AssignAlertRequest(int PersonId);
public record CloseAlertRequest(string Status, string Notes);
public record BulkAlertActionRequest(IEnumerable<long> AlertIds, string Action, int? AssignToPersonId = null, string? Notes = null);

public record PagedResponse<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);
