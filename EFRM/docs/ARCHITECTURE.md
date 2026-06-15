# EFRM Solution Architecture
## Enterprise Fraud Risk Management – Uttar Pradesh Gramin Bank
### Version 1.0 | June 2026

---

## 1. Solution Overview

The EFRM system is an AI/ML-driven, real-time fraud management platform covering all UPGB payment channels (UPI, Mobile Banking, Internet Banking, Debit Card/ATM, AEPS, IMPS, NEFT/RTGS, BBPS, CBS, IVRS). It delivers sub-100ms transaction scoring at 5,000 TPS peak load.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Angular 17 + Angular Material | Enterprise components, accessibility (WCAG 2.1 AA), SSR-ready |
| Backend API | ASP.NET Core 8 (C#) | High performance, OpenAPI support, strong RBAC ecosystem |
| Database | SQL Server 2022 | ACID, strong tooling, JSON support, row-level security |
| Streaming | Apache Kafka | 5,000+ TPS ingestion, replay, fraud pipeline event sourcing |
| Cache / Session | Redis 7 | Sub-ms watchlist lookups, rate-limiting, session store |
| ML Engine | Python microservices + MLflow | SHAP explainability, model registry, drift detection |
| Container | Docker + Kubernetes | Horizontal scaling, IaC, DC+DR deployment |
| Auth | JWT + LDAP/AD (MFA) | Enterprise SSO, MFA, session control |

---

## 3. Person-Position-Location (PPL) Architecture

The access control model follows a strict **Person × Position × Location** pattern. Every system capability is gated through this triple.

```
Person
 └── PersonPositionLocation (assignment, date-ranged)
      ├── Position  ──► PositionScreenPermission ──► Screen + Permission
      └── Location  ──► LocationDataScope        ──► Visible data scope
```

### Key Rules
- A **Person** can hold multiple **Position** assignments simultaneously (e.g., Investigator + Analyst).
- **Screen access** is determined by the union of permissions across all active Position assignments.
- **Data scope** (which branches' alerts/cases a person can see) is determined by Location hierarchy:
  - HEAD_OFFICE → all data
  - REGION → all zones/branches under that region
  - ZONE → all branches under that zone
  - BRANCH → own branch only

### Position Types and Default Screens
| Position | Level | Default Screens | Can Approve |
|----------|-------|----------------|-------------|
| Fraud Investigator | 1 | Dashboard, Alert Queue, Case Mgmt, Customer 360° | No |
| Senior Investigator | 2 | + Rule Engine (view) | No |
| Fraud Analyst | 2 | + Reports, Network Analytics | No |
| Fraud Supervisor | 3 | + Rule activation, Case closure approval | Yes (≤5L) |
| Fraud Operations Manager | 4 | + Watchlist Mgmt, Config | Yes (≤20L) |
| Compliance Officer | 4 | + Regulatory Reports, Evidence Export | Yes |
| DGM – Fraud & Risk | 6 | All except System Admin | Yes (≤1Cr) |
| GM – Risk Management | 8 | All except System Admin | Yes (unlimited) |
| IT Administrator | 3 | Admin screens, System Config | No |
| System Administrator | 5 | All screens | Yes |

---

## 4. Configurable Approval Engine

The approval workflow is driven entirely by configuration — no code changes required for new document types or routing changes.

### Approval Matrix Architecture
```
DocumentType (RULE_ACTIVATE, CASE_CLOSE_TP, WATCHLIST_ADD, etc.)
    └── ApprovalStage (ordered, 1-N stages per document type)
         └── ApproverPositionId  →  requires Position on the approver
              └── RequiresLocationMatch (optional: same branch/zone)

ApprovalMatrix (Position × DocType × AmountRange → can approve up to X)
```

### Approval Flow
1. Any authorized person submits a document (e.g., activating a fraud rule).
2. System creates an `ApprovalRequest` and advances to Stage 1.
3. All persons holding the required `Position` see the request in their Approval Queue.
4. Decision: APPROVED (advance to next stage), REJECTED (finalize), RETURNED (send back).
5. On final approval, `ApplyApprovalEffectAsync` executes the side-effect (activates rule, closes case, etc.).
6. Full audit trail maintained in `approval.ApprovalDecision`.

### Configured Document Types (6 initial)
| Code | Name | Stages |
|------|------|--------|
| RULE_ACTIVATE | Fraud Rule Activation | Supervisor → Manager |
| RULE_MODIFY | Fraud Rule Modification | Supervisor |
| CASE_CLOSE_TP | Case Closure – True Positive | Supervisor |
| WATCHLIST_ADD | Watchlist Addition | Manager |
| CONFIG_CHANGE | System Config Change | DGM → GM |
| REPORT_REGULATORY | Regulatory Report Sign-Off | Compliance → DGM |

---

## 5. Module Architecture

### Backend (ASP.NET Core 8)
```
EFRM.Core            – Entities, DTOs, Enums (no dependencies)
EFRM.Infrastructure  – DbContext (EF Core), Services, Kafka, Redis
EFRM.API             – Controllers, Middleware, Program.cs
```

### Key API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | JWT login (LDAP/BCrypt) |
| GET | /api/v1/alerts | Paged alert list (location-scoped) |
| GET | /api/v1/alerts/stats | Dashboard KPIs |
| POST | /api/v1/alerts/{id}/assign | Assign alert |
| POST | /api/v1/alerts/{id}/close | Close alert (TP/FP) |
| POST | /api/v1/alerts/bulk-action | Bulk assign/close (≤100) |
| GET | /api/v1/cases | Case list |
| GET/POST | /api/v1/rules | Rule CRUD (triggers approval) |
| GET | /api/v1/approvals/pending | Approvals awaiting my decision |
| POST | /api/v1/approvals | Submit for approval |
| POST | /api/v1/approvals/{id}/decide | Approve/Reject/Return |
| GET | /api/v1/approvals/matrix | View approval matrix |
| PUT | /api/v1/approvals/matrix | Update approval matrix |
| GET/PUT | /api/v1/admin/access-matrix/{positionId} | Screen permission matrix |

### Frontend (Angular 17)
```
efrm-ui/src/app/
├── core/
│   ├── services/     auth.service.ts
│   ├── guards/       auth.guard.ts  (screen-code aware)
│   └── interceptors/ auth.interceptor.ts
├── shared/
│   └── components/   shell/ (sidenav + toolbar)
└── modules/
    ├── auth/         login/
    ├── dashboard/    KPI cards, channel heatmap
    ├── alerts/       alert-list/ (bulk actions), alert-detail/
    ├── cases/        case-list/, case-detail/
    ├── rules/        rule-list/, rule-editor/ (visual DSL)
    ├── approvals/    approval-queue/, approval-detail/ (stage stepper)
    ├── profiling/    customer-360/ (360° view + network graph)
    ├── reports/      configurable MIS reports
    └── admin/
        ├── user-management/
        ├── access-matrix/     (Position × Screen × Permission grid)
        └── approval-matrix/   (configurable routing matrix)
```

---

## 6. Database Schema (SQL Server)

### Schema Namespaces
| Schema | Tables | Purpose |
|--------|--------|---------|
| identity | Person, Position, Location, PersonPositionLocation, Screen, Permission, PositionScreenPermission, UserSession | PPL access model |
| fraud | Alert, AlertNote, AlertReasonCode, FraudCase, CaseNote, CaseEvidence, FraudRule, Watchlist | Core fraud data |
| approval | DocumentType, ApprovalStage, ApprovalMatrix, ApprovalRequest, ApprovalDecision | Workflow engine |
| profiling | CustomerProfile, DeviceFingerprint | Customer 360° |
| audit | AuditLog (DDL trigger prevents modification) | Immutable trail |
| config | SystemParameter, SlaDefinition | Runtime config |

---

## 7. Security Architecture

- **Authentication**: JWT (8h expiry) + MFA (TOTP) + LDAP/AD SSO
- **Authorization**: PPL-based RBAC enforced in `LocationScopeMiddleware` (every request)
- **Encryption**: TLS 1.2+ in transit; AES-256 at rest (SQL Transparent Data Encryption)
- **Audit**: Immutable `audit.AuditLog` (DDL trigger blocks UPDATE/DELETE)
- **Session**: Redis-backed; configurable timeout (default 30 min)
- **Lockout**: 5 failed attempts → 30-minute lockout (configurable)

---

## 8. Real-Time Scoring Flow

```
Channel Transaction → Kafka Topic (efrm.transactions)
     │
     ▼
Scoring Engine (ASP.NET Core consumer)
     ├─ Rule Engine   (JSON DSL, up to 10,000 rules)
     ├─ Behavioral    (Redis: customer profile lookup)
     └─ ML Score      (Python microservice gRPC call)
     │
     ▼
Composite Risk Score (0-100) + SHAP Reason Codes
     │
     ├─ Score < 40  → ALLOW
     ├─ Score 40-79 → ALERT (async, non-blocking)
     └─ Score ≥ 80  → BLOCK / STEP-UP AUTH
     │
     ▼
Alert persisted → Kafka Topic (efrm.alerts) → Investigator Queue
```

---

## 9. Deployment Architecture

```
                    ┌─────────────────────┐
Internet ──[WAF]──► │  Angular (Nginx)    │ :80/443
                    └──────────┬──────────┘
                               │ /api/v1/*
                    ┌──────────▼──────────┐
                    │  EFRM API           │ .NET 8
                    │  (K8s Deployment)   │
                    └──┬───┬────┬─────────┘
                       │   │    │
              ┌────────┘   │    └──────────────┐
         ┌────▼────┐  ┌────▼────┐  ┌───────────▼──┐
         │SQL Svr  │  │  Redis  │  │   Kafka       │
         │(Primary)│  │Cluster  │  │(3-node)       │
         └────┬────┘  └─────────┘  └──────┬────────┘
              │                           │
         ┌────▼──────────────────────────▼────┐
         │          DR Site (Mirror)           │
         └─────────────────────────────────────┘
```

### SLA Targets
| Metric | Target |
|--------|--------|
| System Uptime | ≥ 99.90% |
| Transaction Scoring P95 | ≤ 100ms at 5,000 TPS |
| Alert Assignment | ≤ 30 seconds |
| Customer Notification | ≤ 30 seconds |
| RTO (DR Failover) | ≤ 120 minutes |
| RPO | ≤ 10 minutes |
| Archived Record Retrieval | ≤ 30 seconds |

---

## 10. Getting Started

### Prerequisites
- Docker Desktop 4.x
- .NET 8 SDK (for local development)
- Node.js 20+ (for Angular development)

### Quick Start
```bash
# Start all infrastructure + services
cd EFRM/deployment
docker compose up -d

# Initialize database (run once after SQL Server is healthy)
docker exec -it efrm-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "Efrm@2026!Secure" \
  -i /docker-entrypoint-initdb.d/01_schema_core.sql

# Frontend development
cd frontend/efrm-ui
npm install && npm start
# → http://localhost:4200

# Backend development
cd backend
dotnet run --project EFRM.API
# → http://localhost:5000/swagger
```

### Default Credentials (Development Only)
| Role | Username | Password |
|------|----------|----------|
| System Admin | sysadmin | Admin@123 |
| Fraud Investigator | investigator1 | Pass@123 |
| Fraud Manager | manager1 | Pass@123 |

> **Change all passwords before production deployment.**

---

## 11. Compliance Checklist

| Regulation | Implementation |
|-----------|---------------|
| RBI Cyber Security Framework | TLS 1.2+, HSM, MFA, VAPT annual |
| RBI Fraud Classification Reporting | Pre-built regulatory report templates |
| RBI Authentication Direction 2025 | Risk-based + step-up auth in scoring engine |
| DPDP Act 2023 | Data retention config, secure deletion workflow |
| ISO/IEC 27001:2022 | Audit trail, RBAC, encryption standards |
| PCI-DSS v4.0 | Card data masking, dedicated network segment |
| OWASP Top 10 | JWT auth, parameterized queries, CSP headers |
| WCAG 2.1 AA | Angular Material a11y, aria labels, keyboard nav |
