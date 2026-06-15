namespace EFRM.Core.Entities.Audit;

public class AuditLog
{
    public long AuditId { get; set; }
    public DateTime AuditTimestamp { get; set; } = DateTime.UtcNow;
    public int? PersonId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? IpAddress { get; set; }
    public Guid? SessionId { get; set; }
    public string Action { get; set; } = default!;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public bool IsSuccess { get; set; } = true;
    public string? FailureReason { get; set; }
    public Guid? CorrelationId { get; set; }
    public int? LocationId { get; set; }
}
