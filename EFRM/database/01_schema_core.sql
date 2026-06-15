-- ============================================================
-- EFRM Solution - SQL Server Schema
-- Person-Position-Location Architecture
-- Version 1.0 | June 2026
-- ============================================================

USE master;
GO
IF DB_ID('EFRMDB') IS NOT NULL DROP DATABASE EFRMDB;
CREATE DATABASE EFRMDB;
GO
USE EFRMDB;
GO

-- ============================================================
-- SCHEMA DEFINITIONS
-- ============================================================
CREATE SCHEMA identity;  -- Person, Position, Location, Access
CREATE SCHEMA fraud;     -- Alerts, Cases, Rules, Watchlists
CREATE SCHEMA approval;  -- Document types, Matrix, Workflows
CREATE SCHEMA profiling; -- Customer profiles, Behavioral data
CREATE SCHEMA audit;     -- Immutable audit trail
CREATE SCHEMA config;    -- System configuration
GO

-- ============================================================
-- IDENTITY SCHEMA: Person-Position-Location Pattern
-- ============================================================

-- Location hierarchy: Region > Zone > Branch
CREATE TABLE identity.Location (
    LocationId      INT IDENTITY(1,1) PRIMARY KEY,
    LocationCode    VARCHAR(20) NOT NULL UNIQUE,
    LocationName    NVARCHAR(150) NOT NULL,
    LocationType    VARCHAR(20) NOT NULL CHECK (LocationType IN ('REGION','ZONE','DISTRICT','BRANCH','HEAD_OFFICE')),
    ParentLocationId INT NULL REFERENCES identity.Location(LocationId),
    StateCode       VARCHAR(5),
    DistrictCode    VARCHAR(10),
    IFSCPrefix      VARCHAR(6),
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Position / Job Title (defines capabilities and default screens)
CREATE TABLE identity.Position (
    PositionId      INT IDENTITY(1,1) PRIMARY KEY,
    PositionCode    VARCHAR(30) NOT NULL UNIQUE,
    PositionName    NVARCHAR(100) NOT NULL,
    PositionLevel   INT NOT NULL,   -- 1=Clerk, 5=GM, 10=MD
    PositionType    VARCHAR(30) NOT NULL CHECK (PositionType IN ('INVESTIGATOR','ANALYST','SUPERVISOR','MANAGER','COMPLIANCE','ADMIN','IT_ADMIN','ML_ENGINEER','API_SYSTEM')),
    Department      NVARCHAR(100),
    CanApprove      BIT NOT NULL DEFAULT 0,
    MaxApprovalAmount DECIMAL(18,2) NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Person (System user/employee)
CREATE TABLE identity.Person (
    PersonId        INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeCode    VARCHAR(20) NOT NULL UNIQUE,
    FullName        NVARCHAR(150) NOT NULL,
    Email           NVARCHAR(200) NOT NULL UNIQUE,
    Mobile          VARCHAR(15),
    LdapUserName    NVARCHAR(100) UNIQUE,
    PasswordHash    NVARCHAR(500),       -- BCrypt hash (fallback if LDAP unavailable)
    IsActive        BIT NOT NULL DEFAULT 1,
    IsMfaEnabled    BIT NOT NULL DEFAULT 1,
    FailedLoginCount SMALLINT NOT NULL DEFAULT 0,
    LockedUntil     DATETIME2 NULL,
    LastLoginAt     DATETIME2 NULL,
    LastLoginIp     VARCHAR(45),
    PreferredLanguage VARCHAR(5) DEFAULT 'en',
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy       INT NULL REFERENCES identity.Person(PersonId)
);

-- Person-Position-Location Assignment (many-to-many with date range)
CREATE TABLE identity.PersonPositionLocation (
    AssignmentId    INT IDENTITY(1,1) PRIMARY KEY,
    PersonId        INT NOT NULL REFERENCES identity.Person(PersonId),
    PositionId      INT NOT NULL REFERENCES identity.Position(PositionId),
    LocationId      INT NOT NULL REFERENCES identity.Location(LocationId),
    IsPrimary       BIT NOT NULL DEFAULT 1,
    EffectiveFrom   DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    EffectiveTo     DATE NULL,
    AssignedBy      INT NULL REFERENCES identity.Person(PersonId),
    AssignedAt      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_PersonPositionLocation UNIQUE (PersonId, PositionId, LocationId, EffectiveFrom)
);

-- Screen / Module registry
CREATE TABLE identity.Screen (
    ScreenId        INT IDENTITY(1,1) PRIMARY KEY,
    ScreenCode      VARCHAR(50) NOT NULL UNIQUE,
    ScreenName      NVARCHAR(100) NOT NULL,
    ModuleName      NVARCHAR(50) NOT NULL,
    RouteUrl        NVARCHAR(200),
    ParentScreenId  INT NULL REFERENCES identity.Screen(ScreenId),
    SortOrder       INT DEFAULT 0,
    IconName        VARCHAR(50),
    IsActive        BIT NOT NULL DEFAULT 1
);

-- Permission types
CREATE TABLE identity.Permission (
    PermissionId    INT IDENTITY(1,1) PRIMARY KEY,
    PermissionCode  VARCHAR(30) NOT NULL UNIQUE,    -- VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT
    PermissionName  NVARCHAR(100) NOT NULL,
    IsDataWrite     BIT NOT NULL DEFAULT 0
);

-- Position-Screen-Permission matrix (what a POSITION can do on a SCREEN)
CREATE TABLE identity.PositionScreenPermission (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    PositionId      INT NOT NULL REFERENCES identity.Position(PositionId),
    ScreenId        INT NOT NULL REFERENCES identity.Screen(ScreenId),
    PermissionId    INT NOT NULL REFERENCES identity.Permission(PermissionId),
    IsGranted       BIT NOT NULL DEFAULT 1,
    GrantedBy       INT NULL REFERENCES identity.Person(PersonId),
    GrantedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_PosScreenPerm UNIQUE (PositionId, ScreenId, PermissionId)
);

-- Location-level data scope override (which locations' data a position-location combo can see)
CREATE TABLE identity.LocationDataScope (
    ScopeId         INT IDENTITY(1,1) PRIMARY KEY,
    PositionId      INT NOT NULL REFERENCES identity.Position(PositionId),
    HomeLocationId  INT NOT NULL REFERENCES identity.Location(LocationId),
    VisibleLocationId INT NOT NULL REFERENCES identity.Location(LocationId),
    IsActive        BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_LocationScope UNIQUE (PositionId, HomeLocationId, VisibleLocationId)
);

-- MFA / Session tokens
CREATE TABLE identity.UserSession (
    SessionId       UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PersonId        INT NOT NULL REFERENCES identity.Person(PersonId),
    RefreshToken    NVARCHAR(500),
    DeviceFingerprint NVARCHAR(200),
    IpAddress       VARCHAR(45),
    UserAgent       NVARCHAR(500),
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt       DATETIME2 NOT NULL,
    RevokedAt       DATETIME2 NULL,
    IsRevoked       BIT NOT NULL DEFAULT 0
);

-- ============================================================
-- FRAUD SCHEMA: Alerts, Cases, Rules, Watchlists
-- ============================================================

CREATE TABLE fraud.Alert (
    AlertId         BIGINT IDENTITY(1,1) PRIMARY KEY,
    AlertRef        AS 'ALT' + RIGHT('000000000' + CAST(AlertId AS VARCHAR), 9) PERSISTED,
    TransactionRef  VARCHAR(50),
    Channel         VARCHAR(30) NOT NULL,  -- UPI, MOBILE, INTERNET, CARD, AEPS, etc.
    CustomerId      VARCHAR(30),
    AccountNumber   VARCHAR(30),
    TransactionAmount DECIMAL(18,2),
    TransactionCurrency VARCHAR(5) DEFAULT 'INR',
    RiskScore       DECIMAL(5,2) NOT NULL,   -- 0.00 to 100.00
    RiskLevel       AS (CASE WHEN RiskScore >= 80 THEN 'CRITICAL'
                             WHEN RiskScore >= 60 THEN 'HIGH'
                             WHEN RiskScore >= 40 THEN 'MEDIUM'
                             ELSE 'LOW' END) PERSISTED,
    Status          VARCHAR(30) NOT NULL DEFAULT 'OPEN'
                    CHECK (Status IN ('OPEN','IN_INVESTIGATION','ESCALATED','PENDING_APPROVAL','CLOSED_TP','CLOSED_FP','CLOSED_INCONCLUSIVE')),
    FraudType       VARCHAR(50),
    ReasonCodes     NVARCHAR(MAX),     -- JSON array of reason codes
    ModelOutputs    NVARCHAR(MAX),     -- JSON: rule score, behavioral score, ml score
    CustomerNotified BIT NOT NULL DEFAULT 0,
    CustomerNotifiedAt DATETIME2 NULL,
    AssignedToPersonId INT NULL REFERENCES identity.Person(PersonId),
    AssignedAt      DATETIME2 NULL,
    LocationId      INT NULL REFERENCES identity.Location(LocationId),
    SlaBreachAt     DATETIME2,
    IsSlaBreach     BIT NOT NULL DEFAULT 0,
    EscalatedToPersonId INT NULL REFERENCES identity.Person(PersonId),
    EscalatedAt     DATETIME2 NULL,
    ClosedAt        DATETIME2 NULL,
    ClosedBy        INT NULL REFERENCES identity.Person(PersonId),
    ClosureNotes    NVARCHAR(1000),
    TransactionTimestamp DATETIME2 NOT NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IsDuplicate     BIT NOT NULL DEFAULT 0,
    DuplicateOfAlertId BIGINT NULL REFERENCES fraud.Alert(AlertId)
);

CREATE TABLE fraud.AlertReasonCode (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    AlertId         BIGINT NOT NULL REFERENCES fraud.Alert(AlertId),
    ReasonCode      VARCHAR(30) NOT NULL,
    ReasonDesc      NVARCHAR(300) NOT NULL,
    FeatureValue    NVARCHAR(100),
    ShapValue       DECIMAL(10,6),
    SortOrder       INT DEFAULT 0
);

CREATE TABLE fraud.AlertNote (
    NoteId          INT IDENTITY(1,1) PRIMARY KEY,
    AlertId         BIGINT NOT NULL REFERENCES fraud.Alert(AlertId),
    Note            NVARCHAR(MAX) NOT NULL,
    CreatedBy       INT NOT NULL REFERENCES identity.Person(PersonId),
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Cases group one or more alerts
CREATE TABLE fraud.FraudCase (
    CaseId          INT IDENTITY(1,1) PRIMARY KEY,
    CaseRef         AS 'CAS' + RIGHT('000000000' + CAST(CaseId AS VARCHAR), 9) PERSISTED,
    CaseTitle       NVARCHAR(200) NOT NULL,
    CaseType        VARCHAR(50),
    Status          VARCHAR(30) NOT NULL DEFAULT 'OPEN'
                    CHECK (Status IN ('OPEN','INVESTIGATION','LEGAL_REFERRAL','CLOSED_TP','CLOSED_FP','ARCHIVED')),
    Priority        VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                    CHECK (Priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    TotalExposureAmount DECIMAL(18,2) DEFAULT 0,
    AssignedToPersonId INT NULL REFERENCES identity.Person(PersonId),
    SupervisorId    INT NULL REFERENCES identity.Person(PersonId),
    LocationId      INT NULL REFERENCES identity.Location(LocationId),
    OpenedAt        DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ClosedAt        DATETIME2 NULL,
    SlaBreachAt     DATETIME2,
    CreatedBy       INT NOT NULL REFERENCES identity.Person(PersonId),
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE fraud.CaseAlert (
    CaseId          INT NOT NULL REFERENCES fraud.FraudCase(CaseId),
    AlertId         BIGINT NOT NULL REFERENCES fraud.Alert(AlertId),
    AddedAt         DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    AddedBy         INT NOT NULL REFERENCES identity.Person(PersonId),
    PRIMARY KEY (CaseId, AlertId)
);

CREATE TABLE fraud.CaseNote (
    NoteId          INT IDENTITY(1,1) PRIMARY KEY,
    CaseId          INT NOT NULL REFERENCES fraud.FraudCase(CaseId),
    Note            NVARCHAR(MAX) NOT NULL,
    NoteType        VARCHAR(20) DEFAULT 'GENERAL', -- GENERAL, LEGAL, EVIDENCE, ESCALATION
    CreatedBy       INT NOT NULL REFERENCES identity.Person(PersonId),
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE fraud.CaseEvidence (
    EvidenceId      INT IDENTITY(1,1) PRIMARY KEY,
    CaseId          INT NOT NULL REFERENCES fraud.FraudCase(CaseId),
    EvidenceType    VARCHAR(30) NOT NULL, -- SCREENSHOT, DOCUMENT, TRANSACTION_LOG, CALL_RECORDING
    FileName        NVARCHAR(300),
    FilePath        NVARCHAR(500),
    FileHash        VARCHAR(64),   -- SHA-256 for tamper evidence
    UploadedBy      INT NOT NULL REFERENCES identity.Person(PersonId),
    UploadedAt      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Rule / Scenario Engine
CREATE TABLE fraud.FraudRule (
    RuleId          INT IDENTITY(1,1) PRIMARY KEY,
    RuleCode        VARCHAR(50) NOT NULL UNIQUE,
    RuleName        NVARCHAR(200) NOT NULL,
    RuleCategory    VARCHAR(30),   -- VELOCITY, PATTERN, THRESHOLD, BEHAVIORAL, ML_SCORE
    Channel         VARCHAR(30),   -- NULL = all channels
    RuleDefinition  NVARCHAR(MAX) NOT NULL,  -- JSON rule DSL
    ScoreWeight     DECIMAL(5,2) DEFAULT 10,
    Action          VARCHAR(20) DEFAULT 'SCORE' CHECK (Action IN ('SCORE','BLOCK','STEP_UP','ALERT')),
    Priority        INT DEFAULT 100,
    IsActive        BIT NOT NULL DEFAULT 0,
    Version         INT NOT NULL DEFAULT 1,
    ParentRuleId    INT NULL REFERENCES fraud.FraudRule(RuleId),
    ApprovedBy      INT NULL REFERENCES identity.Person(PersonId),
    ApprovedAt      DATETIME2 NULL,
    CreatedBy       INT NOT NULL REFERENCES identity.Person(PersonId),
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EffectiveFrom   DATETIME2 NULL,
    EffectiveTo     DATETIME2 NULL
);

-- Watchlist
CREATE TABLE fraud.Watchlist (
    WatchlistId     BIGINT IDENTITY(1,1) PRIMARY KEY,
    EntityType      VARCHAR(20) NOT NULL CHECK (EntityType IN ('ACCOUNT','DEVICE','IP','PHONE','PAN','AADHAAR_HASH','IFSC','VPA','BIN')),
    EntityValue     NVARCHAR(200) NOT NULL,
    WatchlistType   VARCHAR(20) NOT NULL CHECK (WatchlistType IN ('BLOCK','MONITOR','WHITELIST')),
    Reason          NVARCHAR(300),
    Source          VARCHAR(50),   -- INTERNAL, NEUSTAR, MAXMIND, DOT_FRI, MNRL, OSM
    AddedBy         INT NULL REFERENCES identity.Person(PersonId),
    AddedAt         DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt       DATETIME2 NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    INDEX IX_Watchlist_EntityType_Value (EntityType, EntityValue)
);

-- ============================================================
-- APPROVAL SCHEMA: Configurable Matrix
-- ============================================================

CREATE TABLE approval.DocumentType (
    DocTypeId       INT IDENTITY(1,1) PRIMARY KEY,
    DocTypeCode     VARCHAR(50) NOT NULL UNIQUE,
    DocTypeName     NVARCHAR(150) NOT NULL,
    Description     NVARCHAR(500),
    Category        VARCHAR(30),   -- RULE_CHANGE, CASE_CLOSURE, EVIDENCE, REGULATORY, CONFIG_CHANGE
    MaxAmountLimit  DECIMAL(18,2) NULL,   -- If amount-based approval
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Approval workflow stages
CREATE TABLE approval.ApprovalStage (
    StageId         INT IDENTITY(1,1) PRIMARY KEY,
    DocTypeId       INT NOT NULL REFERENCES approval.DocumentType(DocTypeId),
    StageNumber     INT NOT NULL,
    StageName       NVARCHAR(100) NOT NULL,
    ApproverPositionId INT NOT NULL REFERENCES identity.Position(PositionId),
    RequiresLocationMatch BIT NOT NULL DEFAULT 0,  -- Must approver be in same location?
    IsMandatory     BIT NOT NULL DEFAULT 1,
    TimeoutHours    INT DEFAULT 24,                -- Auto-escalate after N hours
    OnTimeoutAction VARCHAR(20) DEFAULT 'ESCALATE' CHECK (OnTimeoutAction IN ('ESCALATE','AUTO_APPROVE','AUTO_REJECT')),
    EscalateToStageId INT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_DocStage UNIQUE (DocTypeId, StageNumber)
);

-- Amount/Threshold matrix for approval routing
CREATE TABLE approval.ApprovalMatrix (
    MatrixId        INT IDENTITY(1,1) PRIMARY KEY,
    DocTypeId       INT NOT NULL REFERENCES approval.DocumentType(DocTypeId),
    PositionId      INT NOT NULL REFERENCES identity.Position(PositionId),
    LocationTypeFilter VARCHAR(20) NULL,   -- NULL=all, BRANCH, ZONE, REGION
    AmountFrom      DECIMAL(18,2) NULL,
    AmountTo        DECIMAL(18,2) NULL,
    CanApprove      BIT NOT NULL DEFAULT 1,
    MaxApprovalAmount DECIMAL(18,2) NULL,
    ValidFrom       DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    ValidTo         DATE NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_ApprovalMatrix UNIQUE (DocTypeId, PositionId, LocationTypeFilter)
);

-- Approval Request (one per document submitted)
CREATE TABLE approval.ApprovalRequest (
    RequestId       INT IDENTITY(1,1) PRIMARY KEY,
    RequestRef      AS 'APR' + RIGHT('000000000' + CAST(RequestId AS VARCHAR), 9) PERSISTED,
    DocTypeId       INT NOT NULL REFERENCES approval.DocumentType(DocTypeId),
    EntityType      VARCHAR(30) NOT NULL,  -- FRAUD_RULE, FRAUD_CASE, CONFIG_CHANGE, REPORT
    EntityId        NVARCHAR(50) NOT NULL, -- ID of the rule/case/config being approved
    EntitySnapshot  NVARCHAR(MAX),         -- JSON snapshot of entity at time of request
    Amount          DECIMAL(18,2) NULL,
    RequestedBy     INT NOT NULL REFERENCES identity.Person(PersonId),
    RequestedAt     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LocationId      INT NOT NULL REFERENCES identity.Location(LocationId),
    CurrentStageId  INT NULL REFERENCES approval.ApprovalStage(StageId),
    Status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (Status IN ('PENDING','IN_REVIEW','APPROVED','REJECTED','CANCELLED','EXPIRED')),
    FinalizedAt     DATETIME2 NULL,
    FinalizedBy     INT NULL REFERENCES identity.Person(PersonId),
    Comments        NVARCHAR(1000)
);

-- Individual stage decisions
CREATE TABLE approval.ApprovalDecision (
    DecisionId      INT IDENTITY(1,1) PRIMARY KEY,
    RequestId       INT NOT NULL REFERENCES approval.ApprovalRequest(RequestId),
    StageId         INT NOT NULL REFERENCES approval.ApprovalStage(StageId),
    ApprovedBy      INT NOT NULL REFERENCES identity.Person(PersonId),
    Decision        VARCHAR(10) NOT NULL CHECK (Decision IN ('APPROVED','REJECTED','RETURNED')),
    Comments        NVARCHAR(1000),
    DecidedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IsAutoDecision  BIT NOT NULL DEFAULT 0
);

-- ============================================================
-- PROFILING SCHEMA: Customer Profiles
-- ============================================================

CREATE TABLE profiling.CustomerProfile (
    ProfileId       BIGINT IDENTITY(1,1) PRIMARY KEY,
    CustomerId      VARCHAR(30) NOT NULL UNIQUE,
    AccountNumbers  NVARCHAR(MAX),    -- JSON array
    PanHash         VARCHAR(64),
    AadhaarHash     VARCHAR(64),
    RiskCategory    VARCHAR(10) DEFAULT 'LOW' CHECK (RiskCategory IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    RiskScore       DECIMAL(5,2) DEFAULT 0,
    TransactionCount30d INT DEFAULT 0,
    TotalAmount30d  DECIMAL(18,2) DEFAULT 0,
    AvgTransaction  DECIMAL(18,2) DEFAULT 0,
    MaxTransaction  DECIMAL(18,2) DEFAULT 0,
    ActiveChannels  NVARCHAR(200),     -- JSON array
    KnownDevices    NVARCHAR(MAX),     -- JSON array of device fingerprints
    KnownIPs        NVARCHAR(MAX),     -- JSON array of IP ranges
    TypicalTxHours  NVARCHAR(50),      -- JSON: e.g. "8-20"
    TypicalTxLocations NVARCHAR(MAX),  -- JSON array of location codes
    IsWatchlisted   BIT NOT NULL DEFAULT 0,
    IsMule          BIT NOT NULL DEFAULT 0,
    MuleConfidence  DECIMAL(5,2) NULL,
    LastActivityAt  DATETIME2,
    ProfileUpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE profiling.DeviceFingerprint (
    DeviceId        BIGINT IDENTITY(1,1) PRIMARY KEY,
    DeviceHash      VARCHAR(64) NOT NULL,
    CustomerId      VARCHAR(30),
    DeviceType      VARCHAR(20),  -- MOBILE, DESKTOP, TABLET
    OsType          VARCHAR(30),
    AppVersion      VARCHAR(20),
    IsRooted        BIT NOT NULL DEFAULT 0,
    IsEmulator      BIT NOT NULL DEFAULT 0,
    IsMalwareDetected BIT NOT NULL DEFAULT 0,
    FirstSeenAt     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastSeenAt      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IsBlocked       BIT NOT NULL DEFAULT 0,
    INDEX IX_DeviceFingerprint_Hash (DeviceHash),
    INDEX IX_DeviceFingerprint_Customer (CustomerId)
);

-- ============================================================
-- AUDIT SCHEMA: Immutable audit trail
-- ============================================================

CREATE TABLE audit.AuditLog (
    AuditId         BIGINT IDENTITY(1,1) PRIMARY KEY,
    AuditTimestamp  DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    PersonId        INT NULL REFERENCES identity.Person(PersonId),
    EmployeeCode    VARCHAR(20),
    IpAddress       VARCHAR(45),
    SessionId       UNIQUEIDENTIFIER,
    Action          VARCHAR(50) NOT NULL,   -- LOGIN, ALERT_VIEW, RULE_CREATE, APPROVE, etc.
    EntityType      VARCHAR(50),
    EntityId        NVARCHAR(50),
    OldValues       NVARCHAR(MAX),   -- JSON
    NewValues       NVARCHAR(MAX),   -- JSON
    IsSuccess       BIT NOT NULL DEFAULT 1,
    FailureReason   NVARCHAR(200),
    CorrelationId   UNIQUEIDENTIFIER,
    LocationId      INT NULL REFERENCES identity.Location(LocationId)
);
-- Audit log must be append-only; enforce via DDL trigger
GO
CREATE TRIGGER audit.trg_AuditLog_PreventModify
ON audit.AuditLog
AFTER UPDATE, DELETE
AS
BEGIN
    RAISERROR('Audit log records cannot be modified or deleted.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO

-- ============================================================
-- CONFIG SCHEMA
-- ============================================================

CREATE TABLE config.SystemParameter (
    ParamId         INT IDENTITY(1,1) PRIMARY KEY,
    ParamKey        VARCHAR(100) NOT NULL UNIQUE,
    ParamValue      NVARCHAR(MAX) NOT NULL,
    DataType        VARCHAR(10) DEFAULT 'STRING' CHECK (DataType IN ('STRING','INT','DECIMAL','BOOL','JSON')),
    Category        VARCHAR(50),
    Description     NVARCHAR(300),
    IsEncrypted     BIT NOT NULL DEFAULT 0,
    LastModifiedBy  INT NULL REFERENCES identity.Person(PersonId),
    LastModifiedAt  DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE config.SlaDefinition (
    SlaId           INT IDENTITY(1,1) PRIMARY KEY,
    Channel         VARCHAR(30) NULL,  -- NULL = all
    RiskLevel       VARCHAR(10) NULL,  -- NULL = all
    AlertHours      INT NOT NULL DEFAULT 4,
    CaseHours       INT NOT NULL DEFAULT 48,
    EscalationHours INT NOT NULL DEFAULT 2,  -- After breach, escalate
    IsActive        BIT NOT NULL DEFAULT 1
);

-- ============================================================
-- SEED DATA: Screens, Permissions, Positions, Locations
-- ============================================================

-- Permissions
INSERT INTO identity.Permission (PermissionCode, PermissionName, IsDataWrite) VALUES
('VIEW',    'View / Read',              0),
('CREATE',  'Create',                   1),
('EDIT',    'Edit / Update',            1),
('DELETE',  'Delete',                   1),
('APPROVE', 'Approve',                  1),
('EXPORT',  'Export Data',              0),
('ASSIGN',  'Assign to Investigator',   1),
('CLOSE',   'Close Alert/Case',         1),
('BULK',    'Bulk Actions',             1),
('CONFIG',  'System Configuration',    1);

-- Screens / Modules
INSERT INTO identity.Screen (ScreenCode, ScreenName, ModuleName, RouteUrl, SortOrder, IconName) VALUES
('DASHBOARD',       'Dashboard',                'Dashboard',    '/dashboard',               1,  'dashboard'),
('ALERT_LIST',      'Alert Queue',              'Alerts',       '/alerts',                  2,  'notifications'),
('ALERT_DETAIL',    'Alert Detail',             'Alerts',       '/alerts/:id',              3,  'notifications_active'),
('CASE_LIST',       'Case Management',          'Cases',        '/cases',                   4,  'folder_open'),
('CASE_DETAIL',     'Case Detail',              'Cases',        '/cases/:id',               5,  'folder'),
('RULE_LIST',       'Rule Engine',              'Rules',        '/rules',                   6,  'rule'),
('RULE_EDITOR',     'Rule Editor',              'Rules',        '/rules/editor',            7,  'edit'),
('WATCHLIST',       'Watchlist Management',     'Alerts',       '/watchlist',               8,  'block'),
('CUSTOMER_PROFILE','Customer 360°',            'Profiling',    '/profiling/:id',           9,  'person'),
('NETWORK_GRAPH',   'Network Analytics',        'Profiling',    '/network',                 10, 'hub'),
('APPROVAL_QUEUE',  'Approval Queue',           'Approvals',    '/approvals',               11, 'approval'),
('APPROVAL_MATRIX', 'Approval Matrix Config',   'Admin',        '/admin/approval-matrix',   12, 'grid_on'),
('REPORTS',         'Reports & MIS',            'Reports',      '/reports',                 13, 'bar_chart'),
('DASHBOARDS_MGR',  'Dashboard Manager',        'Reports',      '/dashboards',              14, 'widgets'),
('MODEL_REGISTRY',  'ML Model Registry',        'AI/ML',        '/ml/models',               15, 'model_training'),
('MODEL_MONITOR',   'Model Monitoring',         'AI/ML',        '/ml/monitoring',           16, 'monitor_heart'),
('ADMIN_USERS',     'User Management',          'Admin',        '/admin/users',             17, 'manage_accounts'),
('ADMIN_POSITIONS', 'Position Management',      'Admin',        '/admin/positions',         18, 'badge'),
('ADMIN_LOCATIONS', 'Location Management',      'Admin',        '/admin/locations',         19, 'location_on'),
('ADMIN_ACCESS',    'Access Control Matrix',    'Admin',        '/admin/access',            20, 'security'),
('CONFIG_SYS',      'System Configuration',     'Config',       '/config/system',           21, 'settings'),
('CONFIG_SLA',      'SLA Configuration',        'Config',       '/config/sla',              22, 'timer'),
('AUDIT_LOG',       'Audit Trail',              'Audit',        '/audit',                   23, 'history'),
('CHANNEL_MONITOR', 'Channel Health Monitor',   'Dashboard',    '/channels',                24, 'cable');

-- Positions
INSERT INTO identity.Position (PositionCode, PositionName, PositionLevel, PositionType, Department, CanApprove, MaxApprovalAmount) VALUES
('INVESTIGATOR',    'Fraud Investigator',       1, 'INVESTIGATOR',  'Fraud Operations',  0, NULL),
('SR_INVESTIGATOR', 'Senior Fraud Investigator',2, 'INVESTIGATOR',  'Fraud Operations',  0, NULL),
('ANALYST',         'Fraud Analyst',            2, 'ANALYST',       'Fraud Analytics',   0, NULL),
('SUPERVISOR',      'Fraud Supervisor',         3, 'SUPERVISOR',    'Fraud Operations',  1, 500000),
('MANAGER',         'Fraud Operations Manager', 4, 'MANAGER',       'Fraud Operations',  1, 2000000),
('COMPLIANCE_OFF',  'Compliance Officer',       4, 'COMPLIANCE',    'Compliance',        1, NULL),
('DGM_FRAUD',       'DGM – Fraud & Risk',       6, 'MANAGER',       'Risk Management',   1, 10000000),
('GM_RISK',         'GM – Risk Management',     8, 'MANAGER',       'Risk Management',   1, NULL),
('IT_ADMIN',        'IT Administrator',         3, 'IT_ADMIN',      'IT',                0, NULL),
('ML_ENGINEER',     'ML Engineer',              3, 'ML_ENGINEER',   'Data Science',      0, NULL),
('SYS_ADMIN',       'System Administrator',     5, 'ADMIN',         'IT',                1, NULL),
('API_SYSTEM',      'API / System Account',     1, 'API_SYSTEM',    'Integration',       0, NULL);

-- Document Types for Approval
INSERT INTO approval.DocumentType (DocTypeCode, DocTypeName, Category, Description) VALUES
('RULE_ACTIVATE',   'Fraud Rule Activation',    'RULE_CHANGE',      'Activate or deactivate a fraud detection rule'),
('RULE_MODIFY',     'Fraud Rule Modification',  'RULE_CHANGE',      'Modify parameters of an existing rule'),
('CASE_CLOSE_TP',   'Case Closure – True Positive', 'CASE_CLOSURE', 'Close a fraud case as confirmed fraud'),
('CASE_CLOSE_FP',   'Case Closure – False Positive','CASE_CLOSURE', 'Close a fraud case as false positive'),
('WATCHLIST_ADD',   'Watchlist Addition',       'CONFIG_CHANGE',    'Add entity to block or monitor watchlist'),
('CONFIG_CHANGE',   'System Config Change',     'CONFIG_CHANGE',    'Change system configuration parameter'),
('REPORT_REGULATORY','Regulatory Report Sign-Off','REGULATORY',     'Sign off on RBI/DFS regulatory report'),
('EVIDENCE_EXPORT', 'Evidence Package Export',  'CASE_CLOSURE',     'Export tamper-evident case evidence for law enforcement');

-- Approval Stages
INSERT INTO approval.ApprovalStage (DocTypeId, StageNumber, StageName, ApproverPositionId, RequiresLocationMatch, IsMandatory, TimeoutHours) VALUES
-- Rule Activation: Supervisor -> Manager
(1, 1, 'Supervisor Review',   (SELECT PositionId FROM identity.Position WHERE PositionCode='SUPERVISOR'), 0, 1, 24),
(1, 2, 'Manager Approval',    (SELECT PositionId FROM identity.Position WHERE PositionCode='MANAGER'),    0, 1, 48),
-- Rule Modify: just Supervisor
(2, 1, 'Supervisor Approval', (SELECT PositionId FROM identity.Position WHERE PositionCode='SUPERVISOR'), 0, 1, 24),
-- Case Close TP: Supervisor only
(3, 1, 'Supervisor Sign-Off', (SELECT PositionId FROM identity.Position WHERE PositionCode='SUPERVISOR'), 0, 1, 24),
-- Case Close FP: Supervisor
(4, 1, 'Supervisor Sign-Off', (SELECT PositionId FROM identity.Position WHERE PositionCode='SUPERVISOR'), 0, 1, 24),
-- Watchlist Add: Manager
(5, 1, 'Manager Approval',    (SELECT PositionId FROM identity.Position WHERE PositionCode='MANAGER'),    0, 1, 12),
-- Config Change: GM
(6, 1, 'DGM Review',          (SELECT PositionId FROM identity.Position WHERE PositionCode='DGM_FRAUD'),  0, 1, 24),
(6, 2, 'GM Approval',         (SELECT PositionId FROM identity.Position WHERE PositionCode='GM_RISK'),    0, 1, 48),
-- Regulatory Report: Compliance + DGM
(7, 1, 'Compliance Sign-Off', (SELECT PositionId FROM identity.Position WHERE PositionCode='COMPLIANCE_OFF'), 0, 1, 24),
(7, 2, 'DGM Approval',        (SELECT PositionId FROM identity.Position WHERE PositionCode='DGM_FRAUD'),  0, 1, 24);

-- Sample Locations
INSERT INTO identity.Location (LocationCode, LocationName, LocationType, ParentLocationId) VALUES
('HO',      'Head Office – Lucknow',    'HEAD_OFFICE',  NULL);
INSERT INTO identity.Location (LocationCode, LocationName, LocationType, ParentLocationId) VALUES
('RGN_WUP', 'Western UP Region',        'REGION',       1),
('RGN_EUP', 'Eastern UP Region',        'REGION',       1),
('ZN_AGR',  'Agra Zone',                'ZONE',         2),
('ZN_MRT',  'Meerut Zone',              'ZONE',         2),
('ZN_VNS',  'Varanasi Zone',            'ZONE',         3),
('BR_AGR01','Agra Main Branch',         'BRANCH',       4),
('BR_AGR02','Agra Civil Lines Branch',  'BRANCH',       4),
('BR_MRT01','Meerut Branch',            'BRANCH',       5),
('BR_VNS01','Varanasi Branch',          'BRANCH',       6);

-- SLA Defaults
INSERT INTO config.SlaDefinition (Channel, RiskLevel, AlertHours, CaseHours, EscalationHours) VALUES
(NULL,   'CRITICAL', 1,   24,  0),
(NULL,   'HIGH',     4,   48,  1),
(NULL,   'MEDIUM',   8,   72,  2),
(NULL,   'LOW',      24,  120, 4),
('UPI',  'CRITICAL', 0,   24,  0),
('CARD', 'CRITICAL', 1,   24,  0);

-- System Parameters
INSERT INTO config.SystemParameter (ParamKey, ParamValue, DataType, Category, Description) VALUES
('alert.dedup.window_minutes',   '60',       'INT',     'ALERT',    'Deduplication window in minutes'),
('alert.customer_notify.sms',    'true',     'BOOL',    'NOTIFY',   'Send SMS on alert generation'),
('alert.customer_notify.email',  'true',     'BOOL',    'NOTIFY',   'Send Email on alert generation'),
('rule.max_active',              '10000',    'INT',     'RULE',     'Max active rules'),
('profiling.history_days',       '90',       'INT',     'PROFILE',  'Behavioral profile lookback days'),
('session.timeout_minutes',      '30',       'INT',     'SECURITY', 'User session timeout'),
('login.max_failures',           '5',        'INT',     'SECURITY', 'Max login failures before lockout'),
('login.lockout_minutes',        '30',       'INT',     'SECURITY', 'Account lockout duration'),
('watchlist.cache_ttl_seconds',  '300',      'INT',     'CACHE',    'Watchlist Redis TTL'),
('ml.drift.alert_threshold_pct', '5',        'DECIMAL', 'ML',       'Model drift alert threshold %');

-- Grant INVESTIGATOR access to core screens
INSERT INTO identity.PositionScreenPermission (PositionId, ScreenId, PermissionId)
SELECT p.PositionId, s.ScreenId, pm.PermissionId
FROM identity.Position p
CROSS JOIN identity.Screen s
CROSS JOIN identity.Permission pm
WHERE p.PositionCode = 'INVESTIGATOR'
  AND s.ScreenCode IN ('DASHBOARD','ALERT_LIST','ALERT_DETAIL','CASE_LIST','CASE_DETAIL','CUSTOMER_PROFILE','REPORTS')
  AND pm.PermissionCode IN ('VIEW','EXPORT');

INSERT INTO identity.PositionScreenPermission (PositionId, ScreenId, PermissionId)
SELECT p.PositionId, s.ScreenId, pm.PermissionId
FROM identity.Position p
CROSS JOIN identity.Screen s
CROSS JOIN identity.Permission pm
WHERE p.PositionCode = 'INVESTIGATOR'
  AND s.ScreenCode IN ('ALERT_DETAIL','CASE_LIST','CASE_DETAIL')
  AND pm.PermissionCode IN ('EDIT','CREATE');

GO
PRINT 'EFRM Database Schema created successfully.';
