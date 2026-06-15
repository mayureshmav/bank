using System.Security.Claims;
using EFRM.Core.Entities.Fraud;
using EFRM.Infrastructure.Data;
using EFRM.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFRM.API.Controllers;

[ApiController]
[Route("api/v1/rules")]
[Authorize]
public class RulesController(EfrmDbContext db, ApprovalEngineService engine) : ControllerBase
{
    private int CurrentPersonId =>
        int.TryParse(User.FindFirstValue("personId"), out var id) ? id : 0;

    [HttpGet]
    public async Task<IActionResult> GetRules(
        [FromQuery] string? channel, [FromQuery] bool? isActive,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var q = db.FraudRules.AsQueryable();
        if (channel != null) q = q.Where(r => r.Channel == channel || r.Channel == null);
        if (isActive.HasValue) q = q.Where(r => r.IsActive == isActive.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderBy(r => r.Priority)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new {
                r.RuleId, r.RuleCode, r.RuleName, r.RuleCategory,
                r.Channel, r.Action, r.ScoreWeight, r.Priority,
                r.IsActive, r.Version, r.CreatedAt, r.ApprovedAt
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetRule(int id)
    {
        var rule = await db.FraudRules.FindAsync(id);
        return rule == null ? NotFound() : Ok(rule);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRule([FromBody] FraudRule rule)
    {
        rule.RuleId    = 0;
        rule.IsActive  = false;          // Rules need approval before activation
        rule.CreatedBy = CurrentPersonId;
        rule.CreatedAt = DateTime.UtcNow;
        rule.UpdatedAt = DateTime.UtcNow;
        rule.Version   = 1;

        db.FraudRules.Add(rule);
        await db.SaveChangesAsync();

        // Auto-submit for approval
        await engine.SubmitAsync(new EFRM.Core.DTOs.Approval.SubmitApprovalRequest(
            "RULE_ACTIVATE", "FRAUD_RULE", rule.RuleId.ToString(),
            System.Text.Json.JsonSerializer.Serialize(new { rule.RuleCode, rule.RuleName, rule.Action }),
            null, $"New rule '{rule.RuleName}' submitted for activation approval."),
            CurrentPersonId, 1 /* default to HO location */);

        return CreatedAtAction(nameof(GetRule), new { id = rule.RuleId }, rule.RuleId);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRule(int id, [FromBody] FraudRule updated)
    {
        var rule = await db.FraudRules.FindAsync(id);
        if (rule == null) return NotFound();

        // Create new version
        var newVersion = new FraudRule
        {
            RuleCode       = rule.RuleCode,
            RuleName       = updated.RuleName,
            RuleCategory   = updated.RuleCategory,
            Channel        = updated.Channel,
            RuleDefinition = updated.RuleDefinition,
            ScoreWeight    = updated.ScoreWeight,
            Action         = updated.Action,
            Priority       = updated.Priority,
            IsActive       = false,
            Version        = rule.Version + 1,
            ParentRuleId   = id,
            CreatedBy      = CurrentPersonId,
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
            EffectiveFrom  = updated.EffectiveFrom,
            EffectiveTo    = updated.EffectiveTo
        };

        db.FraudRules.Add(newVersion);
        await db.SaveChangesAsync();

        await engine.SubmitAsync(new EFRM.Core.DTOs.Approval.SubmitApprovalRequest(
            "RULE_MODIFY", "FRAUD_RULE", newVersion.RuleId.ToString(),
            System.Text.Json.JsonSerializer.Serialize(new { newVersion.RuleCode, newVersion.RuleName }),
            null, $"Rule modification v{newVersion.Version} submitted for approval."),
            CurrentPersonId, 1);

        return Ok(new { newVersionId = newVersion.RuleId });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeactivateRule(int id)
    {
        var rule = await db.FraudRules.FindAsync(id);
        if (rule == null) return NotFound();

        rule.IsActive  = false;
        rule.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
