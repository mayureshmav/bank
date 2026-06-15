using System.Security.Claims;
using EFRM.Infrastructure.Data;
using EFRM.Infrastructure.Services;

namespace EFRM.API.Middleware;

/// <summary>
/// Resolves visible location IDs for the authenticated user and stores them
/// in HttpContext.Items["VisibleLocationIds"] for use in controllers.
/// This enforces the Person-Position-Location data scope pattern.
/// </summary>
public class LocationScopeMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, AccessControlService accessControl)
    {
        if (ctx.User.Identity?.IsAuthenticated == true)
        {
            var personIdClaim = ctx.User.FindFirstValue("personId");
            if (int.TryParse(personIdClaim, out var personId))
            {
                var visibleIds = await accessControl.GetVisibleLocationIdsAsync(personId);
                ctx.Items["VisibleLocationIds"] = visibleIds.ToHashSet();
            }
        }
        await next(ctx);
    }
}

/// <summary>Global exception handler – returns RFC 7807 Problem Detail.</summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access attempt");
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Business rule violation");
            ctx.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
            await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await ctx.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred. Reference: " + ctx.TraceIdentifier });
        }
    }
}

/// <summary>Appends key actions to the immutable audit log.</summary>
public class AuditMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> _auditMethods = ["POST", "PUT", "PATCH", "DELETE"];

    public async Task InvokeAsync(HttpContext ctx, EfrmDbContext? db)
    {
        await next(ctx);

        if (db != null
         && _auditMethods.Contains(ctx.Request.Method)
         && ctx.User.Identity?.IsAuthenticated == true
         && ctx.Response.StatusCode < 400)
        {
            // Lightweight audit – full entity diff is captured in repositories
            var personId = int.TryParse(ctx.User.FindFirstValue("personId"), out var pid) ? pid : (int?)null;
            db.Set<EFRM.Core.Entities.Audit.AuditLog>().Add(new EFRM.Core.Entities.Audit.AuditLog
            {
                PersonId     = personId,
                Action       = $"{ctx.Request.Method} {ctx.Request.Path}",
                IpAddress    = ctx.Connection.RemoteIpAddress?.ToString(),
                IsSuccess    = ctx.Response.StatusCode < 400,
                CorrelationId = Guid.TryParse(ctx.TraceIdentifier, out var gid) ? gid : Guid.NewGuid()
            });
            await db.SaveChangesAsync();
        }
    }
}
