using System.Security.Claims;
using EFRM.Core.DTOs.Admin;
using EFRM.Core.Entities.Identity;
using EFRM.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFRM.API.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController(EfrmDbContext db) : ControllerBase
{
    private int CurrentPersonId =>
        int.TryParse(User.FindFirstValue("personId"), out var id) ? id : 0;

    // ── Users ────────────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var persons = await db.Persons
            .Include(p => p.Assignments).ThenInclude(a => a.Position)
            .Include(p => p.Assignments).ThenInclude(a => a.Location)
            .OrderBy(p => p.EmployeeCode)
            .ToListAsync();

        var result = persons.Select(p =>
        {
            var primary = p.Assignments.FirstOrDefault(a => a.IsPrimary && a.EffectiveTo == null);
            return new PersonDto(
                p.PersonId, p.EmployeeCode, p.FullName, p.Email, p.Mobile,
                primary?.PositionId, primary?.Position?.PositionName, primary?.Position?.PositionCode,
                primary?.LocationId, primary?.Location?.LocationName,
                p.IsActive, p.IsMfaEnabled, p.LastLoginAt
            );
        });

        return Ok(result);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (await db.Persons.AnyAsync(p => p.Email == req.Email))
            return Conflict(new { error = "Email already registered" });

        if (await db.Persons.AnyAsync(p => p.EmployeeCode == req.EmployeeCode))
            return Conflict(new { error = "Employee code already in use" });

        var position = await db.Positions.FindAsync(req.PositionId);
        var location = await db.Locations.FindAsync(req.LocationId);
        if (position == null || location == null)
            return BadRequest(new { error = "Invalid position or location" });

        var person = new Person
        {
            EmployeeCode  = req.EmployeeCode,
            FullName      = req.FullName,
            Email         = req.Email,
            Mobile        = req.Mobile,
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(req.TempPassword, 12),
            IsActive      = true,
            IsMfaEnabled  = false,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow
        };
        db.Persons.Add(person);
        await db.SaveChangesAsync();

        db.PersonPositionLocations.Add(new PersonPositionLocation
        {
            PersonId      = person.PersonId,
            PositionId    = req.PositionId,
            LocationId    = req.LocationId,
            IsPrimary     = true,
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow)
        });
        await db.SaveChangesAsync();

        return Created($"/api/v1/admin/users/{person.PersonId}", new { person.PersonId });
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        var person = await db.Persons.FindAsync(id);
        if (person == null) return NotFound();

        person.FullName     = req.FullName;
        person.Mobile       = req.Mobile;
        person.IsMfaEnabled = req.IsMfaEnabled;
        person.UpdatedAt    = DateTime.UtcNow;

        // Update primary assignment position/location
        var assignment = await db.PersonPositionLocations
            .FirstOrDefaultAsync(a => a.PersonId == id && a.IsPrimary && a.EffectiveTo == null);

        if (assignment != null && (assignment.PositionId != req.PositionId || assignment.LocationId != req.LocationId))
        {
            assignment.EffectiveTo = DateOnly.FromDateTime(DateTime.UtcNow);
            db.PersonPositionLocations.Add(new PersonPositionLocation
            {
                PersonId      = id,
                PositionId    = req.PositionId,
                LocationId    = req.LocationId,
                IsPrimary     = true,
                EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow)
            });
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("users/{id:int}/status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        if (id == CurrentPersonId) return BadRequest(new { error = "Cannot deactivate your own account" });
        var person = await db.Persons.FindAsync(id);
        if (person == null) return NotFound();
        person.IsActive  = !person.IsActive;
        person.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { isActive = person.IsActive });
    }

    [HttpPatch("users/{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id)
    {
        var person = await db.Persons.FindAsync(id);
        if (person == null) return NotFound();

        var tempPwd = $"UPGB@{Random.Shared.Next(100000, 999999)}!";
        person.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPwd, 12);
        person.UpdatedAt    = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { tempPassword = tempPwd });
    }

    // ── Reference data ───────────────────────────────────────────────────────

    [HttpGet("positions")]
    public async Task<IActionResult> GetPositions()
    {
        var positions = await db.Positions
            .Where(p => p.IsActive)
            .OrderBy(p => p.PositionLevel)
            .Select(p => new PositionDto(p.PositionId, p.PositionCode, p.PositionName, p.PositionLevel, p.PositionType.ToString(), p.Department, p.CanApprove, p.MaxApprovalAmount))
            .ToListAsync();
        return Ok(positions);
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions()
    {
        var perms = await db.Permissions
            .OrderBy(p => p.PermissionId)
            .Select(p => new PermissionDto(p.PermissionId, p.PermissionCode, p.PermissionName, p.IsDataWrite))
            .ToListAsync();
        return Ok(perms);
    }

    [HttpGet("locations")]
    public async Task<IActionResult> GetLocations()
    {
        var locs = await db.Locations
            .Where(l => l.IsActive)
            .OrderBy(l => l.LocationType).ThenBy(l => l.LocationName)
            .Select(l => new LocationDto(l.LocationId, l.LocationCode, l.LocationName, l.LocationType.ToString(), l.ParentLocationId))
            .ToListAsync();
        return Ok(locs);
    }

    [HttpGet("document-types")]
    public async Task<IActionResult> GetDocTypes()
    {
        var types = await db.DocumentTypes
            .Where(d => d.IsActive)
            .OrderBy(d => d.DocTypeName)
            .Select(d => new DocumentTypeDto(d.DocTypeId, d.DocTypeCode, d.DocTypeName, d.Category, d.Description, d.MaxAmountLimit, d.IsActive))
            .ToListAsync();
        return Ok(types);
    }

    // ── Access Matrix ────────────────────────────────────────────────────────

    [HttpGet("access-matrix/{positionId:int}")]
    public async Task<IActionResult> GetAccessMatrix(int positionId)
    {
        var screens = await db.Screens.Where(s => s.IsActive).OrderBy(s => s.SortOrder).ToListAsync();
        var perms   = await db.Permissions.OrderBy(p => p.PermissionId).ToListAsync();
        var grants  = await db.PositionScreenPermissions
            .Where(g => g.PositionId == positionId && g.IsGranted)
            .ToListAsync();

        var rows = screens.Select(s => new AccessMatrixRowDto(
            s.ScreenCode,
            s.ScreenName,
            s.ModuleName,
            perms.ToDictionary(
                p => p.PermissionCode,
                p => grants.Any(g => g.ScreenId == s.ScreenId && g.PermissionId == p.PermissionId)
            )
        )).ToList();

        return Ok(rows);
    }

    [HttpPut("access-matrix/{positionId:int}")]
    public async Task<IActionResult> SaveAccessMatrix(int positionId, [FromBody] IEnumerable<MatrixGrantChange> changes)
    {
        var screens = await db.Screens.ToListAsync();
        var perms   = await db.Permissions.ToListAsync();

        foreach (var change in changes)
        {
            var screen = screens.FirstOrDefault(s => s.ScreenCode == change.ScreenCode);
            var perm   = perms.FirstOrDefault(p => p.PermissionCode == change.PermCode);
            if (screen == null || perm == null) continue;

            var existing = await db.PositionScreenPermissions
                .FirstOrDefaultAsync(g => g.PositionId == positionId && g.ScreenId == screen.ScreenId && g.PermissionId == perm.PermissionId);

            if (existing != null)
            {
                existing.IsGranted = change.Granted;
            }
            else if (change.Granted)
            {
                db.PositionScreenPermissions.Add(new PositionScreenPermission
                {
                    PositionId   = positionId,
                    ScreenId     = screen.ScreenId,
                    PermissionId = perm.PermissionId,
                    IsGranted    = true
                });
            }
        }

        await db.SaveChangesAsync();
        return NoContent();
    }
}
