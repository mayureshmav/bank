using System.Security.Claims;
using EFRM.Core.DTOs.Approval;
using EFRM.Infrastructure.Data;
using EFRM.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFRM.API.Controllers;

[ApiController]
[Route("api/v1/approvals")]
[Authorize]
public class ApprovalsController(ApprovalEngineService engine, EfrmDbContext db) : ControllerBase
{
    private int CurrentPersonId =>
        int.TryParse(User.FindFirstValue("personId"), out var id) ? id : 0;

    private int CurrentLocationId =>
        int.TryParse(User.FindFirstValue("locationId"), out var id) ? id : 1;

    // GET /api/v1/approvals/pending – items awaiting my decision
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<ApprovalRequestDto>>> GetPending()
    {
        var items = await engine.GetPendingForPersonAsync(CurrentPersonId);
        return Ok(items);
    }

    // GET /api/v1/approvals/my-requests – items I submitted
    [HttpGet("my-requests")]
    public async Task<IActionResult> GetMyRequests()
    {
        var items = await db.ApprovalRequests
            .Where(r => r.RequestedBy == CurrentPersonId)
            .Include(r => r.DocType)
            .Include(r => r.CurrentStage)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new ApprovalRequestDto(
                r.RequestId, r.RequestRef, r.DocType.DocTypeName,
                r.EntityType, r.EntityId, r.Amount, "Me",
                r.RequestedAt,
                r.CurrentStage != null ? r.CurrentStage.StageName : "–",
                r.Status.ToString(),
                r.CurrentStage != null ? r.CurrentStage.StageNumber : 0,
                r.DocType.Stages.Count))
            .ToListAsync();
        return Ok(items);
    }

    // POST /api/v1/approvals – submit for approval
    [HttpPost]
    public async Task<ActionResult<int>> Submit([FromBody] SubmitApprovalRequest req)
    {
        var request = await engine.SubmitAsync(req, CurrentPersonId, CurrentLocationId);
        return CreatedAtAction(nameof(GetDetail), new { id = request.RequestId }, request.RequestId);
    }

    // GET /api/v1/approvals/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApprovalDetailDto>> GetDetail(int id)
    {
        var r = await db.ApprovalRequests
            .Include(r => r.DocType).ThenInclude(d => d.Stages.OrderBy(s => s.StageNumber))
            .Include(r => r.Decisions)
            .Include(r => r.CurrentStage)
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (r == null) return NotFound();

        // Determine if current user can approve/reject this stage
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        bool canAct = false;
        if (r.CurrentStage != null)
        {
            canAct = await db.PersonPositionLocations.AnyAsync(ppl =>
                ppl.PersonId == CurrentPersonId &&
                ppl.PositionId == r.CurrentStage.ApproverPositionId &&
                ppl.EffectiveFrom <= today &&
                (ppl.EffectiveTo == null || ppl.EffectiveTo >= today));
        }

        // Enrich decisions with names
        var deciderIds = r.Decisions.Select(d => d.ApprovedBy).Distinct().ToList();
        var deciders = await db.Persons
            .Where(p => deciderIds.Contains(p.PersonId))
            .ToDictionaryAsync(p => p.PersonId, p => p.FullName);

        var stageDecisions = r.DocType.Stages
            .OrderBy(s => s.StageNumber)
            .Select(s =>
            {
                var decision = r.Decisions.FirstOrDefault(d => d.StageId == s.StageId);
                return new StageDecisionDto(
                    s.StageNumber, s.StageName,
                    decision?.Decision,
                    decision != null && deciders.TryGetValue(decision.ApprovedBy, out var nm) ? nm : null,
                    decision?.DecidedAt,
                    decision?.Comments,
                    s.StageId == r.CurrentStageId
                );
            });

        var requester = await db.Persons.FindAsync(r.RequestedBy);

        return Ok(new ApprovalDetailDto(
            r.RequestId, r.RequestRef,
            r.DocType.DocTypeCode, r.DocType.DocTypeName,
            r.EntityType, r.EntityId, r.EntitySnapshot,
            r.Amount, requester?.FullName ?? "–",
            r.RequestedAt, r.Status.ToString(),
            stageDecisions,
            r.CurrentStage?.StageName,
            canAct && r.Status != EFRM.Core.Entities.Approval.ApprovalRequestStatus.APPROVED,
            canAct && r.Status != EFRM.Core.Entities.Approval.ApprovalRequestStatus.APPROVED
        ));
    }

    // POST /api/v1/approvals/{id}/decide
    [HttpPost("{id:int}/decide")]
    public async Task<IActionResult> Decide(int id, [FromBody] ApprovalDecisionRequest req)
    {
        if (req.Decision is not ("APPROVED" or "REJECTED" or "RETURNED"))
            return BadRequest("Decision must be APPROVED, REJECTED, or RETURNED.");

        await engine.DecideAsync(id, CurrentPersonId, req);
        return NoContent();
    }

    // GET /api/v1/approvals/matrix – the configured approval matrix
    [HttpGet("matrix")]
    [Authorize(Roles = "SYS_ADMIN,IT_ADMIN")]
    public async Task<ActionResult<IEnumerable<ApprovalMatrixEntryDto>>> GetMatrix()
    {
        var items = await db.ApprovalMatrices
            .Include(m => m.DocType)
            .Include(m => m.Position)
            .OrderBy(m => m.DocTypeId).ThenBy(m => m.PositionId)
            .Select(m => new ApprovalMatrixEntryDto(
                m.MatrixId,
                m.DocType.DocTypeName,
                m.Position.PositionName,
                m.LocationTypeFilter,
                m.AmountFrom,
                m.AmountTo,
                m.MaxApprovalAmount,
                m.IsActive))
            .ToListAsync();
        return Ok(items);
    }

    // PUT /api/v1/approvals/matrix – update matrix entry
    [HttpPut("matrix")]
    [Authorize(Roles = "SYS_ADMIN")]
    public async Task<IActionResult> UpsertMatrix([FromBody] UpsertApprovalMatrixRequest req)
    {
        var existing = await db.ApprovalMatrices
            .FirstOrDefaultAsync(m => m.DocTypeId == req.DocTypeId && m.PositionId == req.PositionId
                && m.LocationTypeFilter == req.LocationTypeFilter);

        if (existing != null)
        {
            existing.AmountFrom = req.AmountFrom;
            existing.AmountTo = req.AmountTo;
            existing.MaxApprovalAmount = req.MaxApprovalAmount;
            existing.IsActive = true;
        }
        else
        {
            db.ApprovalMatrices.Add(new EFRM.Core.Entities.Approval.ApprovalMatrix
            {
                DocTypeId = req.DocTypeId,
                PositionId = req.PositionId,
                LocationTypeFilter = req.LocationTypeFilter,
                AmountFrom = req.AmountFrom,
                AmountTo = req.AmountTo,
                MaxApprovalAmount = req.MaxApprovalAmount,
                ValidFrom = DateOnly.FromDateTime(DateTime.UtcNow),
                IsActive = true
            });
        }

        await db.SaveChangesAsync();
        return NoContent();
    }
}
