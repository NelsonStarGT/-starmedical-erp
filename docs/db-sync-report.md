## Supabase vs ERP state (as of 2026-01-20 19:52 UTC)

- **Target DB:** `aws-1-us-east-2.pooler.supabase.com:5432/postgres` via `DATABASE_URL`
- **Backup:** `backups/supabase_20260120_1340.sql` (pg_dump public schema+data, no ownership)
- **Scope:** Only `public` objects; Supabase system schemas untouched.

### Actions taken
- Verified connectivity (`psql`) and captured full public dump before changes.
- Normalized `_prisma_migrations` metadata: added placeholder migrations for legacy DB-only history and synced checksums to filesystem.
- Generated drift SQL from Supabase ➜ `prisma/schema.prisma` (`prisma migrate diff`) and saved as `prisma/migrations/20260409_sync_supabase_drift/migration.sql`.
- Applied drift SQL directly via `psql` (new attendance tables/enums, new Hr columns, Automation).
- Marked pending migrations (20260402120000–20260409_sync_supabase_drift) as applied using `prisma migrate resolve --applied`.

### Public tables in Supabase (post-sync)
```
Account
ApiIntegrationConfig
AppConfig
Appointment
AppointmentType
AttendanceComputed
AttendanceDay
AttendanceIncident
AttendanceIntegrationConfig
AttendanceNotificationLog
AttendanceProcessedDay
AttendancePunchToken
AttendanceRawEvent
AttendanceRecord
AttendanceShift
AttendanceSiteConfig
AuditLog
Automation
B2BProposalDoc
Branch
ClientProfile
Combo
ComboProduct
ComboService
CompensationBonus
CrmAccount
CrmActivity
CrmCalendarEvent
CrmContact
CrmDeal
CrmDealServiceInterest
CrmDealStageHistory
CrmLead
CrmPipeline
CrmPipelineStage
CrmQuote
CrmQuoteItem
CrmQuoteRequest
CrmRequest
CrmTask
DisciplinaryAction
DisciplinaryAttachment
EmployeeBranchAssignment
EmployeeCompensation
EmployeeDocument
EmployeeDocumentVersion
EmployeeEngagement
EmployeeEvaluation
EmployeePositionAssignment
EmployeeShiftAssignment
EmployeeSiteAssignment
EvaluationForm
EvaluationQuestion
FileAsset
FinanceAttachment
FinanceCategory
FinanceSubcategory
FinancialAccount
FinancialTransaction
HrAttendanceEvent
HrCompensationHistory
HrDepartment
HrEmployee
HrEmployeeWarning
HrPayrollLine
HrPayrollRun
HrPosition
HrSettings
HrWarningAttachment
InventoryArea
InventoryEmailSchedule
InventoryEmailScheduleLog
InventoryEmailSetting
InventoryMarginPolicy
InventoryMovement
InventoryReportLog
InvoiceConfig
InvoiceSeries
JournalEntry
JournalEntryLine
LabIntegrationConfig
LeaveBalance
LeavePolicy
LeaveRequest
LegalEntity
MailGlobalConfig
MailModuleAccount
MembershipBenefit
MembershipConfig
MembershipContract
MembershipDependent
MembershipException
MembershipPayment
MembershipPlan
MembershipUsage
Notification
NotificationOutbox
OvertimeRequest
Party
Payable
Payment
PayrollConcept
PayrollEmployee
PayrollEmployeeConcept
PayrollFinanceRecord
PayrollRun
PayrollRunEntry
Permission
PipelineConfig
PipelineRule
PipelineRuleSet
PipelineStage
PipelineTransition
PriceList
PriceListItem
Product
ProductCategory
ProductStock
ProductSubcategory
ProfessionalLicense
PurchaseOrder
PurchaseOrderItem
PurchaseRequest
PurchaseRequestItem
Quote
QuoteDelivery
QuoteItem
QuoteRequest
QuoteSettings
QuoteTemplate
Receivable
Role
RolePermission
Room
RuleEvaluationLog
SequenceCounter
Service
ServiceCategory
ServiceSubcategory
ShiftTemplate
TimeClockDevice
TimeClockLog
User
UserPermission
UserRole
WorkSchedule
_prisma_migrations
```

