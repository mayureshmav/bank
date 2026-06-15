namespace EFRM.Core.DTOs.Auth;

public record LoginRequest(string Username, string Password, string? MfaCode);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    PersonDto Person,
    IEnumerable<ScreenPermissionDto> ScreenPermissions
);

public record PersonDto(
    int PersonId,
    string EmployeeCode,
    string FullName,
    string Email,
    string PrimaryPosition,
    string PrimaryLocation,
    int LocationId
);

public record ScreenPermissionDto(
    string ScreenCode,
    string ModuleName,
    string RouteUrl,
    IEnumerable<string> Permissions
);

public record RefreshTokenRequest(string RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
