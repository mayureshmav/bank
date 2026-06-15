using System.Security.Claims;
using EFRM.Core.DTOs.Alert;
using EFRM.Core.Entities.Fraud;
using EFRM.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFRM.API.Controllers;

[ApiController]
[Route("api/v1/alerts")]
[Authorize]
public class AlertsController(EfrmDbContext db) : ControllerBase
{
    private int CurrentPersonId =>
        int.TryParse(User.FindFirstValue("personId"), out var id) ? id : 0;

    private HashSet<int> VisibleLocations =>
        HttpContext.Items["VisibleLocationIds"] as HashSet<int> ?? [];

    // GET /api/v1/alerts
    [HttpGet]
    public async Task<ActionResult<PagedResponse<AlertListResponse>>> GetAlerts(
        [FromQuery] AlertListRequest req)
    {
        var query = db.Alerts.AsQueryable();

        // Location scope enforcement
        if (VisibleLocations.Count > 0)
            query = query.Where(a => a.LocationId == null || VisibleLocations.Contains(a.LocationId.Value));

        if (!string.IsNullOrEmpty(req.Channel))
            query = query.Where(a => a.Channel == req.Channel);

        if (!string.IsNullOrEmpty(req.RiskLevel))
            query = query.Where(a => a.RiskLevel == req.RiskLevel);

        if (!string.IsNullOrEmpty(req.Status))
            query = query.Where(a => a.Status == Enum.Parse<AlertStatus>(req.Status));

        if (req.AssignedToMe == "true")
            query = query.Where(a => a.AssignedToPersonId == CurrentPersonId);

        if (req.FromDate.HasValue)
            query = query.Where(a => a.TransactionTimestamp >= req.FromDate.Value);

        if (req.ToDate.HasValue)
            query = query.Where(a => a.TransactionTimestamp <= req.ToDate.Value);

        if (!string.IsNullOrEmpty(req.Search))
            query = query.Where(a =>
                a.AlertRef.Contains(req.Search) ||
                (a.CustomerId != null && a.CustomerId.Contains(req.Search)) ||
                (a.TransactionRef != null && a.TransactionRef.Contains(req.Search)));

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.RiskScore)
            .ThenByDescending(a => a.CreatedAt)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Join(db.Persons, a => a.AssignedToPersonId, p => (int?)p.PersonId,
                (a, p) => new { Alert = a, AssignedToName = (string?)p.FullName })
            .DefaultIfEmpty()
            .Select(x => new AlertListResponse(
                x.Alert.AlertId,
                x.Alert.AlertRef,
                x.Alert.Channel,
                x.Alert.CustomerId,
                x.Alert.TransactionAmount,
                x.Alert.RiskScore,
                x.Alert.RiskLevel,
                x.Alert.Status.ToString(),
                x.Alert.FraudType,
                x.Alert.TransactionTimestamp,
                x.Alert.CreatedAt,
                x.AssignedToName,
                x.Alert.IsSlaBreach,
                x.Alert.SlaBreachAt,
                x.Alert.CustomerNotified
            ))
            .ToListAsync();