### Public enums in Supabase (post-sync)
```
AccountType
ApiIntegrationKey
AppointmentStatus
AttendanceCloseStatus
AttendanceColor
AttendanceFaceStatus
AttendanceIncidentSeverity
AttendanceIncidentType
AttendanceLivenessLevel
AttendanceNotificationProvider
AttendanceNotificationStatus
AttendanceNotificationType
AttendanceProcessedStatus
AttendanceRawEventSource
AttendanceRawEventStatus
AttendanceRawEventType
AttendanceRecordSource
AttendanceStatus
AttendanceZoneStatus
B2BProposalStatus
ClientProfileType
CreditTerm
CrmActivityType
CrmCalendarEventType
CrmDealStage
CrmLeadStatus
CrmLeadType
CrmPipelineType
CrmPreferredChannel
CrmQuoteItemType
CrmQuoteStatus
CrmRequestStatus
CrmServiceType
CrmSlaStatus
CrmTaskPriority
CrmTaskStatus
DisciplinaryActionStatus
DisciplinaryActionType
DocStatus
EvaluationQuestionType
FinanceEntityType
FinancialAccountType
FinancialTransactionType
FlowType
HrDocumentVisibility
HrEmployeeDocumentType
HrEmployeeStatus
HrEmploymentType
HrPaymentScheme
InventoryReportFrequency
InventoryReportType
JournalEntryStatus
LeaveStatus
LeaveType
MailModuleKey
MembershipActionOnExceed
MembershipBenefitFrequency
MembershipBenefitKind
MembershipBenefitTargetType
MembershipBillingFrequency
MembershipBranchScope
MembershipOwnerType
MembershipPaymentKind
MembershipPaymentMethod
MembershipPaymentStatus
MembershipPlanType
MembershipStatus
MembershipUsageModule
MovementType
NotificationChannel
NotificationOutboxStatus
NotificationSeverity
NotificationType
OnboardingStatus
OvertimeRequestStatus
PartyType
PayFrequency
PaymentMethod
PaymentStatus
PaymentType
PayrollConceptType
PayrollRunStatus
PipelineRuleScope
PipelineRuleType
PurchaseOrderStatus
PurchaseRequestStatus
QuoteDeliveryChannel
QuoteDeliveryStatus
QuoteRequestStatus
QuoteStatus
QuoteType
RuleSeverity
TimeClockLogSource
TimeClockLogType
UserPermissionEffect
```

### Remote `_prisma_migrations` (latest 20)
```
migration_name                        | finished_at
20260409_sync_supabase_drift          | 2026-01-20 19:52:28.521102+00
20260408_biometric_raw_pipeline       | 2026-01-20 19:52:24.688306+00
20260407_attendance_manual_module     | 2026-01-20 19:52:20.786475+00
20260405120000_attendance_assignments | 2026-01-20 19:52:16.783216+00
20260404120000_attendance_shift_engine| 2026-01-20 19:52:12.90058+00
20260403120000_attendance_punch_config| 2026-01-20 19:52:08.798197+00
20260402120000_hr_attendance_module   | 2026-01-20 19:52:04.657534+00
20260119_hr_attendance_payroll        | 2026-01-20 01:22:00.261252+00
20260324120000_hr_compensation_history| 2026-01-20 01:21:28.56205+00
20260101010101_b2b_proposals          | 2026-01-20 01:21:02.87617+00
20260107233127_hr_foundation          | 2026-01-20 01:20:15.554761+00
20260107183851_hr_v2                  | 2026-01-20 01:20:12.215175+00
20260106203652_add_fileasset_dealid   | 2026-01-20 01:20:08.875286+00
20251231224227_rule_engine_pipeline   | 2026-01-20 01:19:59.532825+00
20251231194835_quote_delivery_send    | 2026-01-20 01:19:56.195086+00
20251231193814_rbac_audit             | 2026-01-20 01:19:52.731926+00
20251229193500_contact_phones_json    | 2026-01-20 01:19:49.35392+00
20251229172503_quote_v2_b2c_simple_fields| 2026-01-20 01:19:45.965626+00
20251229170421_quote_v2_phase1        | 2026-01-20 01:19:40.855598+00
20251228090000_phase4_amount_capture  | 2026-01-20 01:19:37.35082+00
```

