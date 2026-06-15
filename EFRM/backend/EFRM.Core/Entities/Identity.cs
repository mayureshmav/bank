namespace EFRM.Core.Entities.Identity;

// ─── Person-Position-Location Aggregate ─────────────────────────────────────

public class Location
{
    public int LocationId { get; set; }
    public string LocationCode { get; set; } = default!;
    public string LocationName { get; set; } = default!;
    public LocationType LocationType { get; set; }
    public int? ParentLocationId { get; set; }
    public Location? Parent { get; set; }
    public ICollection<Location> Children { get; set; } = [];
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Position
{
    public int PositionId { get; set; }
    public string PositionCode { get; set; } = default!;
    public string PositionName { get; set; } = default!;
    public int PositionLevel { get; set; }
    public PositionType PositionType { get; set; }
    public string? Department { get; set; }
    public bool CanApprove { get; set; }
    public decimal? MaxApprovalAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<PositionScreenPermission> ScreenPermissions { get; set; } = [];
}

public class Person
{
    public int PersonId { get; set; }
    public string EmployeeCode { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string? Mobile { get; set; }
    public string? LdapUserName { get; set; }
    public string? PasswordHash { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsMfaEnabled { get; set; } = true;
    public short FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public string PreferredLanguage { get; set; } = "en";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<PersonPositionLocation> Assignments { get; set; } = [];
}

public class PersonPositionLocation
{
    public int AssignmentId { get; set; }
    public int PersonId { get; set; }
    public Person Person { get; set; } = default!;
    public int PositionId { get; set; }
    public Position Position { get; set; } = default!;
    public int LocationId { get; set; }
    public Location Location { get; set; } = default!;
    public bool IsPrimary { get; set; } = true;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsCurrentlyActive => EffectiveTo == null || EffectiveTo >= DateOnly.FromDateTime(DateTime.UtcNow);
}

public class Screen
{
    public int ScreenId { get; set; }
    public string ScreenCode { get; set; } = default!;
    public string ScreenName { get; set; } = default!;
    public string ModuleName { get; set; } = default!;
    public string? RouteUrl { get; set; }
    public int? ParentScreenId { get; set; }
    public int SortOrder { get; set; }
    public string? IconName { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Permission
{
    public int PermissionId { get; set; }
    public string PermissionCode { get; set; } = default!;
    public string PermissionName { get; set; } = default!;
    public bool IsDataWrite { get; set; }
}

public class PositionScreenPermission
{
    public int Id { get; set; }
    public int PositionId { get; set; }
    public Position Position { get; set; } = default!;
    public int ScreenId { get; set; }
    public Screen Screen { get; set; } = default!;
    public int PermissionId { get; set; }
    public Permission Permission { get; set; } = default!;
    public bool IsGranted { get; set; } = true;
}

public class UserSession
{
    public Guid SessionId { get; set; }
    public int PersonId { get; set; }
    public Person Person { get; set; } = default!;
    public string? DeviceFingerprint { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public bool IsRevoked { get; set; }
}

public enum LocationType { HEAD_OFFICE, REGION, ZONE, DISTRICT, BRANCH }
public enum PositionType { INVESTIGATOR, ANALYST, SUPERVISOR, MANAGER, COMPLIANCE, ADMIN, IT_ADMIN, ML_ENGINEER, API_SYSTEM }