        return Ok(new PagedResponse<AlertListResponse>(items, total, req.Page, req.PageSize));
    }

    // GET /api/v1/alerts/{id}
    [HttpGet("{id:long}")]
    public async Task<ActionResult<AlertDetailResponse>> GetAlert(long id)
    {
        var alert = await db.Alerts
            .Include(a => a.Notes)
            .Include(a => a.ReasonCodesList)
            .FirstOrDefaultAsync(a => a.AlertId == id);

        if (alert == null) return NotFound();
        if (alert.LocationId.HasValue && !VisibleLocations.Contains(alert.LocationId.Value))
            return Forbid();

        // Parse model outputs from JSON
        ModelOutputDto? modelOut = null;
        if (alert.ModelOutputs != null)
        {
            try { modelOut = System.Text.Json.JsonSerializer.Deserialize<ModelOutputDto>(alert.ModelOutputs); }
            catch { /* ignore parse error */ }
        }

        // Enrich notes with person name
        var notePersonIds = alert.Notes.Select(n => n.CreatedBy).Distinct().ToList();
        var notePersons = await db.Persons
            .Where(p => notePersonIds.Contains(p.PersonId))
            .ToDictionaryAsync(p => p.PersonId, p => p.FullName);

        var assignedPerson = alert.AssignedToPersonId.HasValue
            ? await db.Persons.FindAsync(alert.AssignedToPersonId.Value)
            : null;

        return Ok(new AlertDetailResponse(
            alert.AlertId,
            alert.AlertRef,
            alert.TransactionRef,
            alert.Channel,
            alert.CustomerId,
            alert.AccountNumber,
            alert.TransactionAmount,
            alert.TransactionCurrency,
            alert.RiskScore,
            alert.RiskLevel,
            alert.Status.ToString(),
            alert.FraudType,
            modelOut,
            alert.ReasonCodesList.OrderBy(r => r.SortOrder)
                .Select(r => new ReasonCodeDto(r.ReasonCode, r.ReasonDesc, r.FeatureValue, r.ShapValue)),
            alert.TransactionTimestamp,
            alert.CreatedAt,
            assignedPerson?.FullName,
            alert.AssignedToPersonId,
            alert.IsSlaBreach,
            alert.SlaBreachAt,
            alert.CustomerNotified,
            alert.Notes.OrderBy(n => n.CreatedAt)
                .Select(n => new AlertNoteDto(
                    n.NoteId, n.Note,
                    notePersons.TryGetValue(n.CreatedBy, out var name) ? name : "Unknown",
                    n.CreatedAt))
        ));
    }

    // POST /api/v1/alerts/{id}/assign
    [HttpPost("{id:long}/assign")]
    public async Task<IActionResult> Assign(long id, [FromBody] AssignAlertRequest req)
    {
        var alert = await db.Alerts.FindAsync(id);
        if (alert == null) return NotFound();

        alert.AssignedToPersonId = req.PersonId;
        alert.AssignedAt = DateTime.UtcNow;
        alert.Status = AlertStatus.IN_INVESTIGATION;
        alert.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/v1/alerts/{id}/close
    [HttpPost("{id:long}/close")]
    public async Task<IActionResult> Close(long id, [FromBody] CloseAlertRequest req)
    {
        var alert = await db.Alerts.FindAsync(id);
        if (alert == null) return NotFound();

        if (!Enum.TryParse<AlertStatus>(req.Status, out var newStatus))
            return BadRequest("Invalid status. Use CLOSED_TP, CLOSED_FP, or CLOSED_INCONCLUSIVE.");

        alert.Status       = newStatus;
        alert.ClosedAt     = DateTime.UtcNow;
        alert.ClosedBy     = CurrentPersonId;
        alert.ClosureNotes = req.Notes;
        alert.UpdatedAt    = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/v1/alerts/{id}/notes
    [HttpPost("{id:long}/notes")]
    public async Task<IActionResult> AddNote(long id, [FromBody] string noteText)
    {
        if (await db.Alerts.FindAsync(id) == null) return NotFound();

        db.AlertNotes.Add(new AlertNote
        {
            AlertId   = id,
            Note      = noteText,
            CreatedBy = CurrentPersonId,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/v1/alerts/bulk-action
    [HttpPost("bulk-action")]
    public async Task<IActionResult> BulkAction([FromBody] BulkAlertActionRequest req)
    {
        if (req.AlertIds.Count() > 100)
            return BadRequest("Maximum 100 alerts per bulk action.");

        var alerts = await db.Alerts
            .Where(a => req.AlertIds.Contains(a.AlertId))
            .ToListAsync();

        foreach (var alert in alerts)
        {
            switch (req.Action.ToUpper())
            {
                case "ASSIGN":
                    alert.AssignedToPersonId = req.AssignToPersonId ?? CurrentPersonId;
                    alert.AssignedAt = DateTime.UtcNow;
                    alert.Status = AlertStatus.IN_INVESTIGATION;
                    break;
                case "ACKNOWLEDGE":
                    if (alert.Status == AlertStatus.OPEN)
                        alert.Status = AlertStatus.IN_INVESTIGATION;
                    break;
                case "CLOSE_FP":
                    alert.Status = AlertStatus.CLOSED_FP;
                    alert.ClosedAt = DateTime.UtcNow;
                    alert.ClosedBy = CurrentPersonId;
                    alert.ClosureNotes = req.Notes;
                    break;
            }
            alert.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(new { processed = alerts.Count });
    }

    // GET /api/v1/alerts/stats – dashboard KPIs
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var query = db.Alerts.AsQueryable();
        if (VisibleLocations.Count > 0)
            query = query.Where(a => a.LocationId == null || VisibleLocations.Contains(a.LocationId.Value));

        var today = DateTime.UtcNow.Date;
        var result = new
        {
            TotalOpen       = await query.CountAsync(a => a.Status == AlertStatus.OPEN),
            TotalCritical   = await query.CountAsync(a => a.RiskLevel == "CRITICAL"),
            TotalHighRisk   = await query.CountAsync(a => a.RiskLevel == "HIGH"),
            SlaBreached     = await query.CountAsync(a => a.IsSlaBreach),
            ClosedToday     = await query.CountAsync(a => a.ClosedAt.HasValue && a.ClosedAt.Value.Date == today),
            AssignedToMe    = await query.CountAsync(a => a.AssignedToPersonId == CurrentPersonId && a.Status == AlertStatus.IN_INVESTIGATION),
            ByChannel       = await query.Where(a => a.Status == AlertStatus.OPEN)
                                .GroupBy(a => a.Channel)
                                .Select(g => new { Channel = g.Key, Count = g.Count() })
                                .ToListAsync()
        };
        return Ok(result);
    }
}