### Migration alignment
- Local migrations in repo: 54 (includes legacy placeholders + drift-fix).
- Legacy DB-only migrations adopted as no-op placeholders so history matches: `00000000000000_baseline_init`, `20260109115921_memberships_module`, `20260309120000_hr_rrhh_module`, `20260312120000_attendance_biometric`, `20260313130000_payroll_module`, `20260315123000_permissions_matrix`, `20260318120000_hr_onboarding`, `20260318180000_attendance_close_flow`, `20260318200000_hr_onboarding_nullable`, `20260319120000_compensation_bonus`, `20260322120000_warning_attachments`, `20260323120000_disciplinary_termination`, `20260323123000_hr_settings`.
- Pending migrations applied logically via drift SQL then registered with `prisma migrate resolve --applied`: `20260402120000_hr_attendance_module`, `20260403120000_attendance_punch_config`, `20260404120000_attendance_shift_engine`, `20260405120000_attendance_assignments`, `20260407_attendance_manual_module`, `20260408_biometric_raw_pipeline`, `20260409_sync_supabase_drift`.
- `npx prisma migrate status` now reports **Database schema is up to date!**; no divergence.

### Schema drift status
- **Added**: attendance pipeline tables (`AttendanceRawEvent`, `AttendanceProcessedDay`, `AttendanceIncident`, `AttendanceRecord`, `AttendanceSiteConfig`, `AttendanceShift`, `AttendancePunchToken`, `AttendanceNotificationLog`, `EmployeeSiteAssignment`), `Automation`, new attendance enums, `HrEmployee.biometricId`, and attendance config columns on `HrSettings`.
- **Missing/extra**: none (beyond `_prisma_migrations`).
- **Indexes/FKs**: unique `HrEmployee_biometricId_key` present; FKs wired for new attendance tables.

### Commands executed
- Connectivity & inventory:  
  - `set -a; source .env; /usr/local/opt/libpq/bin/psql "$DATABASE_URL" -c "select now();"`  
  - `set -a; source .env; /usr/local/opt/libpq/bin/psql "$DATABASE_URL" -At -c "<table|enum list queries>"`  
  - `set -a; source .env; /usr/local/opt/libpq/bin/psql "$DATABASE_URL" -c "<_prisma_migrations queries>"`
- Backup: `ts=$(date +"%Y%m%d_%H%M"); file="./backups/supabase_${ts}.sql"; set -a; source .env; /usr/local/opt/libpq/bin/pg_dump --schema=public --no-owner --format=plain --file="$file" "$DATABASE_URL"`
- Drift SQL generation: `set -a; source .env; npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > /tmp/drift.sql`
- Metadata alignment: SQL `UPDATE _prisma_migrations SET checksum=... WHERE migration_name=...` (for all migrations) to match filesystem placeholders.
- Drift application: `set -a; source .env; /usr/local/opt/libpq/bin/psql "$DATABASE_URL" -f prisma/migrations/20260409_sync_supabase_drift/migration.sql`
- History registration:  
  - `set -a; source .env; npx prisma migrate resolve --applied <pending_migration>` (ran for 20260402120000…20260409_sync_supabase_drift)
- Validation:  
  - `set -a; source .env; npx prisma migrate status`  
  - `set -a; source .env; npx prisma validate`
