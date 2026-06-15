using EFRM.Core.Entities.Identity;
using EFRM.Core.Entities.Fraud;
using EFRM.Core.Entities.Approval;
using EFRM.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>Seeds comprehensive reference + demo data for local SQLite development.</summary>
internal static class DevSeeder
{
    // All additional test users share password: Admin@2026!
    private const string TestHash = "$2b$12$CnvDA8I5deyEjWPgJl3R3uLeIzaLBVahkTrkXZUSw.HQQ7KGxYvZ2";

    public static async Task SeedAsync(EfrmDbContext db)
    {
        if (await db.Persons.AnyAsync()) return;

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        // ══════════════════════════════════════════════════════════════════════
        // LOCATIONS
        // ══════════════════════════════════════════════════════════════════════
        var ho = new Location { LocationCode = "HO", LocationName = "Head Office – Lucknow", LocationType = LocationType.HEAD_OFFICE, IsActive = true, CreatedAt = now, UpdatedAt = now };
        db.Locations.Add(ho);
        await db.SaveChangesAsync();

        var roVar = new Location { LocationCode = "RO_VAR", LocationName = "Regional Office – Varanasi",  LocationType = LocationType.REGION, ParentLocationId = ho.LocationId, IsActive = true, CreatedAt = now, UpdatedAt = now };
        var roAgr = new Location { LocationCode = "RO_AGR", LocationName = "Regional Office – Agra",      LocationType = LocationType.REGION, ParentLocationId = ho.LocationId, IsActive = true, CreatedAt = now, UpdatedAt = now };
        db.Locations.AddRange(roVar, roAgr);
        await db.SaveChangesAsync();

        var brVar01 = new Location { LocationCode = "BR_VAR01", LocationName = "Varanasi Main Branch",           LocationType = LocationType.BRANCH, ParentLocationId = roVar.LocationId, IsActive = true, CreatedAt = now, UpdatedAt = now };
        var brAgr01 = new Location { LocationCode = "BR_AGR01", LocationName = "Agra Saddar Branch",             LocationType = LocationType.BRANCH, ParentLocationId = roAgr.LocationId, IsActive = true, CreatedAt = now, UpdatedAt = now };
        var brLko01 = new Location { LocationCode = "BR_LKO01", LocationName = "Lucknow Civil Lines Branch",     LocationType = LocationType.BRANCH, ParentLocationId = ho.LocationId,   IsActive = true, CreatedAt = now, UpdatedAt = now };
        db.Locations.AddRange(brVar01, brAgr01, brLko01);
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // POSITIONS
        // ══════════════════════════════════════════════════════════════════════
        var posAdmin = new Position { PositionCode = "SYS_ADMIN",    PositionName = "System Administrator", PositionLevel = 5, PositionType = PositionType.ADMIN,        Department = "IT",               CanApprove = true,  MaxApprovalAmount = 99999999, IsActive = true };
        var posInv   = new Position { PositionCode = "INVESTIGATOR",  PositionName = "Fraud Investigator",   PositionLevel = 1, PositionType = PositionType.INVESTIGATOR, Department = "Fraud Operations", CanApprove = false, IsActive = true };
        var posSup   = new Position { PositionCode = "SUPERVISOR",    PositionName = "Fraud Supervisor",     PositionLevel = 2, PositionType = PositionType.SUPERVISOR,   Department = "Fraud Operations", CanApprove = true,  MaxApprovalAmount = 500000,   IsActive = true };
        var posMgr   = new Position { PositionCode = "MANAGER",       PositionName = "Fraud Manager",        PositionLevel = 3, PositionType = PositionType.MANAGER,      Department = "Fraud Operations", CanApprove = true,  MaxApprovalAmount = 2000000,  IsActive = true };
        var posAnal  = new Position { PositionCode = "ANALYST",       PositionName = "Fraud Analyst",        PositionLevel = 1, PositionType = PositionType.ANALYST,      Department = "Fraud Operations", CanApprove = false, IsActive = true };
        var posComp  = new Position { PositionCode = "COMPLIANCE",    PositionName = "Compliance Officer",   PositionLevel = 3, PositionType = PositionType.COMPLIANCE,   Department = "Compliance",       CanApprove = true,  MaxApprovalAmount = 1000000,  IsActive = true };
        db.Positions.AddRange(posAdmin, posInv, posSup, posMgr, posAnal, posComp);
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // SCREENS
        // ══════════════════════════════════════════════════════════════════════
        var screens = new[]
        {
            new Screen { ScreenCode = "DASHBOARD",        ScreenName = "Dashboard",         ModuleName = "Core",     RouteUrl = "/dashboard",             SortOrder = 1,  IsActive = true },
            new Screen { ScreenCode = "ALERT_LIST",       ScreenName = "Alert Queue",        ModuleName = "Alerts",   RouteUrl = "/alerts",                SortOrder = 2,  IsActive = true },
            new Screen { ScreenCode = "ALERT_DETAIL",     ScreenName = "Alert Detail",       ModuleName = "Alerts",   RouteUrl = "/alerts/:id",            SortOrder = 3,  IsActive = true },
            new Screen { ScreenCode = "CASE_LIST",        ScreenName = "Case Management",    ModuleName = "Cases",    RouteUrl = "/cases",                 SortOrder = 4,  IsActive = true },
            new Screen { ScreenCode = "CASE_DETAIL",      ScreenName = "Case Detail",        ModuleName = "Cases",    RouteUrl = "/cases/:id",             SortOrder = 5,  IsActive = true },
            new Screen { ScreenCode = "RULE_LIST",        ScreenName = "Rule Engine",        ModuleName = "Rules",    RouteUrl = "/rules",                 SortOrder = 6,  IsActive = true },
            new Screen { ScreenCode = "RULE_EDITOR",      ScreenName = "Rule Editor",        ModuleName = "Rules",    RouteUrl = "/rules/editor",          SortOrder = 7,  IsActive = true },
            new Screen { ScreenCode = "APPROVAL_QUEUE",   ScreenName = "Approvals",          ModuleName = "Approval", RouteUrl = "/approvals",             SortOrder = 8,  IsActive = true },
            new Screen { ScreenCode = "CUSTOMER_PROFILE", ScreenName = "Customer 360°",      ModuleName = "Profiling",RouteUrl = "/profiling",             SortOrder = 9,  IsActive = true },
            new Screen { ScreenCode = "REPORTS",          ScreenName = "Reports & MIS",      ModuleName = "Reports",  RouteUrl = "/reports",               SortOrder = 10, IsActive = true },
            new Screen { ScreenCode = "ADMIN_USERS",      ScreenName = "User Management",    ModuleName = "Admin",    RouteUrl = "/admin/users",           SortOrder = 11, IsActive = true },
            new Screen { ScreenCode = "ADMIN_ACCESS",     ScreenName = "Access Matrix",      ModuleName = "Admin",    RouteUrl = "/admin/access",          SortOrder = 12, IsActive = true },
            new Screen { ScreenCode = "APPROVAL_MATRIX",  ScreenName = "Approval Matrix",    ModuleName = "Admin",    RouteUrl = "/admin/approval-matrix", SortOrder = 13, IsActive = true },
        };
        db.Screens.AddRange(screens);

        // ══════════════════════════════════════════════════════════════════════
        // PERMISSIONS
        // ══════════════════════════════════════════════════════════════════════
        var permView   = new Permission { PermissionCode = "VIEW",   PermissionName = "View",   IsDataWrite = false };
        var permCreate = new Permission { PermissionCode = "CREATE", PermissionName = "Create", IsDataWrite = true  };
        var permEdit   = new Permission { PermissionCode = "EDIT",   PermissionName = "Edit",   IsDataWrite = true  };
        var permDelete = new Permission { PermissionCode = "DELETE", PermissionName = "Delete", IsDataWrite = true  };
        var permExport = new Permission { PermissionCode = "EXPORT", PermissionName = "Export", IsDataWrite = false };
        db.Permissions.AddRange(permView, permCreate, permEdit, permDelete, permExport);
        await db.SaveChangesAsync();

        // Helper: grant a set of permissions on all provided screens for a position
        void Grant(Position pos, IEnumerable<Screen> scr, params Permission[] perms)
        {
            foreach (var s in scr)
                foreach (var p in perms)
                    db.PositionScreenPermissions.Add(new PositionScreenPermission { PositionId = pos.PositionId, ScreenId = s.ScreenId, PermissionId = p.PermissionId, IsGranted = true });
        }

        // SYS_ADMIN — all screens, all permissions
        Grant(posAdmin, screens, permView, permCreate, permEdit, permDelete, permExport);

        // INVESTIGATOR — ops screens
        var invScreens = screens.Where(s => new[] { "DASHBOARD","ALERT_LIST","ALERT_DETAIL","CASE_LIST","CASE_DETAIL","CUSTOMER_PROFILE","REPORTS" }.Contains(s.ScreenCode));
        Grant(posInv, invScreens, permView, permCreate, permEdit, permExport);

        // SUPERVISOR — ops + approval + rule view/create/edit
        var supScreens = screens.Where(s => new[] { "DASHBOARD","ALERT_LIST","ALERT_DETAIL","CASE_LIST","CASE_DETAIL","APPROVAL_QUEUE","RULE_LIST","CUSTOMER_PROFILE","REPORTS" }.Contains(s.ScreenCode));
        Grant(posSup, supScreens, permView, permCreate, permEdit, permExport);

        // MANAGER — all except system admin screens
        var mgrScreens = screens.Where(s => new[] { "DASHBOARD","ALERT_LIST","ALERT_DETAIL","CASE_LIST","CASE_DETAIL","APPROVAL_QUEUE","RULE_LIST","RULE_EDITOR","CUSTOMER_PROFILE","REPORTS","ADMIN_USERS","APPROVAL_MATRIX" }.Contains(s.ScreenCode));
        Grant(posMgr, mgrScreens, permView, permCreate, permEdit, permDelete, permExport);

        // ANALYST — read + export only
        var analScreens = screens.Where(s => new[] { "DASHBOARD","ALERT_LIST","ALERT_DETAIL","CASE_LIST","CASE_DETAIL","CUSTOMER_PROFILE","REPORTS" }.Contains(s.ScreenCode));
        Grant(posAnal, analScreens, permView, permExport);

        // COMPLIANCE — all screens, view + export
        Grant(posComp, screens, permView, permExport);

        // ══════════════════════════════════════════════════════════════════════
        // PERSONS  (all additional test users share password: Admin@2026!)
        // ══════════════════════════════════════════════════════════════════════
        var admin = new Person { EmployeeCode = "EMP001", FullName = "System Administrator",   Email = "admin@upgb.in",       LdapUserName = "admin",      PasswordHash = "$2b$12$CnvDA8I5deyEjWPgJl3R3uLeIzaLBVahkTrkXZUSw.HQQ7KGxYvZ2", IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var fraud = new Person { EmployeeCode = "EMP002", FullName = "Fraud Investigator",     Email = "fraud@upgb.in",       LdapUserName = "fraud",      PasswordHash = "$2b$12$HaFVmqm2GgitpsOl7Vl4NO9FCG.Y8bftWNCMx9vsi60oYYimLdOby", IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pSup  = new Person { EmployeeCode = "EMP003", FullName = "Ramesh Kumar Sharma",    Email = "supervisor@upgb.in",  LdapUserName = "rsharma",    PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pMgr  = new Person { EmployeeCode = "EMP004", FullName = "Priya Singh",            Email = "manager@upgb.in",     LdapUserName = "psingh",     PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pInv2 = new Person { EmployeeCode = "EMP005", FullName = "Ankit Gupta",            Email = "inv2@upgb.in",        LdapUserName = "agupta",     PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pInv3 = new Person { EmployeeCode = "EMP006", FullName = "Sunita Devi",            Email = "inv3@upgb.in",        LdapUserName = "sdevi",      PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pAnal = new Person { EmployeeCode = "EMP007", FullName = "Rajiv Verma",            Email = "analyst@upgb.in",     LdapUserName = "rverma",     PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pComp = new Person { EmployeeCode = "EMP008", FullName = "Meena Patel",            Email = "compliance@upgb.in",  LdapUserName = "mpatel",     PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pInv4 = new Person { EmployeeCode = "EMP009", FullName = "Vivek Tiwari",           Email = "inv4@upgb.in",        LdapUserName = "vtiwari",    PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        var pInv5 = new Person { EmployeeCode = "EMP010", FullName = "Deepika Mishra",         Email = "inv5@upgb.in",        LdapUserName = "dmishra",    PasswordHash = TestHash, IsActive = true, IsMfaEnabled = false, CreatedAt = now, UpdatedAt = now };
        db.Persons.AddRange(admin, fraud, pSup, pMgr, pInv2, pInv3, pAnal, pComp, pInv4, pInv5);
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // PERSON-POSITION-LOCATION ASSIGNMENTS
        // ══════════════════════════════════════════════════════════════════════
        db.PersonPositionLocations.AddRange(
            new PersonPositionLocation { PersonId = admin.PersonId, PositionId = posAdmin.PositionId, LocationId = ho.LocationId,     IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = fraud.PersonId, PositionId = posInv.PositionId,   LocationId = ho.LocationId,     IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pSup.PersonId,  PositionId = posSup.PositionId,   LocationId = ho.LocationId,     IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pMgr.PersonId,  PositionId = posMgr.PositionId,   LocationId = ho.LocationId,     IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pInv2.PersonId, PositionId = posInv.PositionId,   LocationId = brVar01.LocationId,IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pInv3.PersonId, PositionId = posInv.PositionId,   LocationId = brAgr01.LocationId,IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pAnal.PersonId, PositionId = posAnal.PositionId,  LocationId = ho.LocationId,     IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pComp.PersonId, PositionId = posComp.PositionId,  LocationId = ho.LocationId,     IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pInv4.PersonId, PositionId = posInv.PositionId,   LocationId = brLko01.LocationId,IsPrimary = true, EffectiveFrom = today },
            new PersonPositionLocation { PersonId = pInv5.PersonId, PositionId = posSup.PositionId,   LocationId = roVar.LocationId,  IsPrimary = true, EffectiveFrom = today }
        );

        // ══════════════════════════════════════════════════════════════════════
        // FRAUD RULES  (10 total)
        // ══════════════════════════════════════════════════════════════════════
        db.FraudRules.AddRange(
            new FraudRule { RuleCode = "HVT_001", RuleName = "High Value Transaction",          RuleCategory = "THRESHOLD",  Channel = "ALL",  RuleDefinition = """{"type":"THRESHOLD","field":"amount","operator":"gt","value":100000}""",                         ScoreWeight = 70, Action = "ALERT",    Priority = 10, IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-30), EffectiveFrom = now.AddDays(-90) },
            new FraudRule { RuleCode = "RST_001", RuleName = "Rapid Succession Transactions",   RuleCategory = "VELOCITY",   Channel = "UPI",  RuleDefinition = """{"type":"VELOCITY","count":3,"windowMinutes":5}""",                                             ScoreWeight = 80, Action = "ALERT",    Priority = 20, IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-30), EffectiveFrom = now.AddDays(-90) },
            new FraudRule { RuleCode = "NTX_001", RuleName = "Night-Hour Transaction",          RuleCategory = "TEMPORAL",   Channel = "ALL",  RuleDefinition = """{"type":"TEMPORAL","startHour":23,"endHour":4,"minAmount":10000}""",                            ScoreWeight = 45, Action = "SCORE",    Priority = 50, IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-20) },
            new FraudRule { RuleCode = "IPG_001", RuleName = "International IP – Domestic Txn", RuleCategory = "GEO",        Channel = "NEFT", RuleDefinition = """{"type":"GEO","ipCountryNotIn":["IN"],"transactionCountry":"IN"}""",                            ScoreWeight = 90, Action = "BLOCK",    Priority = 5,  IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-15) },
            new FraudRule { RuleCode = "FUP_001", RuleName = "First UPI to New Beneficiary",    RuleCategory = "BEHAVIOURAL",Channel = "UPI",  RuleDefinition = """{"type":"FIRST_TXN","channel":"UPI","minAmount":50000}""",                                      ScoreWeight = 55, Action = "SCORE",    Priority = 40, IsActive = true, CreatedBy = fraud.PersonId, CreatedAt = now, UpdatedAt = now },
            new FraudRule { RuleCode = "DRM_001", RuleName = "Dormant Account Reactivation",    RuleCategory = "ACCOUNT",    Channel = "ALL",  RuleDefinition = """{"type":"DORMANCY","dormantDays":180,"txnAmountGt":5000}""",                                    ScoreWeight = 60, Action = "ALERT",    Priority = 35, IsActive = true, CreatedBy = fraud.PersonId, CreatedAt = now, UpdatedAt = now },
            new FraudRule { RuleCode = "PIN_001", RuleName = "Multiple Failed PIN Attempts",     RuleCategory = "AUTH",       Channel = "ATM",  RuleDefinition = """{"type":"FAILED_AUTH","maxAttempts":3,"windowMinutes":15}""",                                   ScoreWeight = 85, Action = "BLOCK",    Priority = 8,  IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-10) },
            new FraudRule { RuleCode = "SIM_001", RuleName = "SIM Swap Pattern",                RuleCategory = "IDENTITY",   Channel = "IMPS", RuleDefinition = """{"type":"SIM_SWAP","txnWithin72HrsOfSimChange":true,"minAmount":10000}""",                       ScoreWeight = 95, Action = "BLOCK",    Priority = 3,  IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-5) },
            new FraudRule { RuleCode = "RND_001", RuleName = "Round-Amount Transaction Pattern", RuleCategory = "BEHAVIOURAL",Channel = "ALL",  RuleDefinition = """{"type":"ROUND_AMT","roundAmtCount":3,"windowHours":6}""",                                     ScoreWeight = 40, Action = "SCORE",    Priority = 70, IsActive = true, CreatedBy = pAnal.PersonId, CreatedAt = now, UpdatedAt = now },
            new FraudRule { RuleCode = "MUL_001", RuleName = "Multiple Location Transactions",   RuleCategory = "GEO",        Channel = "POS",  RuleDefinition = """{"type":"MULTI_GEO","distinctCitiesCount":3,"windowHours":1,"minAmount":500}""",                ScoreWeight = 75, Action = "ALERT",    Priority = 15, IsActive = true, CreatedBy = admin.PersonId, CreatedAt = now, UpdatedAt = now, ApprovedBy = pMgr.PersonId, ApprovedAt = now.AddDays(-25) }
        );
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // WATCHLIST  (10 entries)
        // ══════════════════════════════════════════════════════════════════════
        db.Watchlists.AddRange(
            new Watchlist { EntityType = "ACCOUNT",  EntityValue = "9876543210001234", WatchlistType = "BLACKLIST",    Reason = "Confirmed mule account – Case CASE-00003",              Source = "INTERNAL", AddedBy = pSup.PersonId,  AddedAt = now.AddDays(-45), IsActive = true },
            new Watchlist { EntityType = "ACCOUNT",  EntityValue = "9123456780009876", WatchlistType = "SUSPICIOUS",   Reason = "High-value rapid transfers, under investigation",         Source = "INTERNAL", AddedBy = fraud.PersonId, AddedAt = now.AddDays(-30), IsActive = true },
            new Watchlist { EntityType = "CUSTOMER", EntityValue = "CUST-UP-00781234", WatchlistType = "PEP",          Reason = "Politically Exposed Person – local government official",  Source = "RBI_LIST", AddedBy = pComp.PersonId, AddedAt = now.AddDays(-90), IsActive = true },
            new Watchlist { EntityType = "CUSTOMER", EntityValue = "CUST-UP-00234567", WatchlistType = "FRAUD",        Reason = "Identity theft victim – account compromised",             Source = "INTERNAL", AddedBy = pSup.PersonId,  AddedAt = now.AddDays(-15), IsActive = true },
            new Watchlist { EntityType = "DEVICE",   EntityValue = "IMEI:354678901234561", WatchlistType = "BLACKLIST", Reason = "Device linked to multiple SIM swap fraud attempts",     Source = "INTERNAL", AddedBy = admin.PersonId, AddedAt = now.AddDays(-60), IsActive = true },
            new Watchlist { EntityType = "IP",       EntityValue = "185.220.101.47",    WatchlistType = "FRAUD",        Reason = "Tor exit node – used in BEC attack",                    Source = "THREAT_INT",AddedBy = admin.PersonId, AddedAt = now.AddDays(-20), IsActive = true },
            new Watchlist { EntityType = "MOBILE",   EntityValue = "9999988888",         WatchlistType = "SUSPICIOUS",  Reason = "Linked to phishing campaign targeting UPGB customers",  Source = "INTERNAL", AddedBy = pSup.PersonId,  AddedAt = now.AddDays(-10), IsActive = true },
            new Watchlist { EntityType = "ACCOUNT",  EntityValue = "7654321098765432", WatchlistType = "FRAUD",         Reason = "ATM skimming proceeds recipient",                       Source = "INTERNAL", AddedBy = fraud.PersonId, AddedAt = now.AddDays(-50), IsActive = true },
            new Watchlist { EntityType = "CUSTOMER", EntityValue = "CUST-UP-00889012", WatchlistType = "NEGATIVE",      Reason = "Loan default with fraud indicator",                     Source = "CIBIL",    AddedBy = pComp.PersonId, AddedAt = now.AddDays(-120),IsActive = true },
            new Watchlist { EntityType = "DEVICE",   EntityValue = "IMEI:869765043218764",WatchlistType = "SUSPICIOUS", Reason = "Device registered on 4 different mobile banking accounts", Source = "INTERNAL", AddedBy = pInv4.PersonId, AddedAt = now.AddDays(-7), IsActive = true, ExpiresAt = now.AddDays(83) }
        );
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // DOCUMENT TYPES + APPROVAL STAGES + APPROVAL MATRIX
        // ══════════════════════════════════════════════════════════════════════
        var dtRule    = new DocumentType { DocTypeCode = "RULE_CHG",    DocTypeName = "Fraud Rule Change",          Category = "RULES",      Description = "Change to fraud detection rule parameters",       MaxAmountLimit = null,   IsActive = true };
        var dtClosure = new DocumentType { DocTypeCode = "CASE_CLOSE",  DocTypeName = "Case Closure",               Category = "CASES",      Description = "Formal closure of a fraud investigation case",    MaxAmountLimit = null,   IsActive = true };
        var dtBulk    = new DocumentType { DocTypeCode = "BULK_CLOSE",  DocTypeName = "Bulk Alert Closure",         Category = "ALERTS",     Description = "Mass closure of false-positive alerts",           MaxAmountLimit = null,   IsActive = true };
        var dtAssign  = new DocumentType { DocTypeCode = "INV_ASSIGN",  DocTypeName = "Investigator Assignment",    Category = "ADMIN",      Description = "Assignment of investigator to case or alert",      MaxAmountLimit = null,   IsActive = true };
        var dtWriteOff= new DocumentType { DocTypeCode = "WRITEOFF",    DocTypeName = "Fraud Write-Off Approval",   Category = "FINANCE",    Description = "Approval for writing off confirmed fraud losses",  MaxAmountLimit = 500000, IsActive = true };
        db.DocumentTypes.AddRange(dtRule, dtClosure, dtBulk, dtAssign, dtWriteOff);
        await db.SaveChangesAsync();

        // Approval stages — 2 stages per doc type (Supervisor → Manager)
        var stRuleS1  = new ApprovalStage { DocTypeId = dtRule.DocTypeId,    DocType = dtRule,     StageNumber = 1, StageName = "Supervisor Review",  ApproverPositionId = posSup.PositionId, RequiresLocationMatch = true,  IsMandatory = true, TimeoutHours = 24, OnTimeoutAction = "ESCALATE", IsActive = true };
        var stRuleS2  = new ApprovalStage { DocTypeId = dtRule.DocTypeId,    DocType = dtRule,     StageNumber = 2, StageName = "Manager Approval",   ApproverPositionId = posMgr.PositionId, RequiresLocationMatch = false, IsMandatory = true, TimeoutHours = 48, OnTimeoutAction = "REJECT",   IsActive = true };
        var stCloseS1 = new ApprovalStage { DocTypeId = dtClosure.DocTypeId, DocType = dtClosure,  StageNumber = 1, StageName = "Supervisor Review",  ApproverPositionId = posSup.PositionId, RequiresLocationMatch = true,  IsMandatory = true, TimeoutHours = 24, OnTimeoutAction = "ESCALATE", IsActive = true };
        var stCloseS2 = new ApprovalStage { DocTypeId = dtClosure.DocTypeId, DocType = dtClosure,  StageNumber = 2, StageName = "Compliance Sign-Off",ApproverPositionId = posComp.PositionId,RequiresLocationMatch = false, IsMandatory = true, TimeoutHours = 48, OnTimeoutAction = "ESCALATE", IsActive = true };
        var stBulkS1  = new ApprovalStage { DocTypeId = dtBulk.DocTypeId,    DocType = dtBulk,     StageNumber = 1, StageName = "Manager Approval",   ApproverPositionId = posMgr.PositionId, RequiresLocationMatch = false, IsMandatory = true, TimeoutHours = 12, OnTimeoutAction = "REJECT",   IsActive = true };
        var stAssignS1= new ApprovalStage { DocTypeId = dtAssign.DocTypeId,  DocType = dtAssign,   StageNumber = 1, StageName = "Supervisor Approval",ApproverPositionId = posSup.PositionId, RequiresLocationMatch = true,  IsMandatory = true, TimeoutHours = 8,  OnTimeoutAction = "ESCALATE", IsActive = true };
        var stWriteS1 = new ApprovalStage { DocTypeId = dtWriteOff.DocTypeId,DocType = dtWriteOff, StageNumber = 1, StageName = "Manager Review",     ApproverPositionId = posMgr.PositionId, RequiresLocationMatch = false, IsMandatory = true, TimeoutHours = 24, OnTimeoutAction = "ESCALATE", IsActive = true };
        var stWriteS2 = new ApprovalStage { DocTypeId = dtWriteOff.DocTypeId,DocType = dtWriteOff, StageNumber = 2, StageName = "Compliance Approval",ApproverPositionId = posComp.PositionId,RequiresLocationMatch = false, IsMandatory = true, TimeoutHours = 48, OnTimeoutAction = "REJECT",   IsActive = true };
        db.ApprovalStages.AddRange(stRuleS1, stRuleS2, stCloseS1, stCloseS2, stBulkS1, stAssignS1, stWriteS1, stWriteS2);
        await db.SaveChangesAsync();

        // Approval Matrix
        var validFrom = today.AddDays(-180);
        db.ApprovalMatrices.AddRange(
            new ApprovalMatrix { DocTypeId = dtRule.DocTypeId,     DocType = dtRule,     PositionId = posSup.PositionId,  Position = posSup,  CanApprove = true, MaxApprovalAmount = null,   ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtRule.DocTypeId,     DocType = dtRule,     PositionId = posMgr.PositionId,  Position = posMgr,  CanApprove = true, MaxApprovalAmount = null,   ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtClosure.DocTypeId,  DocType = dtClosure,  PositionId = posSup.PositionId,  Position = posSup,  CanApprove = true, MaxApprovalAmount = null,   ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtClosure.DocTypeId,  DocType = dtClosure,  PositionId = posComp.PositionId, Position = posComp, CanApprove = true, MaxApprovalAmount = null,   ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtBulk.DocTypeId,     DocType = dtBulk,     PositionId = posMgr.PositionId,  Position = posMgr,  CanApprove = true, MaxApprovalAmount = null,   ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtAssign.DocTypeId,   DocType = dtAssign,   PositionId = posSup.PositionId,  Position = posSup,  CanApprove = true, MaxApprovalAmount = null,   ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtWriteOff.DocTypeId, DocType = dtWriteOff, PositionId = posMgr.PositionId,  Position = posMgr,  CanApprove = true, MaxApprovalAmount = 2000000, ValidFrom = validFrom, IsActive = true },
            new ApprovalMatrix { DocTypeId = dtWriteOff.DocTypeId, DocType = dtWriteOff, PositionId = posComp.PositionId, Position = posComp, CanApprove = true, MaxApprovalAmount = 1000000, ValidFrom = validFrom, IsActive = true }
        );
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // ALERTS  (10)
        // ══════════════════════════════════════════════════════════════════════
        var alerts = new[]
        {
            new Alert { Channel = "UPI",  RiskScore = 87, RiskLevel = "CRITICAL", Status = AlertStatus.OPEN,             TransactionTimestamp = now.AddHours(-2),   TransactionAmount = 149500,  TransactionCurrency = "INR", CustomerId = "CUST-UP-00112233", AccountNumber = "3301234567890001", FraudType = "UPI_SCAM",           CustomerNotified = true,  CustomerNotifiedAt = now.AddHours(-1.5),  AssignedToPersonId = fraud.PersonId, AssignedAt = now.AddHours(-2),   LocationId = ho.LocationId,     CreatedAt = now.AddHours(-2),   UpdatedAt = now.AddHours(-1.5),  SlaBreachAt = now.AddHours(22),  IsSlaBreach = false, ReasonCodes = """["RST_001","HVT_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.87}""" },
            new Alert { Channel = "NEFT", RiskScore = 73, RiskLevel = "HIGH",     Status = AlertStatus.IN_INVESTIGATION, TransactionTimestamp = now.AddHours(-5),   TransactionAmount = 500000,  TransactionCurrency = "INR", CustomerId = "CUST-UP-00445566", AccountNumber = "3301234567890002", FraudType = "UNAUTHORIZED_TRANSFER",  CustomerNotified = true,  CustomerNotifiedAt = now.AddHours(-4.5),  AssignedToPersonId = pInv2.PersonId, AssignedAt = now.AddHours(-4.5), LocationId = brVar01.LocationId, CreatedAt = now.AddHours(-5),   UpdatedAt = now.AddHours(-3),    SlaBreachAt = now.AddHours(19),  IsSlaBreach = false, ReasonCodes = """["HVT_001","DRM_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.73}""" },
            new Alert { Channel = "ATM",  RiskScore = 91, RiskLevel = "CRITICAL", Status = AlertStatus.ESCALATED,        TransactionTimestamp = now.AddHours(-8),   TransactionAmount = 80000,   TransactionCurrency = "INR", CustomerId = "CUST-UP-00778899", AccountNumber = "3301234567890003", FraudType = "CARD_SKIMMING",          CustomerNotified = true,  CustomerNotifiedAt = now.AddHours(-7.5),  AssignedToPersonId = pSup.PersonId,  AssignedAt = now.AddHours(-7.5), LocationId = brLko01.LocationId, CreatedAt = now.AddHours(-8),   UpdatedAt = now.AddHours(-2),    SlaBreachAt = now.AddHours(-0.5),IsSlaBreach = true,  EscalatedToPersonId = pMgr.PersonId, EscalatedAt = now.AddHours(-1), ReasonCodes = """["PIN_001","MUL_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.91}""" },
            new Alert { Channel = "POS",  RiskScore = 48, RiskLevel = "MEDIUM",   Status = AlertStatus.OPEN,             TransactionTimestamp = now.AddHours(-12),  TransactionAmount = 15000,   TransactionCurrency = "INR", CustomerId = "CUST-UP-00334455", AccountNumber = "3301234567890004", FraudType = "CARD_NOT_PRESENT",       CustomerNotified = false,                                           AssignedToPersonId = fraud.PersonId, AssignedAt = now.AddHours(-11.5),LocationId = ho.LocationId,     CreatedAt = now.AddHours(-12),  UpdatedAt = now.AddHours(-11.5), SlaBreachAt = now.AddHours(12),  IsSlaBreach = false, ReasonCodes = """["NTX_001"]""",           ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.48}""" },
            new Alert { Channel = "IMPS", RiskScore = 62, RiskLevel = "HIGH",     Status = AlertStatus.OPEN,             TransactionTimestamp = now.AddHours(-3),   TransactionAmount = 75000,   TransactionCurrency = "INR", CustomerId = "CUST-UP-00556677", AccountNumber = "3301234567890005", FraudType = "SIM_SWAP",               CustomerNotified = true,  CustomerNotifiedAt = now.AddHours(-2.8),  AssignedToPersonId = pInv4.PersonId, AssignedAt = now.AddHours(-2.5), LocationId = brLko01.LocationId, CreatedAt = now.AddHours(-3),   UpdatedAt = now.AddHours(-2.5),  SlaBreachAt = now.AddHours(21),  IsSlaBreach = false, ReasonCodes = """["SIM_001","FUP_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.62}""" },
            new Alert { Channel = "UPI",  RiskScore = 96, RiskLevel = "CRITICAL", Status = AlertStatus.CLOSED_TP,        TransactionTimestamp = now.AddDays(-2),    TransactionAmount = 230000,  TransactionCurrency = "INR", CustomerId = "CUST-UP-00112345", AccountNumber = "3301234567890006", FraudType = "PHISHING",               CustomerNotified = true,  CustomerNotifiedAt = now.AddDays(-2).AddHours(0.5), AssignedToPersonId = fraud.PersonId, AssignedAt = now.AddDays(-2).AddHours(1), LocationId = ho.LocationId, CreatedAt = now.AddDays(-2), UpdatedAt = now.AddDays(-1), ClosedAt = now.AddDays(-1), ClosedBy = pSup.PersonId, ClosureNotes = "Confirmed phishing – customer reimbursed via insurance claim", SlaBreachAt = now.AddDays(-1), IsSlaBreach = false, ReasonCodes = """["IPG_001","HVT_001","RST_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.96}""" },
            new Alert { Channel = "NEFT", RiskScore = 55, RiskLevel = "MEDIUM",   Status = AlertStatus.IN_INVESTIGATION, TransactionTimestamp = now.AddDays(-1),    TransactionAmount = 200000,  TransactionCurrency = "INR", CustomerId = "CUST-UP-00998877", AccountNumber = "3301234567890007", FraudType = "DORMANT_REACTIVATION",   CustomerNotified = false,                                           AssignedToPersonId = pInv2.PersonId, AssignedAt = now.AddDays(-1).AddHours(1), LocationId = brVar01.LocationId, CreatedAt = now.AddDays(-1), UpdatedAt = now.AddDays(-1).AddHours(2), SlaBreachAt = now.AddHours(23), IsSlaBreach = false, ReasonCodes = """["DRM_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.55}""" },
            new Alert { Channel = "ATM",  RiskScore = 79, RiskLevel = "HIGH",     Status = AlertStatus.OPEN,             TransactionTimestamp = now.AddHours(-1),   TransactionAmount = 50000,   TransactionCurrency = "INR", CustomerId = "CUST-UP-00667788", AccountNumber = "3301234567890008", FraudType = "CASH_OUT_FRAUD",         CustomerNotified = true,  CustomerNotifiedAt = now.AddMinutes(-40), AssignedToPersonId = pInv5.PersonId, AssignedAt = now.AddMinutes(-50), LocationId = roVar.LocationId, CreatedAt = now.AddHours(-1), UpdatedAt = now.AddMinutes(-50), SlaBreachAt = now.AddHours(23), IsSlaBreach = false, ReasonCodes = """["PIN_001","NTX_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.79}""" },
            new Alert { Channel = "UPI",  RiskScore = 83, RiskLevel = "CRITICAL", Status = AlertStatus.ESCALATED,        TransactionTimestamp = now.AddHours(-6),   TransactionAmount = 95000,   TransactionCurrency = "INR", CustomerId = "CUST-UP-00321654", AccountNumber = "3301234567890009", FraudType = "UPI_VELOCITY_BREACH",    CustomerNotified = true,  CustomerNotifiedAt = now.AddHours(-5.5),  AssignedToPersonId = pSup.PersonId,  AssignedAt = now.AddHours(-5.5), LocationId = ho.LocationId,     CreatedAt = now.AddHours(-6),   UpdatedAt = now.AddHours(-2),    SlaBreachAt = now.AddHours(-0.2),IsSlaBreach = true,  EscalatedToPersonId = pMgr.PersonId, EscalatedAt = now.AddHours(-1.5), ReasonCodes = """["RST_001","FUP_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.83}""" },
            new Alert { Channel = "RTGS", RiskScore = 32, RiskLevel = "LOW",      Status = AlertStatus.CLOSED_FP,        TransactionTimestamp = now.AddDays(-3),    TransactionAmount = 2000000, TransactionCurrency = "INR", CustomerId = "CUST-UP-00543210", AccountNumber = "3301234567890010", FraudType = "HVT",                    CustomerNotified = false,                                           AssignedToPersonId = fraud.PersonId, AssignedAt = now.AddDays(-3).AddHours(2), LocationId = ho.LocationId, CreatedAt = now.AddDays(-3), UpdatedAt = now.AddDays(-2), ClosedAt = now.AddDays(-2), ClosedBy = fraud.PersonId, ClosureNotes = "Verified legitimate RTGS – corporate salary disbursement. Customer confirmed.", SlaBreachAt = now.AddDays(-1), IsSlaBreach = false, ReasonCodes = """["HVT_001"]""", ModelOutputs = """{"model":"XGBoost_v3","prob_fraud":0.32}""" }
        };
        db.Alerts.AddRange(alerts);
        await db.SaveChangesAsync();

        // Alert notes
        db.AlertNotes.AddRange(
            new AlertNote { AlertId = alerts[0].AlertId, Note = "Customer called in – states they did not initiate the UPI transfer. Blocking account temporarily.", CreatedBy = fraud.PersonId, CreatedAt = now.AddHours(-1.5) },
            new AlertNote { AlertId = alerts[0].AlertId, Note = "Transaction traced to a phishing link shared via WhatsApp group. Escalating to cyber cell.", CreatedBy = pSup.PersonId, CreatedAt = now.AddHours(-1) },
            new AlertNote { AlertId = alerts[1].AlertId, Note = "NEFT beneficiary account flagged in watchlist. Hold placed on outgoing transactions.", CreatedBy = pInv2.PersonId, CreatedAt = now.AddHours(-4) },
            new AlertNote { AlertId = alerts[2].AlertId, Note = "ATM CCTV footage requested from BR_LKO01. Three separate withdrawals using cloned card.", CreatedBy = pSup.PersonId, CreatedAt = now.AddHours(-6) },
            new AlertNote { AlertId = alerts[2].AlertId, Note = "Escalated to manager – SLA breach imminent. Referred to local police station for FIR.", CreatedBy = pSup.PersonId, CreatedAt = now.AddHours(-1) },
            new AlertNote { AlertId = alerts[4].AlertId, Note = "SIM swap confirmed with telecom operator. New SIM issued 3 hours before transaction.", CreatedBy = pInv4.PersonId, CreatedAt = now.AddHours(-2) },
            new AlertNote { AlertId = alerts[5].AlertId, Note = "Alert closed as True Positive. Customer compensated ₹2,30,000 via fraud insurance.", CreatedBy = fraud.PersonId, CreatedAt = now.AddDays(-1) },
            new AlertNote { AlertId = alerts[8].AlertId, Note = "Velocity rule triggered – 7 UPI transactions in 12 minutes totalling ₹95,000.", CreatedBy = pSup.PersonId, CreatedAt = now.AddHours(-5) }
        );

        // Alert reason codes
        db.AlertReasonCodes.AddRange(
            new AlertReasonCode { AlertId = alerts[0].AlertId, ReasonCode = "RST_001", ReasonDesc = "3 UPI txns within 5 minutes", FeatureValue = "3",     ShapValue = 0.42m, SortOrder = 1 },
            new AlertReasonCode { AlertId = alerts[0].AlertId, ReasonCode = "HVT_001", ReasonDesc = "Amount ₹1,49,500 exceeds ₹1,00,000 threshold", FeatureValue = "149500", ShapValue = 0.33m, SortOrder = 2 },
            new AlertReasonCode { AlertId = alerts[1].AlertId, ReasonCode = "HVT_001", ReasonDesc = "NEFT ₹5,00,000 exceeds high-value threshold", FeatureValue = "500000", ShapValue = 0.51m, SortOrder = 1 },
            new AlertReasonCode { AlertId = alerts[1].AlertId, ReasonCode = "DRM_001", ReasonDesc = "Account dormant for 220 days before this transfer", FeatureValue = "220", ShapValue = 0.28m, SortOrder = 2 },
            new AlertReasonCode { AlertId = alerts[2].AlertId, ReasonCode = "PIN_001", ReasonDesc = "3 failed PIN attempts before successful withdrawal", FeatureValue = "3", ShapValue = 0.58m, SortOrder = 1 },
            new AlertReasonCode { AlertId = alerts[2].AlertId, ReasonCode = "MUL_001", ReasonDesc = "Transactions at 3 ATMs in different areas within 45 min", FeatureValue = "3", ShapValue = 0.39m, SortOrder = 2 },
            new AlertReasonCode { AlertId = alerts[4].AlertId, ReasonCode = "SIM_001", ReasonDesc = "SIM replaced 2h 47m before IMPS transaction", FeatureValue = "167", ShapValue = 0.71m, SortOrder = 1 },
            new AlertReasonCode { AlertId = alerts[8].AlertId, ReasonCode = "RST_001", ReasonDesc = "7 UPI transactions within 12 minutes", FeatureValue = "7",   ShapValue = 0.63m, SortOrder = 1 },
            new AlertReasonCode { AlertId = alerts[8].AlertId, ReasonCode = "FUP_001", ReasonDesc = "First-time UPI to this VPA above ₹50,000", FeatureValue = "95000", ShapValue = 0.29m, SortOrder = 2 }
        );
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // FRAUD CASES  (10)
        // ══════════════════════════════════════════════════════════════════════
        var cases = new[]
        {
            new FraudCase { CaseTitle = "UPI Phishing Ring – Varanasi Cluster",          CaseType = "UPI_FRAUD",    Status = CaseStatus.INVESTIGATION, Priority = CasePriority.HIGH,     TotalExposureAmount = 724500,  AssignedToPersonId = fraud.PersonId, SupervisorId = pSup.PersonId,  LocationId = ho.LocationId,     OpenedAt = now.AddDays(-5),  CreatedBy = pSup.PersonId,  CreatedAt = now.AddDays(-5),  UpdatedAt = now.AddHours(-3) },
            new FraudCase { CaseTitle = "ATM Skimming Operation – LKO Civil Lines",      CaseType = "ATM_SKIMMING", Status = CaseStatus.INVESTIGATION, Priority = CasePriority.CRITICAL, TotalExposureAmount = 330000,  AssignedToPersonId = pInv4.PersonId, SupervisorId = pSup.PersonId,  LocationId = brLko01.LocationId,OpenedAt = now.AddDays(-3),  CreatedBy = pSup.PersonId,  CreatedAt = now.AddDays(-3),  UpdatedAt = now.AddDays(-1) },
            new FraudCase { CaseTitle = "NEFT Mule Account Network – Agra Region",       CaseType = "MULE_ACCOUNT", Status = CaseStatus.OPEN,          Priority = CasePriority.HIGH,     TotalExposureAmount = 1200000, AssignedToPersonId = pInv3.PersonId, SupervisorId = pInv5.PersonId, LocationId = brAgr01.LocationId,OpenedAt = now.AddDays(-7),  CreatedBy = pMgr.PersonId,  CreatedAt = now.AddDays(-7),  UpdatedAt = now.AddDays(-2) },
            new FraudCase { CaseTitle = "Elderly Customer Phone Fraud – Head Office",     CaseType = "PHONE_FRAUD",  Status = CaseStatus.OPEN,          Priority = CasePriority.HIGH,     TotalExposureAmount = 95000,   AssignedToPersonId = fraud.PersonId, SupervisorId = pSup.PersonId,  LocationId = ho.LocationId,     OpenedAt = now.AddDays(-2),  CreatedBy = fraud.PersonId, CreatedAt = now.AddDays(-2),  UpdatedAt = now.AddDays(-1) },
            new FraudCase { CaseTitle = "Card Cloning Ring – POS Terminals",              CaseType = "CARD_FRAUD",   Status = CaseStatus.INVESTIGATION, Priority = CasePriority.CRITICAL, TotalExposureAmount = 580000,  AssignedToPersonId = pInv5.PersonId, SupervisorId = pInv5.PersonId, LocationId = roVar.LocationId,  OpenedAt = now.AddDays(-10), CreatedBy = pMgr.PersonId,  CreatedAt = now.AddDays(-10), UpdatedAt = now.AddDays(-3) },
            new FraudCase { CaseTitle = "Business Email Compromise – Corporate Accounts", CaseType = "BEC",          Status = CaseStatus.LEGAL_REFERRAL,Priority = CasePriority.HIGH,     TotalExposureAmount = 3500000, AssignedToPersonId = pMgr.PersonId,  SupervisorId = pMgr.PersonId,  LocationId = ho.LocationId,     OpenedAt = now.AddDays(-20), CreatedBy = pMgr.PersonId,  CreatedAt = now.AddDays(-20), UpdatedAt = now.AddDays(-5), SlaBreachAt = now.AddDays(-2) },
            new FraudCase { CaseTitle = "SIM Swap Fraud – Multiple Victims",              CaseType = "SIM_SWAP",     Status = CaseStatus.INVESTIGATION, Priority = CasePriority.HIGH,     TotalExposureAmount = 450000,  AssignedToPersonId = pInv4.PersonId, SupervisorId = pSup.PersonId,  LocationId = brLko01.LocationId,OpenedAt = now.AddDays(-4),  CreatedBy = pSup.PersonId,  CreatedAt = now.AddDays(-4),  UpdatedAt = now.AddDays(-1) },
            new FraudCase { CaseTitle = "KYC Identity Theft – Aadhaar Misuse",           CaseType = "IDENTITY_THEFT",Status = CaseStatus.OPEN,          Priority = CasePriority.MEDIUM,   TotalExposureAmount = 175000,  AssignedToPersonId = pAnal.PersonId, SupervisorId = pSup.PersonId,  LocationId = ho.LocationId,     OpenedAt = now.AddDays(-1),  CreatedBy = fraud.PersonId, CreatedAt = now.AddDays(-1),  UpdatedAt = now.AddDays(-1) },
            new FraudCase { CaseTitle = "Account Takeover – Internet Banking",            CaseType = "ATO",          Status = CaseStatus.CLOSED_TP,     Priority = CasePriority.CRITICAL, TotalExposureAmount = 230000,  AssignedToPersonId = fraud.PersonId, SupervisorId = pSup.PersonId,  LocationId = ho.LocationId,     OpenedAt = now.AddDays(-14), ClosedAt = now.AddDays(-2), CreatedBy = fraud.PersonId, CreatedAt = now.AddDays(-14), UpdatedAt = now.AddDays(-2) },
            new FraudCase { CaseTitle = "Suspected Insider Misuse – Branch Cashier",     CaseType = "INSIDER_FRAUD",Status = CaseStatus.OPEN,          Priority = CasePriority.HIGH,     TotalExposureAmount = 125000,  AssignedToPersonId = pComp.PersonId, SupervisorId = pMgr.PersonId,  LocationId = brVar01.LocationId,OpenedAt = now.AddDays(-6),  CreatedBy = pMgr.PersonId,  CreatedAt = now.AddDays(-6),  UpdatedAt = now.AddDays(-2) }
        };
        db.FraudCases.AddRange(cases);
        await db.SaveChangesAsync();

        // Case notes
        db.CaseNotes.AddRange(
            new CaseNote { CaseId = cases[0].CaseId, NoteType = "INVESTIGATION", Note = "Identified 4 linked UPI VPAs receiving funds. All linked to same device fingerprint.", CreatedBy = fraud.PersonId, CreatedAt = now.AddDays(-4) },
            new CaseNote { CaseId = cases[0].CaseId, NoteType = "ACTION",        Note = "Coordinates shared with Cyber Crime Cell, Lucknow. FIR No. CC/2026/1847 registered.", CreatedBy = pSup.PersonId,  CreatedAt = now.AddDays(-3) },
            new CaseNote { CaseId = cases[1].CaseId, NoteType = "INVESTIGATION", Note = "CCTV footage from ATM confirmed card skimming device installed. Retrieved device for forensics.", CreatedBy = pInv4.PersonId, CreatedAt = now.AddDays(-2) },
            new CaseNote { CaseId = cases[1].CaseId, NoteType = "LEGAL",         Note = "FIR lodged at LKO Civil Lines PS. IO details: Sub-Inspector Rajendra Yadav.", CreatedBy = pSup.PersonId,  CreatedAt = now.AddDays(-1) },
            new CaseNote { CaseId = cases[2].CaseId, NoteType = "INVESTIGATION", Note = "9 mule accounts identified across Agra region. NEFT chain maps to 2 ultimate beneficiaries.", CreatedBy = pInv3.PersonId, CreatedAt = now.AddDays(-5) },
            new CaseNote { CaseId = cases[4].CaseId, NoteType = "INVESTIGATION", Note = "POS terminals at 3 petrol stations in Varanasi found compromised. Vendor notified.", CreatedBy = pInv5.PersonId, CreatedAt = now.AddDays(-8) },
            new CaseNote { CaseId = cases[5].CaseId, NoteType = "LEGAL",         Note = "Matter referred to Economic Offences Wing. Total exposure ₹35,00,000 across 3 corporate accounts.", CreatedBy = pMgr.PersonId, CreatedAt = now.AddDays(-5) },
            new CaseNote { CaseId = cases[8].CaseId, NoteType = "CLOSURE",       Note = "Account restored to customer. Loss of ₹2,30,000 recovered via cyber insurance. Case closed TP.", CreatedBy = fraud.PersonId, CreatedAt = now.AddDays(-2) }
        );

        // Case evidence
        db.CaseEvidence.AddRange(
            new CaseEvidence { CaseId = cases[0].CaseId, EvidenceType = "SCREENSHOT",    FileName = "phishing_whatsapp_link.png", FilePath = "/evidence/CASE-00001/", UploadedBy = fraud.PersonId, UploadedAt = now.AddDays(-4) },
            new CaseEvidence { CaseId = cases[0].CaseId, EvidenceType = "TRANSACTION_LOG",FileName = "upi_chain_export.xlsx",     FilePath = "/evidence/CASE-00001/", UploadedBy = pSup.PersonId,  UploadedAt = now.AddDays(-3) },
            new CaseEvidence { CaseId = cases[1].CaseId, EvidenceType = "CCTV",           FileName = "atm_cctv_20260612.mp4",     FilePath = "/evidence/CASE-00002/", UploadedBy = pInv4.PersonId, UploadedAt = now.AddDays(-2) },
            new CaseEvidence { CaseId = cases[1].CaseId, EvidenceType = "PHYSICAL",        FileName = "skimmer_device_photos.zip", FilePath = "/evidence/CASE-00002/", UploadedBy = pSup.PersonId,  UploadedAt = now.AddDays(-1) },
            new CaseEvidence { CaseId = cases[5].CaseId, EvidenceType = "BANK_STATEMENT",  FileName = "corporate_acct_statements.pdf", FilePath = "/evidence/CASE-00006/", UploadedBy = pMgr.PersonId, UploadedAt = now.AddDays(-6) },
            new CaseEvidence { CaseId = cases[8].CaseId, EvidenceType = "EMAIL",           FileName = "phishing_email_header.eml", FilePath = "/evidence/CASE-00009/", UploadedBy = fraud.PersonId, UploadedAt = now.AddDays(-12) }
        );
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // APPROVAL REQUESTS  (10)
        // ══════════════════════════════════════════════════════════════════════
        var reqs = new[]
        {
            new ApprovalRequest { DocTypeId = dtRule.DocTypeId,    DocType = dtRule,     EntityType = "FraudRule", EntityId = "HVT_001", Amount = null,      RequestedBy = pAnal.PersonId,  RequestedAt = now.AddDays(-3),  LocationId = ho.LocationId,      CurrentStageId = stRuleS2.StageId,  Status = ApprovalRequestStatus.IN_REVIEW,  Comments = "Proposing threshold increase to ₹2,50,000 for corporate accounts" },
            new ApprovalRequest { DocTypeId = dtClosure.DocTypeId, DocType = dtClosure,  EntityType = "FraudCase", EntityId = "CASE-9",  Amount = 230000,    RequestedBy = fraud.PersonId,  RequestedAt = now.AddDays(-2),  LocationId = ho.LocationId,      CurrentStageId = stCloseS2.StageId, Status = ApprovalRequestStatus.IN_REVIEW,  Comments = "Case closed TP – all recoveries done. Requesting formal closure." },
            new ApprovalRequest { DocTypeId = dtBulk.DocTypeId,    DocType = dtBulk,     EntityType = "AlertBatch",EntityId = "BATCH-20260610", Amount = null, RequestedBy = pInv2.PersonId, RequestedAt = now.AddDays(-5),  LocationId = brVar01.LocationId, CurrentStageId = null,              Status = ApprovalRequestStatus.APPROVED,   Comments = "Bulk close 45 low-risk POS alerts from June 10", FinalizedAt = now.AddDays(-4), FinalizedBy = pMgr.PersonId },
            new ApprovalRequest { DocTypeId = dtAssign.DocTypeId,  DocType = dtAssign,   EntityType = "FraudCase", EntityId = "CASE-4",  Amount = null,      RequestedBy = pSup.PersonId,   RequestedAt = now.AddDays(-1),  LocationId = ho.LocationId,      CurrentStageId = stAssignS1.StageId,Status = ApprovalRequestStatus.PENDING,    Comments = "Re-assigning Case-4 from EMP002 to EMP007 (capacity rebalance)" },
            new ApprovalRequest { DocTypeId = dtWriteOff.DocTypeId,DocType = dtWriteOff, EntityType = "FraudCase", EntityId = "CASE-6",  Amount = 350000,    RequestedBy = pMgr.PersonId,   RequestedAt = now.AddDays(-8),  LocationId = ho.LocationId,      CurrentStageId = null,              Status = ApprovalRequestStatus.APPROVED,   Comments = "BEC write-off ₹3,50,000 – insurance partially covers. Net write-off.", FinalizedAt = now.AddDays(-5), FinalizedBy = pComp.PersonId },
            new ApprovalRequest { DocTypeId = dtRule.DocTypeId,    DocType = dtRule,     EntityType = "FraudRule", EntityId = "SIM_001", Amount = null,      RequestedBy = fraud.PersonId,  RequestedAt = now.AddDays(-1),  LocationId = ho.LocationId,      CurrentStageId = stRuleS1.StageId,  Status = ApprovalRequestStatus.PENDING,    Comments = "Requesting SIM_001 rule to trigger for all channels, not just IMPS" },
            new ApprovalRequest { DocTypeId = dtClosure.DocTypeId, DocType = dtClosure,  EntityType = "FraudCase", EntityId = "CASE-8",  Amount = 175000,    RequestedBy = pAnal.PersonId,  RequestedAt = now.AddHours(-6), LocationId = ho.LocationId,      CurrentStageId = stCloseS1.StageId, Status = ApprovalRequestStatus.PENDING,    Comments = "Investigation complete – KYC fraud documented, referring to UIDAI" },
            new ApprovalRequest { DocTypeId = dtBulk.DocTypeId,    DocType = dtBulk,     EntityType = "AlertBatch",EntityId = "BATCH-20260601", Amount = null, RequestedBy = pInv3.PersonId, RequestedAt = now.AddDays(-14), LocationId = brAgr01.LocationId, CurrentStageId = null,              Status = ApprovalRequestStatus.REJECTED,   Comments = "Bulk closure request for June 1 NEFT alerts", FinalizedAt = now.AddDays(-13), FinalizedBy = pMgr.PersonId },
            new ApprovalRequest { DocTypeId = dtWriteOff.DocTypeId,DocType = dtWriteOff, EntityType = "FraudCase", EntityId = "CASE-3",  Amount = 120000,    RequestedBy = pInv3.PersonId,  RequestedAt = now.AddDays(-3),  LocationId = brAgr01.LocationId, CurrentStageId = stWriteS2.StageId, Status = ApprovalRequestStatus.IN_REVIEW,  Comments = "Partial write-off – mule account funds unrecoverable" },
            new ApprovalRequest { DocTypeId = dtAssign.DocTypeId,  DocType = dtAssign,   EntityType = "Alert",     EntityId = "ALT-00009", Amount = null,    RequestedBy = pSup.PersonId,   RequestedAt = now.AddHours(-3), LocationId = ho.LocationId,      CurrentStageId = null,              Status = ApprovalRequestStatus.APPROVED,   Comments = "Assigning escalated UPI velocity alert to senior investigator", FinalizedAt = now.AddHours(-2), FinalizedBy = pSup.PersonId }
        };
        db.ApprovalRequests.AddRange(reqs);
        await db.SaveChangesAsync();

        // Approval decisions for completed requests
        db.ApprovalDecisions.AddRange(
            // Request 3 (BULK CLOSE – APPROVED) — two stage decisions
            new ApprovalDecision { RequestId = reqs[2].RequestId, StageId = stBulkS1.StageId, ApprovedBy = pMgr.PersonId, Decision = "APPROVED", Comments = "Reviewed 45 alerts – all confirmed FP based on ML model confidence > 95%.", DecidedAt = now.AddDays(-4), IsAutoDecision = false },
            // Request 5 (WRITE-OFF – APPROVED)
            new ApprovalDecision { RequestId = reqs[4].RequestId, StageId = stWriteS1.StageId, ApprovedBy = pMgr.PersonId,  Decision = "APPROVED", Comments = "Write-off approved at manager level. Sending to compliance.", DecidedAt = now.AddDays(-6), IsAutoDecision = false },
            new ApprovalDecision { RequestId = reqs[4].RequestId, StageId = stWriteS2.StageId, ApprovedBy = pComp.PersonId, Decision = "APPROVED", Comments = "Compliance sign-off given. Insurance claim filed (ref: INS/2026/4421).", DecidedAt = now.AddDays(-5), IsAutoDecision = false },
            // Request 1 (RULE CHANGE – IN_REVIEW, stage 1 done)
            new ApprovalDecision { RequestId = reqs[0].RequestId, StageId = stRuleS1.StageId, ApprovedBy = pSup.PersonId,  Decision = "APPROVED", Comments = "Threshold increase looks justified given rising corporate NEFT volumes. Forwarding to Manager.", DecidedAt = now.AddDays(-2), IsAutoDecision = false },
            // Request 2 (CASE CLOSURE – IN_REVIEW, stage 1 done)
            new ApprovalDecision { RequestId = reqs[1].RequestId, StageId = stCloseS1.StageId, ApprovedBy = pSup.PersonId, Decision = "APPROVED", Comments = "Case records verified. All customer reimbursements confirmed.", DecidedAt = now.AddDays(-1), IsAutoDecision = false },
            // Request 8 (BULK CLOSE – REJECTED)
            new ApprovalDecision { RequestId = reqs[7].RequestId, StageId = stBulkS1.StageId, ApprovedBy = pMgr.PersonId, Decision = "REJECTED", Comments = "Cannot bulk close June 1 NEFT alerts – 3 are linked to ongoing Case-3 investigation.", DecidedAt = now.AddDays(-13), IsAutoDecision = false },
            // Request 10 (ASSIGN ALERT – APPROVED)
            new ApprovalDecision { RequestId = reqs[9].RequestId, StageId = stAssignS1.StageId, ApprovedBy = pSup.PersonId, Decision = "APPROVED", Comments = "Auto-approved via supervisor authority. Alert assigned to Deepika Mishra.", DecidedAt = now.AddHours(-2), IsAutoDecision = false }
        );
        await db.SaveChangesAsync();

        // ══════════════════════════════════════════════════════════════════════
        // FIX COMPUTED REFS (SQLite has no computed columns)
        // ══════════════════════════════════════════════════════════════════════
        await db.Database.ExecuteSqlRawAsync("UPDATE Alert           SET AlertRef   = 'ALT-'  || printf('%05d', AlertId)   WHERE AlertRef   = '' OR AlertRef   IS NULL");
        await db.Database.ExecuteSqlRawAsync("UPDATE FraudCase       SET CaseRef    = 'CASE-' || printf('%05d', CaseId)    WHERE CaseRef    = '' OR CaseRef    IS NULL");
        await db.Database.ExecuteSqlRawAsync("UPDATE ApprovalRequest  SET RequestRef = 'REQ-'  || printf('%05d', RequestId) WHERE RequestRef = '' OR RequestRef IS NULL");
    }
}
