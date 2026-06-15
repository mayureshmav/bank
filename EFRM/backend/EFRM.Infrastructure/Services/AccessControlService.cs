using EFRM.Core.DTOs.Auth;
using EFRM.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EFRM.Infrastructure.Services;

/// <summary>
/// Resolves what screens and permissions a person has based on their
/// Position-Location assignment.  This is the core of the PPL access model.
/// </summary>
public class AccessControlService(EfrmDbContext db)
{
    /// <summary>
    /// Returns all screen+permission grants for a person's active assignments.
    /// The union of all active position assignments is used (a person may hold
    /// multiple positions simultaneously – e.g., Investigator + Analyst).
    /// </summary>
    public async Task<IEnumerable<ScreenPermissionDto>> GetScreenPermissionsAsync(int personId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Active position IDs for this person
        var positionIds = await db.PersonPositionLocations
            .Where(ppl => ppl.PersonId == personId
                       && ppl.EffectiveFrom <= today
                       && (ppl.EffectiveTo == null || ppl.EffectiveTo >= today))
            .Select(ppl => ppl.PositionId)
            .Distinct()
            .ToListAsync();

        if (positionIds.Count == 0) return [];

        // Grants: PositionId × ScreenId × PermissionId where IsGranted
        var grants = await db.PositionScreenPermissions
            .Where(psp => positionIds.Contains(psp.PositionId) && psp.IsGranted)
            .Include(psp => psp.Screen)
            .Include(psp => psp.Permission)
            .ToListAsync();

        // Group by screen and union permissions
        return grants
            .GroupBy(g => g.Screen)
            .Where(g => g.Key.IsActive)
            .OrderBy(g => g.Key.SortOrder)
            .Select(g => new ScreenPermissionDto(
                g.Key.ScreenCode,
                g.Key.ModuleName,
                g.Key.RouteUrl ?? string.Empty,
                g.Select(x => x.Permission.PermissionCode).Distinct()
            ));
    }

    /// <summary>
    /// Returns location IDs that a person at their primary location can view data for.
    /// Head-Office positions see all; Branch positions see their branch only by default.
    /// </summary>
    public async Task<IEnumerable<int>> GetVisibleLocationIdsAsync(int personId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var primaryAssignment = await db.PersonPositionLocations
            .Where(ppl => ppl.PersonId == personId
                       && ppl.IsPrimary
                       && ppl.EffectiveFrom <= today
                       && (ppl.EffectiveTo == null || ppl.EffectiveTo >= today))
            .Include(ppl => ppl.Location)
            .Include(ppl => ppl.Position)
            .FirstOrDefaultAsync();

        if (primaryAssignment == null) return [];

        // HEAD_OFFICE or ADMIN sees all
        if (primaryAssignment.Location.LocationType == Core.Entities.Identity.LocationType.HEAD_OFFICE
         || primaryAssignment.Position.PositionType == Core.Entities.Identity.PositionType.ADMIN
         || primaryAssignment.Position.PositionType == Core.Entities.Identity.PositionType.IT_ADMIN)
        {
            return await db.Locations.Select(l => l.LocationId).ToListAsync();
        }

        // REGION: sees all zones + branches under it
        if (primaryAssignment.Location.LocationType == Core.Entities.Identity.LocationType.REGION)
        {
            return await GetDescendantLocationIdsAsync(primaryAssignment.LocationId);
        }

        // ZONE: sees all branches under zone
        if (primaryAssignment.Location.LocationType == Core.Entities.Identity.LocationType.ZONE)
        {
            return await GetDescendantLocationIdsAsync(primaryAssignment.LocationId);
        }

        // BRANCH: sees only their branch
        return [primaryAssignment.LocationId];
    }

    private async Task<IEnumerable<int>> GetDescendantLocationIdsAsync(int parentId)
    {
        var all = await db.Locations.Where(l => l.IsActive).ToListAsync();
        var result = new HashSet<int> { parentId };
        var queue = new Queue<int>();
        queue.Enqueue(parentId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            foreach (var child in all.Where(l => l.ParentLocationId == current))
            {
                if (result.Add(child.LocationId))
                    queue.Enqueue(child.LocationId);
            }
        }

        return result;
    }

    /// <summary>
    /// Check if a person can perform an action on a screen.
    /// </summary>
    public async Task<bool> HasPermissionAsync(int personId, string screenCode, string permissionCode)
    {
        var permissions = await GetScreenPermissionsAsync(personId);
        return permissions
            .Where(p => p.ScreenCode == screenCode)
            .Any(p => p.Permissions.Contains(permissionCode));
    }
}
