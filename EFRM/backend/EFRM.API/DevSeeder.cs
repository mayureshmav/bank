using EFRM.Core.Entities.Identity;
using EFRM.Core.Entities.Fraud;
using EFRM.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>Seeds minimal reference data + two login users for local development.</summary>
internal static class DevSeeder
{
    public static async Task SeedAsync(EfrmDbContext db)
    {
        if (await db.Persons.AnyAsync()) return; // already seeded

        // ── Locations ────────────────────────────────────────────────────────
        var ho = new Location { LocationCode = "HO", LocationName = "Head Office – Lucknow", LocationType = LocationType.HEAD_OFFICE, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Locations.Add(ho);
        await db.SaveChangesAsync();

        // ── Positions ────────────────────────────────────────────────────────
        var posAdmin = new Position { PositionCode = "SYS_ADMIN",    PositionName = "System Administrator",   PositionLevel = 5, PositionType = PositionType.ADMIN,       Department = "IT",               CanApprove = true,  IsActive = true };
        var posInv   = new Position { PositionCode = "INVESTIGATOR", PositionName = "Fraud Investigator",     PositionLevel = 1, PositionType = PositionType.INVESTIGATOR, Department = "Fraud Operations", CanApprove = false, IsActive = true };
        db.Positions.AddRange(posAdmin, posInv);
        await db.SaveChangesAsync();

        // ── Screens ──────────────────────────────────────────────────────────
        var screens = new[]
        {
            new Screen { ScreenCode = "DASHBOARD",       ScreenName = "Dashboard",           ModuleName = "Core",     RouteUrl = "/dashboard",              SortOrder = 1,  IsActive = true },
            new Screen { ScreenCode = "ALERT_LIST",      ScreenName = "Alert Queue",         ModuleName = "Alerts",   RouteUrl = "/alerts",                 SortOrder = 2,  IsActive = true },
            new Screen { ScreenCode = "ALERT_DETAIL",    ScreenName = "Alert Detail",        ModuleName = "Alerts",   RouteUrl = "/alerts/:id",             SortOrder = 3,  IsActive = true },
            new Screen { ScreenCode = "CASE_LIST",       ScreenName = "Case Management",     ModuleName = "Cases",    RouteUrl = "/cases",                  SortOrder = 4,  IsActive = true },
            new Screen { ScreenCode = "CASE_DETAIL",     ScreenName = "Case Detail",         ModuleName = "Cases",    RouteUrl = "/cases/:id",              SortOrder = 5,  IsActive = true },
            new Screen { ScreenCode = "RULE_LIST",       ScreenName = "Rule Engine",         ModuleName = "Rules",    RouteUrl = "/rules",                  SortOrder = 6,  IsActive = true },
            new Screen { ScreenCode = "RULE_EDITOR",     ScreenName = "Rule Editor",         ModuleName = "Rules",    RouteUrl = "/rules/editor",           SortOrder = 7,  IsActive = true },
            new Screen { ScreenCode = "APPROVAL_QUEUE",  ScreenName = "Approvals",           ModuleName = "Approval", RouteUrl = "/approvals",              SortOrder = 8,  IsActive = true },
            new Screen { ScreenCode = "CUSTOMER_PROFILE",ScreenName = "Customer 360°",       ModuleName = "Profiling",RouteUrl = "/profiling",              SortOrder = 9,  IsActive = true },
            new Screen { ScreenCode = "REPORTS",         ScreenName = "Reports & MIS",       ModuleName = "Reports",  RouteUrl = "/reports",                SortOrder = 10, IsActive = true },
            new Screen { ScreenCode = "ADMIN_USERS",     ScreenName = "User Management",     ModuleName = "Admin",    RouteUrl = "/admin/users",            SortOrder = 11, IsActive = true },
            new Screen { ScreenCode = "ADMIN_ACCESS",    ScreenName = "Access Matrix",       ModuleName = "Admin",    RouteUrl = "/admin/access",           SortOrder = 12, IsActive = true },
            new Screen { ScreenCode = "APPROVAL_MATRIX", ScreenName = "Approval Matrix",     ModuleName = "Admin",    RouteUrl = "/admin/approval-matrix",  SortOrder = 13, IsActive = true },
        };
        db.Screens.AddRange(screens);

        // ── Permissions ──────────────────────────────────────────────────────
        var permView   = new Permission { PermissionCode = "VIEW",   PermissionName = "View",   IsDataWrite = false };
        var permCreate = new Permission { PermissionCode = "CREATE", PermissionName = "Create", IsDataWrite = true };
        var permEdit   = new Permission { PermissionCode = "EDIT",   PermissionName = "Edit",   IsDataWrite = true };
        var permDelete = new Permission { PermissionCode = "DELETE", PermissionName = "Delete", IsDataWrite = true };
        var permExport = new Permission { PermissionCode = "EXPORT", PermissionName = "Export", IsDataWrite = false };
        db.Permissions.AddRange(permView, permCreate, permEdit, permDelete, permExport);
        await db.SaveChangesAsync();

        // ── SYS_ADMIN gets all screens with all permissions ───────────────────
        foreach (var screen in screens)
        {
            foreach (var perm in new[] { permView, permCreate, permEdit, permDelete, permExport })
            {
                db.PositionScreenPermissions.Add(new PositionScreenPermission
                {
                    PositionId   = posAdmin.PositionId,
                    ScreenId     = screen.ScreenId,
                    PermissionId = perm.PermissionId,
                    IsGranted    = true
                });
            }
        }

        // ── INVESTIGATOR gets operational screens ─────────────────────────────
        var invScreenCodes = new[] { "DASHBOARD", "ALERT_LIST", "ALERT_DETAIL", "CASE_LIST", "CASE_DETAIL", "CUSTOMER_PROFILE", "REPORTS" };
        foreach (var screen in screens.Where(s => invScreenCodes.Contains(s.ScreenCode)))
        {
            foreach (var perm in new[] { permView, permCreate, permEdit, permExport })
            {
                db.PositionScreenPermissions.Add(new PositionScreenPermission
                {
                    PositionId   = posInv.PositionId,
                    ScreenId     = screen.ScreenId,
                    PermissionId = perm.PermissionId,
                    IsGranted    = true
                });
            }
        }

        // ── Seed users ────────────────────────────────────────────────────────
        // admin@upgb.in  → Admin@2026!
        // fraud@upgb.in  → Fraud@2026!
        var admin = new Person
        {
            EmployeeCode = "EMP001", FullName = "System Administrator",
            Email = "admin@upgb.in", LdapUserName = "admin",
            PasswordHash = "$2b$12$CnvDA8I5deyEjWPgJl3R3uLeIzaLBVahkTrkXZUSw.HQQ7KGxYvZ2",
            IsActive = true, IsMfaEnabled = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        var fraud = new Person
        {
            EmployeeCode = "EMP002", FullName = "Fraud Investigator",
            Email = "fraud@upgb.in", LdapUserName = "fraud",
            PasswordHash = "$2b$12$HaFVmqm2GgitpsOl7Vl4NO9FCG.Y8bftWNCMx9vsi60oYYimLdOby",
            IsActive = true, IsMfaEnabled = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.Persons.AddRange(admin, fraud);
        await db.SaveChangesAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        db.PersonPositionLocations.AddRange(
            new PersonPositionLocation { PersonId = admin.PersonId, PositionId = posAdmin.PositionId, LocationId = ho.LocationId, IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = fraud.PersonId, PositionId = posInv.PositionId,   LocationId = ho.LocationId, IsPrimary = true, EffectiveFrom = today }
        );

        // ── Fraud rules (minimal) ─────────────────────────────────────────────
        db.FraudRules.AddRange(
            new FraudRule { RuleName = "High Value Transaction", RuleCode = "HVT_001", Channel = "ALL", RuleDefinition = """{"type":"THRESHOLD","field":"amount","operator":"gt","value":100000}""", ScoreWeight = 70, Action = "ALERT", Priority = 10, IsActive = true, CreatedBy = admin.PersonId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new FraudRule { RuleName = "Rapid Succession",       RuleCode = "RST_001", Channel = "UPI", RuleDefinition = """{"type":"VELOCITY","count":3,"windowMinutes":5}""",                    ScoreWeight = 80, Action = "ALERT", Priority = 20, IsActive = true, CreatedBy = admin.PersonId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );

        await db.SaveChangesAsync();
    }
}
