namespace EFRM.Core.DTOs.Admin;

public record PersonDto(
    int PersonId,
    string EmployeeCode,
    string FullName,
    string Email,
    string? Mobile,
    int? PrimaryPositionId,
    string? PrimaryPosition,
    string? PrimaryPositionCode,
    int? PrimaryLocationId,
    string? PrimaryLocation,
    bool IsActive,
    bool IsMfaEnabled,
    DateTime? LastLoginAt
);

public record CreateUserRequest(
    string EmployeeCode,
    string FullName,
    string Email,
    string? Mobile,
    string TempPassword,
    int PositionId,
    int LocationId
);

public record UpdateUserRequest(
    string FullName,
    string? Mobile,
    int PositionId,
    int LocationId,
    bool IsMfaEnabled
);

public record AccessMatrixRowDto(
    string ScreenCode,
    string ScreenName,
    string ModuleName,
    Dictionary<string, bool> Grants
);

public record MatrixGrantChange(
    string ScreenCode,
    string PermCode,
    bool Granted
);

public record PositionDto(
    int PositionId,
    string PositionCode,
    string PositionName,
    int PositionLevel,
    string PositionType,
    string? Department,
    bool CanApprove,
    decimal? MaxApprovalAmount
);

public record PermissionDto(
    int PermissionId,
    string PermissionCode,
    string PermissionName,
    bool IsDataWrite
);

public record LocationDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    string LocationType,
    int? ParentLocationId
);

public record DocumentTypeDto(
    int DocTypeId,
    string DocTypeCode,
    string DocTypeName,
    string? Category,
    string? Description,
    decimal? MaxAmountLimit,
    bool IsActive
);
