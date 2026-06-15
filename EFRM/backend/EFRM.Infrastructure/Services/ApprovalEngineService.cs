using EFRM.Core.DTOs.Approval;
using EFRM.Core.Entities.Approval;
using EFRM.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EFRM.Infrastructure.Services;

/// <summary>
/// Configurable approval engine driven by DocumentType → ApprovalStage matrix.
/// Routing is determined by: DocType + Amount range + Approver Position + Location.
/// </summary>
public class ApprovalEngineService(EfrmDbContext db)
{
    /// <summary>
    /// Submit a document for approval. Determines the first stage automatically.
    /// </summary>
    public async Task<ApprovalRequest> SubmitAsync(SubmitApprovalRequest req, int requestedBy, int locationId)
    {
        var docType = await db.DocumentTypes
            .Include(d => d.Stages.Where(s => s.IsActive).OrderBy(s => s.StageNumber))
            .FirstOrDefaultAsync(d => d.DocTypeCode == req.DocTypeCode && d.IsActive)
            ?? throw new InvalidOperationException($"Document type '{req.DocTypeCode}' not found.");

        if (!docType.Stages.Any())
            throw new InvalidOperationException($"No active stages configured for '{req.DocTypeCode}'.");

        var firstStage = docType.Stages.First();

        var request = new ApprovalRequest
        {
            DocTypeId       = docType.DocTypeId,
            EntityType      = req.EntityType,
            EntityId        = req.EntityId,
            EntitySnapshot  = req.EntitySnapshot,
            Amount          = req.Amount,
            RequestedBy     = requestedBy,
            RequestedAt     = DateTime.UtcNow,
            LocationId      = locationId,
            CurrentStageId  = firstStage.StageId,
            Status          = ApprovalRequestStatus.PENDING,
            Comments        = req.Comments
        };

        db.ApprovalRequests.Add(request);
        await db.SaveChangesAsync();
        return request;
    }

    /// <summary>
    /// Record a decision (APPROVED / REJECTED / RETURNED) and advance to next stage
    /// or finalize the request.
    /// </summary>
    public async Task<ApprovalRequest> DecideAsync(int requestId, int decidedBy, ApprovalDecisionRequest decisionReq)
    {
        var request = await db.ApprovalRequests
            .Include(r => r.DocType)
                .ThenInclude(d => d.Stages.Where(s => s.IsActive).OrderBy(s => s.StageNumber))
            .Include(r => r.Decisions)
            .FirstOrDefaultAsync(r => r.RequestId == requestId)
            ?? throw new InvalidOperationException("Approval request not found.");

        if (request.Status is not (ApprovalRequestStatus.PENDING or ApprovalRequestStatus.IN_REVIEW))
            throw new InvalidOperationException("Request is no longer awaiting a decision.");

        // Validate the decider has the right position for current stage
        await ValidateApproverAsync(decidedBy, request.CurrentStageId!.Value, request.LocationId);

        var decision = new ApprovalDecision
        {
            RequestId  = requestId,
            StageId    = request.CurrentStageId!.Value,
            ApprovedBy = decidedBy,
            Decision   = decisionReq.Decision,
            Comments   = decisionReq.Comments,
            DecidedAt  = DateTime.UtcNow
        };
        db.ApprovalDecisions.Add(decision);

        if (decisionReq.Decision == "REJECTED")
        {
            request.Status      = ApprovalRequestStatus.REJECTED;
            request.FinalizedAt = DateTime.UtcNow;
            request.FinalizedBy = decidedBy;
        }
        else if (decisionReq.Decision == "APPROVED")
        {
            // Advance to next stage or finalize
            var stages = request.DocType.Stages.OrderBy(s => s.StageNumber).ToList();
            var currentStage = stages.First(s => s.StageId == request.CurrentStageId);
            var nextStage = stages.FirstOrDefault(s => s.StageNumber > currentStage.StageNumber);

            if (nextStage != null)
            {
                request.CurrentStageId = nextStage.StageId;
                request.Status = ApprovalRequestStatus.IN_REVIEW;
            }
            else
            {
                // All stages approved
                request.Status      = ApprovalRequestStatus.APPROVED;
                request.FinalizedAt = DateTime.UtcNow;
                request.FinalizedBy = decidedBy;
                await ApplyApprovalEffectAsync(request);
            }
        }
        else if (decisionReq.Decision == "RETURNED")
        {
            // Return to requester for amendments
            request.Status = ApprovalRequestStatus.PENDING;
        }

        await db.SaveChangesAsync();
        return request;
    }

    /// <summary>
    /// Check if a person can approve the given stage (position + optional location match).
    /// </summary>
    private async Task ValidateApproverAsync(int personId, int stageId, int requestLocationId)
    {
        var stage = await db.ApprovalStages.FindAsync(stageId)
            ?? throw new InvalidOperationException("Stage not found.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hasPosition = await db.PersonPositionLocations
            .AnyAsync(ppl =>
                ppl.PersonId == personId &&
                ppl.PositionId == stage.ApproverPositionId &&
                ppl.EffectiveFrom <= today &&
                (ppl.EffectiveTo == null || ppl.EffectiveTo >= today) &&
                (!stage.RequiresLocationMatch || ppl.LocationId == requestLocationId));

        if (!hasPosition)
            throw new UnauthorizedAccessException(
                "You do not have the required position to approve this stage.");
    }

    /// <summary>
    /// Side-effect of final approval (e.g., activate a rule, close a case).
    /// Implement additional logic per entity type as needed.
    /// </summary>
    private async Task ApplyApprovalEffectAsync(ApprovalRequest request)
    {
        switch (request.EntityType)
        {
            case "FRAUD_RULE":
                if (int.TryParse(request.EntityId, out var ruleId))
                {
                    var rule = await db.FraudRules.FindAsync(ruleId);
                    if (rule != null)
                    {
                        rule.IsActive    = true;
                        rule.ApprovedBy  = request.FinalizedBy;
                        rule.ApprovedAt  = DateTime.UtcNow;
                    }
                }
                break;

            // Add more cases: FRAUD_CASE closure, CONFIG_CHANGE, WATCHLIST_ADD, etc.
        }
    }

    /// <summary>
    /// List pending approvals for the current user based on their position.
    /// </summary>
    public async Task<IEnumerable<ApprovalRequestDto>> GetPendingForPersonAsync(int personId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var positionIds = await db.PersonPositionLocations
            .Where(ppl => ppl.PersonId == personId
                       && ppl.EffectiveFrom <= today
                       && (ppl.EffectiveTo == null || ppl.EffectiveTo >= today))
            .Select(ppl => ppl.PositionId)
            .Distinct()
            .ToListAsync();

        return await db.ApprovalRequests
            .Where(r => r.Status == ApprovalRequestStatus.PENDING
                     || r.Status == ApprovalRequestStatus.IN_REVIEW)
            .Include(r => r.DocType).ThenInclude(d => d.Stages)
            .Include(r => r.CurrentStage)
            .Where(r => r.CurrentStage != null
                     && positionIds.Contains(r.CurrentStage.ApproverPositionId))
            .OrderBy(r => r.RequestedAt)
            .Select(r => new ApprovalRequestDto(
                r.RequestId,
                r.RequestRef,
                r.DocType.DocTypeName,
                r.EntityType,
                r.EntityId,
                r.Amount,
                r.RequestedBy.ToString(),
                r.RequestedAt,
                r.CurrentStage!.StageName,
                r.Status.ToString(),
                r.CurrentStage.StageNumber,
                r.DocType.Stages.Count
            ))
            .ToListAsync();
    }
}
