using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EFRM.Core.DTOs.Auth;
using EFRM.Infrastructure.Data;
using EFRM.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EFRM.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(
    EfrmDbContext db,
    AccessControlService accessControl,
    IConfiguration config) : ControllerBase
{
    // POST /api/v1/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        var person = await db.Persons
            .Include(p => p.Assignments)
                .ThenInclude(a => a.Position)
            .Include(p => p.Assignments)
                .ThenInclude(a => a.Location)
            .FirstOrDefaultAsync(p =>
                (p.LdapUserName == req.Username || p.Email == req.Username) && p.IsActive);

        if (person == null)
            return Unauthorized(new { error = "Invalid credentials." });

        // Lockout check
        if (person.LockedUntil.HasValue && person.LockedUntil > DateTime.UtcNow)
            return Unauthorized(new { error = "Account locked. Try again later." });

        // Password verify (BCrypt fallback when LDAP not available)
        bool valid = BCrypt.Net.BCrypt.Verify(req.Password, person.PasswordHash);
        if (!valid)
        {
            person.FailedLoginCount++;
            if (person.FailedLoginCount >= 5)
                person.LockedUntil = DateTime.UtcNow.AddMinutes(30);
            await db.SaveChangesAsync();
            return Unauthorized(new { error = "Invalid credentials." });
        }

        person.FailedLoginCount = 0;
        person.LastLoginAt = DateTime.UtcNow;
        person.LastLoginIp = Request.HttpContext.Connection.RemoteIpAddress?.ToString();
        await db.SaveChangesAsync();

        // Resolve primary assignment for JWT claims
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var primary = person.Assignments
            .FirstOrDefault(a => a.IsPrimary
                && a.EffectiveFrom <= today
                && (a.EffectiveTo == null || a.EffectiveTo >= today));

        var screenPerms = await accessControl.GetScreenPermissionsAsync(person.PersonId);

        var token = GenerateJwt(person, primary);
        var expiry = DateTime.UtcNow.AddHours(8);

        return Ok(new LoginResponse(
            token,
            Guid.NewGuid().ToString(), // TODO: store refresh token
            expiry,
            new PersonDto(
                person.PersonId,
                person.EmployeeCode,
                person.FullName,
                person.Email,
                primary?.Position.PositionName ?? "–",
                primary?.Location.LocationName ?? "–",
                primary?.LocationId ?? 0
            ),
            screenPerms
        ));
    }

    // GET /api/v1/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var personId = int.TryParse(User.FindFirstValue("personId"), out var id) ? id : 0;
        var person = await db.Persons.FindAsync(personId);
        if (person == null) return NotFound();

        var perms = await accessControl.GetScreenPermissionsAsync(personId);
        return Ok(new { person.PersonId, person.FullName, person.Email, Permissions = perms });
    }

    // POST /api/v1/auth/logout
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // Client should discard token; server-side: revoke refresh token if stored
        return NoContent();
    }

    private string GenerateJwt(
        EFRM.Core.Entities.Identity.Person person,
        EFRM.Core.Entities.Identity.PersonPositionLocation? primary)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("personId",    person.PersonId.ToString()),
            new("employeeCode",person.EmployeeCode),
            new(ClaimTypes.Name, person.FullName),
            new(ClaimTypes.Email, person.Email)
        };

        if (primary != null)
        {
            claims.Add(new("positionCode", primary.Position.PositionCode));
            claims.Add(new("locationId",   primary.LocationId.ToString()));
            claims.Add(new(ClaimTypes.Role, primary.Position.PositionCode));
        }

        var token = new JwtSecurityToken(
            issuer:   config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
