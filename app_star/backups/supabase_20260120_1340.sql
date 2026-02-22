--
-- PostgreSQL database dump
--

\restrict bKz9eVB1WRAQlu7TB0wv1dv8sVT4BRq9bzinB2ABfJgOy9aUkpURTVB0JyraSIL

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountType" AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'INCOME',
    'EXPENSE'
);


--
-- Name: ApiIntegrationKey; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApiIntegrationKey" AS ENUM (
    'WHATSAPP',
    'SMS',
    'LABORATORIO',
    'ASISTENCIA',
    'SAT_FACTURACION',
    'GOOGLE_DRIVE',
    'WEBHOOKS',
    'OTRO'
);


--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'PROGRAMADA',
    'CONFIRMADA',
    'EN_SALA',
    'ATENDIDA',
    'NO_SHOW',
    'CANCELADA'
);


--
-- Name: AttendanceCloseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceCloseStatus" AS ENUM (
    'OPEN',
    'READY_TO_CLOSE',
    'CLOSED',
    'NEEDS_REVIEW'
);


--
-- Name: AttendanceColor; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceColor" AS ENUM (
    'GREEN',
    'ORANGE',
    'RED'
);


--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'NORMAL',
    'TARDY',
    'ABSENT'
);


--
-- Name: B2BProposalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."B2BProposalStatus" AS ENUM (
    'DRAFT',
    'READY',
    'SENT',
    'APPROVED',
    'REJECTED',
    'ARCHIVED'
);


--
-- Name: ClientProfileType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClientProfileType" AS ENUM (
    'PERSON',
    'COMPANY'
);


--
-- Name: CreditTerm; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CreditTerm" AS ENUM (
    'CASH',
    'DAYS_15',
    'DAYS_30',
    'DAYS_45',
    'DAYS_60',
    'DAYS_90',
    'OTHER'
);


--
-- Name: CrmActivityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmActivityType" AS ENUM (
    'CALL',
    'WHATSAPP',
    'EMAIL',
    'VISIT',
    'NOTE',
    'SYSTEM'
);


--
-- Name: CrmCalendarEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmCalendarEventType" AS ENUM (
    'VISITA',
    'REUNION_VIRTUAL',
    'LLAMADA',
    'SEGUIMIENTO'
);


--
-- Name: CrmDealStage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmDealStage" AS ENUM (
    'NUEVO',
    'CONTACTADO',
    'DIAGNOSTICO',
    'COTIZACION',
    'NEGOCIACION',
    'GANADO',
    'PERDIDO'
);


--
-- Name: CrmLeadStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmLeadStatus" AS ENUM (
    'NEW',
    'QUOTED',
    'FOLLOW_UP',
    'WON',
    'LOST'
);


--
-- Name: CrmLeadType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmLeadType" AS ENUM (
    'COMPANY',
    'PATIENT'
);


--
-- Name: CrmPipelineType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmPipelineType" AS ENUM (
    'B2B',
    'B2C'
);


--
-- Name: CrmPreferredChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmPreferredChannel" AS ENUM (
    'CALL',
    'WHATSAPP',
    'EMAIL',
    'VISIT',
    'VIDEO'
);


--
-- Name: CrmQuoteItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmQuoteItemType" AS ENUM (
    'PRODUCT',
    'SERVICE',
    'COMBO',
    'MANUAL'
);


--
-- Name: CrmQuoteStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmQuoteStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'WON'
);


--
-- Name: CrmRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmRequestStatus" AS ENUM (
    'PENDIENTE',
    'COTIZADA'
);


--
-- Name: CrmServiceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmServiceType" AS ENUM (
    'BOTIQUINES',
    'EXTINTORES',
    'CAPACITACIONES',
    'CLINICAS_EMPRESARIALES',
    'SSO',
    'SERVICIOS_MEDICOS',
    'CONSULTAS',
    'LABORATORIO',
    'RAYOS_X',
    'ULTRASONIDO',
    'MEMBRESIAS'
);


--
-- Name: CrmSlaStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmSlaStatus" AS ENUM (
    'GREEN',
    'YELLOW',
    'RED'
);


--
-- Name: CrmTaskPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmTaskPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


--
-- Name: CrmTaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CrmTaskStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'DONE',
    'CANCELLED'
);


--
-- Name: DisciplinaryActionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DisciplinaryActionStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED'
);


--
-- Name: DisciplinaryActionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DisciplinaryActionType" AS ENUM (
    'LLAMADA_ATENCION',
    'AMONESTACION',
    'SUSPENSION',
    'TERMINACION',
    'TERMINACION_RECOMENDADA'
);


--
-- Name: DocStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocStatus" AS ENUM (
    'OPEN',
    'PARTIAL',
    'PAID',
    'CANCELLED'
);


--
-- Name: EvaluationQuestionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EvaluationQuestionType" AS ENUM (
    'TEXT',
    'MULTIPLE',
    'SCALE'
);


--
-- Name: FinanceEntityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinanceEntityType" AS ENUM (
    'CLIENT',
    'PROVIDER',
    'EMPLOYEE',
    'OTHER'
);


--
-- Name: FinancialAccountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinancialAccountType" AS ENUM (
    'CASH',
    'BANK',
    'POS'
);


--
-- Name: FinancialTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinancialTransactionType" AS ENUM (
    'IN',
    'OUT'
);


--
-- Name: FlowType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FlowType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


--
-- Name: HrDocumentVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrDocumentVisibility" AS ENUM (
    'PERSONAL',
    'EMPRESA',
    'RESTRINGIDO'
);


--
-- Name: HrEmployeeDocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrEmployeeDocumentType" AS ENUM (
    'DPI',
    'RTU',
    'RENAS',
    'POLICIACOS',
    'RECIBO_SERVICIO',
    'CONTRATO',
    'SANCION',
    'PERMISO',
    'OTRO',
    'CV'
);


--
-- Name: HrEmployeeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrEmployeeStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED'
);


--
-- Name: HrEmploymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrEmploymentType" AS ENUM (
    'DEPENDENCIA',
    'HONORARIOS',
    'OUTSOURCING',
    'TEMPORAL',
    'PRACTICAS'
);


--
-- Name: HrPaymentScheme; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrPaymentScheme" AS ENUM (
    'MONTHLY',
    'DAILY',
    'PER_SERVICE',
    'HOURLY'
);


--
-- Name: InventoryReportFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InventoryReportFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY'
);


--
-- Name: InventoryReportType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InventoryReportType" AS ENUM (
    'KARDEX',
    'MOVIMIENTOS',
    'CIERRE_SAT'
);


--
-- Name: JournalEntryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JournalEntryStatus" AS ENUM (
    'DRAFT',
    'POSTED',
    'REVERSED'
);


--
-- Name: LeaveStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: LeaveType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveType" AS ENUM (
    'VACACIONES',
    'INCAPACIDAD',
    'PERMISO'
);


--
-- Name: MailModuleKey; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MailModuleKey" AS ENUM (
    'INVENTARIO',
    'AGENDA',
    'FACTURACION',
    'CONTABILIDAD',
    'COMPRAS',
    'ADMIN',
    'SOPORTE'
);


--
-- Name: MembershipActionOnExceed; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipActionOnExceed" AS ENUM (
    'PREFERENTIAL_PRICE'
);


--
-- Name: MembershipBenefitFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipBenefitFrequency" AS ENUM (
    'ONCE',
    'MONTH',
    'YEAR',
    'CUSTOM'
);


--
-- Name: MembershipBenefitKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipBenefitKind" AS ENUM (
    'DISCOUNT',
    'SERVICE',
    'PRODUCT',
    'COMBO',
    'CATEGORY'
);


--
-- Name: MembershipBenefitTargetType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipBenefitTargetType" AS ENUM (
    'CONSULTA',
    'LAB',
    'IMAGEN',
    'FARMACIA',
    'OTRO'
);


--
-- Name: MembershipBillingFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipBillingFrequency" AS ENUM (
    'MONTHLY',
    'ANNUAL',
    'SEMIANNUAL',
    'QUARTERLY'
);


--
-- Name: MembershipBranchScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipBranchScope" AS ENUM (
    'ALL',
    'SOME',
    'AUTHORIZED'
);


--
-- Name: MembershipOwnerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipOwnerType" AS ENUM (
    'PERSON',
    'COMPANY'
);


--
-- Name: MembershipPaymentKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipPaymentKind" AS ENUM (
    'INITIAL',
    'RENEWAL',
    'EXTRA'
);


--
-- Name: MembershipPaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipPaymentMethod" AS ENUM (
    'CASH',
    'TRANSFER',
    'CARD'
);


--
-- Name: MembershipPaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipPaymentStatus" AS ENUM (
    'PAID',
    'PENDING',
    'FAILED'
);


--
-- Name: MembershipPlanType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipPlanType" AS ENUM (
    'INDIVIDUAL',
    'FAMILIAR',
    'EMPRESARIAL'
);


--
-- Name: MembershipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipStatus" AS ENUM (
    'ACTIVO',
    'PENDIENTE',
    'SUSPENDIDO',
    'VENCIDO',
    'CANCELADO'
);


--
-- Name: MembershipUsageModule; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipUsageModule" AS ENUM (
    'CONSULTA',
    'LAB',
    'IMAGEN',
    'FARMACIA',
    'CAJA'
);


--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovementType" AS ENUM (
    'ENTRY',
    'EXIT',
    'ADJUSTMENT',
    'COST_UPDATE',
    'PRICE_UPDATE'
);


--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'EMAIL',
    'WHATSAPP',
    'SMS',
    'PUSH'
);


--
-- Name: NotificationOutboxStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationOutboxStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


--
-- Name: NotificationSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'DOCUMENT_EXPIRY',
    'LICENSE_EXPIRY',
    'CONTRACT_EXPIRY'
);


--
-- Name: OnboardingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'ACTIVE'
);


--
-- Name: OvertimeRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OvertimeRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: PartyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PartyType" AS ENUM (
    'CLIENT',
    'PROVIDER',
    'PROFESSIONAL',
    'INSURER',
    'OTHER'
);


--
-- Name: PayFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayFrequency" AS ENUM (
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'TRANSFER',
    'POS',
    'CHECK',
    'OTHER'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'FACTURADO'
);


--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentType" AS ENUM (
    'AR',
    'AP'
);


--
-- Name: PayrollConceptType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollConceptType" AS ENUM (
    'EARNING',
    'DEDUCTION'
);


--
-- Name: PayrollRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRunStatus" AS ENUM (
    'DRAFT',
    'APPROVED',
    'PUBLISHED'
);


--
-- Name: PipelineRuleScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PipelineRuleScope" AS ENUM (
    'PIPELINE',
    'STAGE',
    'TRANSITION'
);


--
-- Name: PipelineRuleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PipelineRuleType" AS ENUM (
    'REQUIRED_FIELDS',
    'REQUIRED_NEXT_ACTION',
    'REQUIRE_QUOTE_STATUS',
    'DISALLOW_STAGE_FOR_PIPELINE',
    'REQUIRE_CONTRACT_OR_COLLECTION_PLAN',
    'REQUIRE_REASON_ON_LOST',
    'AMOUNT_APPROVAL_THRESHOLD'
);


--
-- Name: PurchaseOrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseOrderStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'RECEIVED_PARTIAL',
    'RECEIVED',
    'CANCELLED'
);


--
-- Name: PurchaseRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseRequestStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'ORDERED',
    'RECEIVED_PARTIAL',
    'RECEIVED',
    'CANCELLED'
);


--
-- Name: QuoteDeliveryChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteDeliveryChannel" AS ENUM (
    'EMAIL',
    'WHATSAPP'
);


--
-- Name: QuoteDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteDeliveryStatus" AS ENUM (
    'QUEUED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'BOUNCED',
    'PENDING_PROVIDER'
);


--
-- Name: QuoteRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteRequestStatus" AS ENUM (
    'PENDING',
    'QUOTED',
    'CANCELLED'
);


--
-- Name: QuoteStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVAL_PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: QuoteType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteType" AS ENUM (
    'B2B',
    'B2C'
);


--
-- Name: RuleSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RuleSeverity" AS ENUM (
    'BLOCK',
    'WARN'
);


--
-- Name: TimeClockLogSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimeClockLogSource" AS ENUM (
    'BIOMETRIC',
    'MANUAL'
);


--
-- Name: TimeClockLogType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimeClockLogType" AS ENUM (
    'IN',
    'OUT'
);


--
-- Name: UserPermissionEffect; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserPermissionEffect" AS ENUM (
    'GRANT',
    'DENY'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type public."AccountType" NOT NULL,
    "parentId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ApiIntegrationConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApiIntegrationConfig" (
    id text NOT NULL,
    key public."ApiIntegrationKey" NOT NULL,
    name text NOT NULL,
    "isEnabled" boolean DEFAULT false NOT NULL,
    "baseUrl" text,
    "apiKeyEnc" text,
    "apiSecretEnc" text,
    "tokenEnc" text,
    "extraJson" text,
    "lastTestAt" timestamp(3) without time zone,
    "lastTestError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AppConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppConfig" (
    id text NOT NULL,
    "companyName" text NOT NULL,
    "companyNit" text,
    "companyPhone" text,
    "companyAddress" text,
    "logoUrl" text,
    timezone text DEFAULT 'America/Guatemala'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "brandColor" text,
    "openingHours" jsonb
);


--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Appointment" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "durationMin" integer NOT NULL,
    "patientId" text NOT NULL,
    "specialistId" text NOT NULL,
    "branchId" text NOT NULL,
    "roomId" text,
    "typeId" text NOT NULL,
    status public."AppointmentStatus" DEFAULT 'PROGRAMADA'::public."AppointmentStatus" NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDIENTE'::public."PaymentStatus" NOT NULL,
    "companyId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text
);


--
-- Name: AppointmentType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppointmentType" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "durationMin" integer NOT NULL,
    color text,
    status text DEFAULT 'Activo'::text NOT NULL,
    availability jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AttendanceComputed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceComputed" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "totalHours" numeric(6,2),
    status public."AttendanceStatus" NOT NULL,
    color public."AttendanceColor" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AttendanceDay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceDay" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "shiftTemplateId" text,
    "branchId" text,
    "legalEntityId" text,
    "checkIn" timestamp(3) without time zone,
    "checkOut" timestamp(3) without time zone,
    "totalHours" numeric(6,2),
    "regularHours" numeric(6,2),
    "overtimeHours" numeric(6,2),
    "tardyMinutes" integer,
    status public."AttendanceStatus" NOT NULL,
    color public."AttendanceColor" NOT NULL,
    notes text,
    "isApproved" boolean DEFAULT false NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "closeStatus" public."AttendanceCloseStatus" DEFAULT 'OPEN'::public."AttendanceCloseStatus" NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedById" text,
    issues jsonb,
    "lastProcessedAt" timestamp(3) without time zone
);


--
-- Name: AttendanceIntegrationConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceIntegrationConfig" (
    id text NOT NULL,
    provider text NOT NULL,
    "apiUrl" text,
    "apiKeyEnc" text,
    enabled boolean DEFAULT true NOT NULL,
    "lastTestAt" timestamp(3) without time zone,
    "lastTestError" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actorUserId" text,
    "actorRole" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    metadata jsonb,
    before jsonb,
    after jsonb
);


--
-- Name: B2BProposalDoc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."B2BProposalDoc" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "sequenceYear" integer NOT NULL,
    "sequenceNumber" integer NOT NULL,
    "sequenceLabel" text NOT NULL,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    status public."B2BProposalStatus" DEFAULT 'DRAFT'::public."B2BProposalStatus" NOT NULL,
    title text,
    "contentJson" jsonb,
    "contentText" text,
    "totalDeclared" numeric(14,2),
    "lastPdfFileAssetId" text,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Branch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Branch" (
    id text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    address text,
    code text
);


--
-- Name: ClientProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClientProfile" (
    id text NOT NULL,
    type public."ClientProfileType" NOT NULL,
    "companyName" text,
    "firstName" text,
    "lastName" text,
    nit text,
    dpi text,
    email text,
    phone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Combo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Combo" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "priceFinal" numeric(12,4) DEFAULT 0 NOT NULL,
    "costProductsTotal" numeric(12,4) DEFAULT 0 NOT NULL,
    "costCalculated" numeric(12,4) DEFAULT 0 NOT NULL,
    "imageUrl" text,
    status text DEFAULT 'Activo'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ComboProduct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ComboProduct" (
    id text NOT NULL,
    "comboId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "unitCost" numeric(12,4)
);


--
-- Name: ComboService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ComboService" (
    id text NOT NULL,
    "comboId" text NOT NULL,
    "serviceId" text NOT NULL
);


--
-- Name: CompensationBonus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompensationBonus" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "engagementId" text,
    name text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CrmAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmAccount" (
    id text NOT NULL,
    name text NOT NULL,
    sector text,
    address text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clientId" text,
    "creditTerm" text,
    nit text,
    "ownerId" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL
);


--
-- Name: CrmActivity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmActivity" (
    id text NOT NULL,
    "dealId" text,
    "accountId" text,
    "contactId" text,
    type public."CrmActivityType" NOT NULL,
    "dateTime" timestamp(3) without time zone NOT NULL,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "nextStepDateTime" timestamp(3) without time zone,
    summary text
);


--
-- Name: CrmCalendarEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmCalendarEvent" (
    id text NOT NULL,
    "leadId" text,
    "quoteId" text,
    type public."CrmCalendarEventType" NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone,
    title text NOT NULL,
    notes text,
    "ownerId" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dealId" text
);


--
-- Name: CrmContact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmContact" (
    id text NOT NULL,
    "accountId" text,
    email text,
    phone text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clientId" text,
    "firstName" text NOT NULL,
    "lastName" text,
    "position" text,
    type text DEFAULT 'PERSON'::text NOT NULL,
    "phonesJson" jsonb
);


--
-- Name: CrmDeal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmDeal" (
    id text NOT NULL,
    "pipelineType" public."CrmPipelineType" NOT NULL,
    "ownerId" text,
    "accountId" text,
    "contactId" text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "amountEstimated" numeric(12,2) DEFAULT 0 NOT NULL,
    "expectedCloseDate" timestamp(3) without time zone,
    "lostReason" text,
    "probabilityPct" integer DEFAULT 0 NOT NULL,
    source text,
    stage public."CrmDealStage" DEFAULT 'NUEVO'::public."CrmDealStage" NOT NULL,
    competitor text,
    "nextAction" text,
    "nextActionAt" timestamp(3) without time zone,
    "pipelineId" text,
    "slaStatus" public."CrmSlaStatus" DEFAULT 'GREEN'::public."CrmSlaStatus" NOT NULL,
    "stageEnteredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "capturedById" text DEFAULT 'Ventas'::text NOT NULL,
    "preferredAt" timestamp(3) without time zone,
    "preferredChannel" public."CrmPreferredChannel",
    "servicesOtherNote" text,
    "branchId" text,
    "ownerUserId" text
);


--
-- Name: CrmDealServiceInterest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmDealServiceInterest" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "serviceType" public."CrmServiceType" NOT NULL,
    selected boolean DEFAULT true NOT NULL,
    notes text
);


--
-- Name: CrmDealStageHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmDealStageHistory" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "fromStage" public."CrmDealStage",
    "toStage" public."CrmDealStage" NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "changedById" text,
    comment text
);


--
-- Name: CrmLead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmLead" (
    id text NOT NULL,
    email text,
    phone text,
    source text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    address text,
    "clientId" text,
    "companyName" text,
    "leadType" public."CrmLeadType" NOT NULL,
    "nextActionAt" timestamp(3) without time zone,
    nit text,
    "ownerId" text,
    "personDpi" text,
    "personName" text,
    status public."CrmLeadStatus" DEFAULT 'NEW'::public."CrmLeadStatus" NOT NULL
);


--
-- Name: CrmPipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmPipeline" (
    id text NOT NULL,
    type public."CrmPipelineType" NOT NULL,
    name text NOT NULL,
    description text
);


--
-- Name: CrmPipelineStage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmPipelineStage" (
    id text NOT NULL,
    "pipelineId" text NOT NULL,
    stage public."CrmDealStage" NOT NULL,
    "probabilityPct" integer NOT NULL,
    "slaDays" integer NOT NULL,
    "expectedActions" jsonb,
    "order" integer NOT NULL
);


--
-- Name: CrmQuote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmQuote" (
    id text NOT NULL,
    "dealId" text,
    "quoteNumber" integer NOT NULL,
    status public."CrmQuoteStatus" DEFAULT 'DRAFT'::public."CrmQuoteStatus" NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "totalAmount" numeric(12,2) NOT NULL,
    "internalCost" numeric(12,2) DEFAULT 0 NOT NULL,
    "internalMargin" numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'GTQ'::text NOT NULL,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "leadId" text,
    "isActive" boolean DEFAULT false NOT NULL,
    sequence integer DEFAULT 1 NOT NULL,
    "versionLabel" text,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    "rejectedReason" text
);


--
-- Name: CrmQuoteItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmQuoteItem" (
    id text NOT NULL,
    "quoteId" text NOT NULL,
    "itemType" public."CrmQuoteItemType" NOT NULL,
    "itemId" text,
    qty integer NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    "lineTotal" numeric(12,2) NOT NULL,
    "costTotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "marginTotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "discountPct" integer,
    "manualDescription" text,
    "manualUnitPrice" numeric(12,2)
);


--
-- Name: CrmQuoteRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmQuoteRequest" (
    "quoteId" text NOT NULL,
    "requestId" text NOT NULL
);


--
-- Name: CrmRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmRequest" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    services public."CrmServiceType"[],
    description text NOT NULL,
    status public."CrmRequestStatus" DEFAULT 'PENDIENTE'::public."CrmRequestStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CrmTask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CrmTask" (
    id text NOT NULL,
    "ownerId" text,
    "dealId" text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    title text NOT NULL,
    status public."CrmTaskStatus" DEFAULT 'OPEN'::public."CrmTaskStatus" NOT NULL,
    priority public."CrmTaskPriority" DEFAULT 'MEDIUM'::public."CrmTaskPriority" NOT NULL,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DisciplinaryAction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DisciplinaryAction" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    type public."DisciplinaryActionType" NOT NULL,
    description text,
    "documentUrl" text,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "cooldownDays" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    title text NOT NULL,
    "endDate" timestamp(3) without time zone,
    "approvedById" text,
    comments text,
    "createdById" text,
    "startDate" timestamp(3) without time zone,
    status public."DisciplinaryActionStatus" DEFAULT 'DRAFT'::public."DisciplinaryActionStatus" NOT NULL
);


--
-- Name: DisciplinaryAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DisciplinaryAttachment" (
    id text NOT NULL,
    "disciplinaryActionId" text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileName" text NOT NULL,
    mime text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EmployeeBranchAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeBranchAssignment" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "branchId" text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    code text
);


--
-- Name: EmployeeCompensation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeCompensation" (
    id text NOT NULL,
    "engagementId" text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "baseSalary" numeric(12,2),
    currency text DEFAULT 'GTQ'::text NOT NULL,
    "payFrequency" public."PayFrequency" NOT NULL,
    allowances jsonb,
    deductions jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paymentScheme" public."HrPaymentScheme" DEFAULT 'MONTHLY'::public."HrPaymentScheme" NOT NULL
);


--
-- Name: EmployeeDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeDocument" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    type public."HrEmployeeDocumentType" NOT NULL,
    title text NOT NULL,
    notes text,
    "retentionUntil" timestamp(3) without time zone,
    "isArchived" boolean DEFAULT false NOT NULL,
    "currentVersionId" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    visibility public."HrDocumentVisibility" DEFAULT 'PERSONAL'::public."HrDocumentVisibility" NOT NULL
);


--
-- Name: EmployeeDocumentVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeDocumentVersion" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "versionNumber" integer NOT NULL,
    "fileUrl" text NOT NULL,
    "issuedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    notes text,
    "uploadedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "canEmployeeView" boolean DEFAULT false NOT NULL,
    "viewGrantedUntil" timestamp(3) without time zone
);


--
-- Name: EmployeeEngagement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeEngagement" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "legalEntityId" text NOT NULL,
    "employmentType" public."HrEmploymentType" NOT NULL,
    status public."HrEmployeeStatus" DEFAULT 'ACTIVE'::public."HrEmployeeStatus" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isPayrollEligible" boolean DEFAULT true NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "compensationAmount" numeric(12,2),
    "compensationCurrency" text DEFAULT 'GTQ'::text NOT NULL,
    "compensationFrequency" public."PayFrequency" DEFAULT 'MONTHLY'::public."PayFrequency" NOT NULL,
    "compensationNotes" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "baseSalary" numeric(12,2),
    "paymentScheme" public."HrPaymentScheme" DEFAULT 'MONTHLY'::public."HrPaymentScheme" NOT NULL,
    "baseAllowance" numeric(12,2)
);


--
-- Name: EmployeeEvaluation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeEvaluation" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "formId" text NOT NULL,
    score numeric(5,2),
    comments text,
    "evaluatedAt" timestamp(3) without time zone NOT NULL,
    "evaluatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EmployeePositionAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeePositionAssignment" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "positionId" text NOT NULL,
    "departmentId" text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeShiftAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeShiftAssignment" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "shiftTemplateId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EvaluationForm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EvaluationForm" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EvaluationQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EvaluationQuestion" (
    id text NOT NULL,
    "formId" text NOT NULL,
    type public."EvaluationQuestionType" NOT NULL,
    question text NOT NULL,
    options jsonb,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FileAsset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FileAsset" (
    id text NOT NULL,
    "storageKey" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    sha256 text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text,
    "originalName" text,
    "dealId" text
);


--
-- Name: FinanceAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FinanceAttachment" (
    id text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "uploadedById" text,
    "receivableId" text,
    "payableId" text,
    "paymentId" text
);


--
-- Name: FinanceCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FinanceCategory" (
    id text NOT NULL,
    "flowType" public."FlowType" NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FinanceSubcategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FinanceSubcategory" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FinancialAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FinancialAccount" (
    id text NOT NULL,
    name text NOT NULL,
    type public."FinancialAccountType" NOT NULL,
    currency text DEFAULT 'GTQ'::text NOT NULL,
    "branchId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accountNumber" text,
    "bankName" text,
    "legalEntityId" text NOT NULL
);


--
-- Name: FinancialTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FinancialTransaction" (
    id text NOT NULL,
    "financialAccountId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(14,2) NOT NULL,
    type public."FinancialTransactionType" NOT NULL,
    description text NOT NULL,
    reference text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HrAttendanceEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrAttendanceEvent" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    type text NOT NULL,
    source text DEFAULT 'MANUAL'::text NOT NULL,
    note text,
    "createdByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HrCompensationHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrCompensationHistory" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "prevSalary" numeric(12,2),
    "newSalary" numeric(12,2),
    "prevAllowance" numeric(12,2),
    "newAllowance" numeric(12,2),
    "prevPayScheme" public."HrPaymentScheme",
    "newPayScheme" public."HrPaymentScheme",
    comments text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HrDepartment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrDepartment" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HrEmployee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrEmployee" (
    id text NOT NULL,
    "employeeCode" text,
    "firstName" text,
    "lastName" text,
    dpi text,
    nit text,
    email text,
    phone text,
    "birthDate" timestamp(3) without time zone,
    address text,
    status public."HrEmployeeStatus" DEFAULT 'ACTIVE'::public."HrEmployeeStatus" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dpiPhotoUrl" text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "homePhone" text,
    "personalEmail" text,
    "photoUrl" text,
    "primaryLegalEntityId" text,
    "residenceProofUrl" text,
    "rtuFileUrl" text,
    "userId" text,
    "isExternal" boolean DEFAULT false NOT NULL,
    notes text,
    "completedAt" timestamp(3) without time zone,
    "onboardingStatus" public."OnboardingStatus" DEFAULT 'DRAFT'::public."OnboardingStatus" NOT NULL,
    "onboardingStep" integer DEFAULT 1 NOT NULL
);


--
-- Name: HrEmployeeWarning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrEmployeeWarning" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    title text NOT NULL,
    description text,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text
);


--
-- Name: HrPayrollLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrPayrollLine" (
    id text NOT NULL,
    "payrollRunId" text NOT NULL,
    "employeeId" text NOT NULL,
    "baseSalary" numeric(12,2) NOT NULL,
    bonuses numeric(12,2) DEFAULT 0 NOT NULL,
    deductions numeric(12,2) DEFAULT 0 NOT NULL,
    "netPay" numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HrPayrollRun; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrPayrollRun" (
    id text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdByUserId" text,
    "approvedByUserId" text,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HrPosition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrPosition" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HrSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrSettings" (
    id integer DEFAULT 1 NOT NULL,
    "currencyCode" text DEFAULT 'GTQ'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "logoUrl" text,
    "warningThreshold" integer,
    "warningWindowDays" integer
);


--
-- Name: HrWarningAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HrWarningAttachment" (
    id text NOT NULL,
    "warningId" text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileName" text NOT NULL,
    mime text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InventoryArea; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryArea" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "isExternal" boolean DEFAULT true NOT NULL
);


--
-- Name: InventoryEmailSchedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryEmailSchedule" (
    id text NOT NULL,
    email text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "reportType" public."InventoryReportType" DEFAULT 'KARDEX'::public."InventoryReportType" NOT NULL,
    "branchId" text,
    "scheduleType" text DEFAULT 'ONE_TIME'::text NOT NULL,
    "sendTime" text DEFAULT '23:30'::text NOT NULL,
    timezone text DEFAULT 'America/Guatemala'::text NOT NULL,
    "oneTimeDate" timestamp(3) without time zone,
    "monthlyDay" integer,
    "useLastDay" boolean DEFAULT true,
    "biweeklyMode" text DEFAULT 'FIXED_DAYS'::text,
    "fixedDays" text,
    "startDate" timestamp(3) without time zone,
    "lastSentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryEmailScheduleLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryEmailScheduleLog" (
    id text NOT NULL,
    "scheduleId" text NOT NULL,
    "reportType" public."InventoryReportType" NOT NULL,
    "periodFrom" timestamp(3) without time zone NOT NULL,
    "periodTo" timestamp(3) without time zone NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text NOT NULL,
    error text
);


--
-- Name: InventoryEmailSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryEmailSetting" (
    id text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    frequency public."InventoryReportFrequency" NOT NULL,
    "branchId" text,
    recipients text NOT NULL,
    "includeAllProducts" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastSentAt" timestamp(3) without time zone,
    "reportType" public."InventoryReportType" DEFAULT 'KARDEX'::public."InventoryReportType" NOT NULL,
    "biweeklyMode" text DEFAULT 'FIXED_DAYS'::text,
    "fixedDays" text,
    "monthlyDay" integer,
    "recipientsJson" text DEFAULT '[]'::text NOT NULL,
    "scheduleType" text DEFAULT 'BIWEEKLY'::text NOT NULL,
    "sendTime" text DEFAULT '23:30'::text NOT NULL,
    "startDate" timestamp(3) without time zone,
    timezone text DEFAULT 'America/Guatemala'::text NOT NULL,
    "useLastDay" boolean DEFAULT true,
    "oneTimeDate" timestamp(3) without time zone,
    "oneTimeTime" text,
    "sentAt" timestamp(3) without time zone
);


--
-- Name: InventoryMarginPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryMarginPolicy" (
    id text NOT NULL,
    "marginProductsPct" double precision,
    "marginServicesPct" double precision,
    "roundingMode" text DEFAULT 'NONE'::text NOT NULL,
    "autoApplyOnCreate" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryMovement" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "branchId" text NOT NULL,
    type public."MovementType" NOT NULL,
    quantity integer,
    "unitCost" numeric(12,4),
    "salePrice" numeric(12,4),
    reference text,
    reason text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InventoryReportLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryReportLog" (
    id text NOT NULL,
    "settingId" text NOT NULL,
    "periodFrom" timestamp(3) without time zone NOT NULL,
    "periodTo" timestamp(3) without time zone NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text NOT NULL,
    error text,
    "reportType" public."InventoryReportType" NOT NULL
);


--
-- Name: InvoiceConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceConfig" (
    id text NOT NULL,
    "legalName" text NOT NULL,
    nit text NOT NULL,
    "fiscalAddress" text,
    "defaultTaxRate" integer DEFAULT 12 NOT NULL,
    "invoiceFooterText" text,
    "pdfTemplateConfig" jsonb,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InvoiceSeries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceSeries" (
    id text NOT NULL,
    "invoiceConfigId" text NOT NULL,
    code text NOT NULL,
    "initialNumber" integer DEFAULT 1 NOT NULL,
    "currentNumber" integer DEFAULT 1 NOT NULL,
    "branchId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: JournalEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JournalEntry" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    reference text,
    description text,
    "branchId" text,
    "createdById" text NOT NULL,
    "totalDebit" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalCredit" numeric(14,2) DEFAULT 0 NOT NULL,
    status public."JournalEntryStatus" DEFAULT 'DRAFT'::public."JournalEntryStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "legalEntityId" text,
    "sourceId" text,
    "sourceType" text
);


--
-- Name: JournalEntryLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JournalEntryLine" (
    id text NOT NULL,
    "entryId" text NOT NULL,
    "accountId" text NOT NULL,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    memo text,
    "entityType" public."FinanceEntityType",
    "entityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LabIntegrationConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabIntegrationConfig" (
    id text NOT NULL,
    provider text NOT NULL,
    "apiUrl" text,
    "apiKeyEnc" text,
    enabled boolean DEFAULT true NOT NULL,
    "lastTestAt" timestamp(3) without time zone,
    "lastTestError" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LeaveBalance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LeaveBalance" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "policyId" text NOT NULL,
    "availableDays" numeric(6,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LeavePolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LeavePolicy" (
    id text NOT NULL,
    name text NOT NULL,
    "daysPerYear" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LeaveRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LeaveRequest" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "policyId" text,
    type public."LeaveType" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    days numeric(6,2) NOT NULL,
    status public."LeaveStatus" DEFAULT 'PENDING'::public."LeaveStatus" NOT NULL,
    "approvedBy" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LegalEntity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LegalEntity" (
    id text NOT NULL,
    name text NOT NULL,
    "comercialName" text,
    nit text,
    "fiscalAddress" text,
    phone text,
    email text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MailGlobalConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MailGlobalConfig" (
    id text NOT NULL,
    provider text,
    "smtpHost" text NOT NULL,
    "smtpPort" integer NOT NULL,
    "smtpSecure" boolean DEFAULT true NOT NULL,
    "imapHost" text NOT NULL,
    "imapPort" integer NOT NULL,
    "imapSecure" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MailModuleAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MailModuleAccount" (
    id text NOT NULL,
    "moduleKey" public."MailModuleKey" NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    "passwordEnc" text NOT NULL,
    "fromName" text,
    "fromEmail" text,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "lastTestAt" timestamp(3) without time zone,
    "lastTestError" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MembershipBenefit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipBenefit" (
    id text NOT NULL,
    "planId" text NOT NULL,
    kind public."MembershipBenefitKind" NOT NULL,
    "targetType" public."MembershipBenefitTargetType" NOT NULL,
    "targetId" text,
    "categoryId" text,
    "discountPercent" numeric(5,2),
    "includedQty" numeric(12,2),
    frequency public."MembershipBenefitFrequency" DEFAULT 'ONCE'::public."MembershipBenefitFrequency" NOT NULL,
    "resetEveryDays" integer,
    "branchScope" public."MembershipBranchScope" DEFAULT 'ALL'::public."MembershipBranchScope" NOT NULL,
    "branchIds" text[] DEFAULT ARRAY[]::text[],
    "actionOnExceed" public."MembershipActionOnExceed" DEFAULT 'PREFERENTIAL_PRICE'::public."MembershipActionOnExceed" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MembershipConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipConfig" (
    id integer DEFAULT 1 NOT NULL,
    "reminderDays" integer DEFAULT 30 NOT NULL,
    "graceDays" integer DEFAULT 7 NOT NULL,
    "inactiveAfterDays" integer DEFAULT 90 NOT NULL,
    "autoRenewWithPayment" boolean DEFAULT true NOT NULL,
    "prorateOnMidmonth" boolean DEFAULT true NOT NULL,
    "blockIfBalanceDue" boolean DEFAULT true NOT NULL,
    "requireInitialPayment" boolean DEFAULT true NOT NULL,
    "cashTransferMinMonths" integer DEFAULT 2 NOT NULL,
    "retryPolicy" jsonb,
    "priceChangeNoticeDays" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: membership_contract_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.membership_contract_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MembershipContract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipContract" (
    id text NOT NULL,
    code text DEFAULT concat('MBR-', lpad((nextval('public.membership_contract_code_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    "ownerType" public."MembershipOwnerType" NOT NULL,
    "ownerId" text,
    "planId" text NOT NULL,
    status public."MembershipStatus" DEFAULT 'PENDIENTE'::public."MembershipStatus" NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone,
    "nextRenewAt" timestamp(3) without time zone,
    "billingFrequency" public."MembershipBillingFrequency" DEFAULT 'MONTHLY'::public."MembershipBillingFrequency" NOT NULL,
    "priceLockedMonthly" numeric(12,2),
    "priceLockedAnnual" numeric(12,2),
    balance numeric(14,2) DEFAULT 0 NOT NULL,
    channel text,
    "assignedBranchId" text,
    "allowDependents" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MembershipDependent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipDependent" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    "personId" text,
    "relationType" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MembershipException; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipException" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    reason text NOT NULL,
    "allowBenefits" boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MembershipPayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipPayment" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    method public."MembershipPaymentMethod" NOT NULL,
    kind public."MembershipPaymentKind" NOT NULL,
    status public."MembershipPaymentStatus" DEFAULT 'PENDING'::public."MembershipPaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "refNo" text,
    "invoiceId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MembershipPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipPlan" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    type public."MembershipPlanType" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    description text,
    "priceMonthly" numeric(12,2) NOT NULL,
    "priceAnnual" numeric(12,2) NOT NULL,
    currency text DEFAULT 'GTQ'::text NOT NULL,
    "maxDependents" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MembershipUsage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipUsage" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    "benefitId" text,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    module public."MembershipUsageModule" NOT NULL,
    "referenceId" text,
    qty numeric(12,2) DEFAULT 1 NOT NULL,
    "amountDiscounted" numeric(12,2) DEFAULT 0 NOT NULL,
    "amountCharged" numeric(12,2) DEFAULT 0 NOT NULL,
    exceeded boolean DEFAULT false NOT NULL,
    "branchId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    type public."NotificationType" NOT NULL,
    severity public."NotificationSeverity" DEFAULT 'INFO'::public."NotificationSeverity" NOT NULL,
    title text NOT NULL,
    description text,
    "entityId" text,
    "entityType" text,
    "employeeId" text,
    "dueAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NotificationOutbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationOutbox" (
    id text NOT NULL,
    channel public."NotificationChannel" NOT NULL,
    "templateKey" text NOT NULL,
    payload jsonb NOT NULL,
    status public."NotificationOutboxStatus" DEFAULT 'PENDING'::public."NotificationOutboxStatus" NOT NULL,
    "entityId" text,
    "entityType" text,
    "scheduledAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OvertimeRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OvertimeRequest" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "attendanceDayId" text NOT NULL,
    "calculatedHours" numeric(6,2) NOT NULL,
    "requestedHours" numeric(6,2) NOT NULL,
    status public."OvertimeRequestStatus" DEFAULT 'PENDING'::public."OvertimeRequestStatus" NOT NULL,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Party; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Party" (
    id text NOT NULL,
    type public."PartyType" NOT NULL,
    name text NOT NULL,
    nit text,
    email text,
    phone text,
    address text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payable" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    amount numeric(12,2) NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryId" text,
    "legalEntityId" text NOT NULL,
    "partyId" text NOT NULL,
    "subcategoryId" text,
    status public."DocStatus" DEFAULT 'OPEN'::public."DocStatus" NOT NULL
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    type public."PaymentType" NOT NULL,
    "receivableId" text,
    "payableId" text,
    "financialAccountId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    reference text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "legalEntityId" text NOT NULL,
    method public."PaymentMethod" NOT NULL
);


--
-- Name: PayrollConcept; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollConcept" (
    id text NOT NULL,
    code text NOT NULL,
    type public."PayrollConceptType" NOT NULL,
    description text NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    "isEditable" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PayrollEmployee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollEmployee" (
    id text NOT NULL,
    "payrollRunId" text NOT NULL,
    "employeeId" text NOT NULL,
    "engagementId" text,
    "employmentType" public."HrEmploymentType" NOT NULL,
    "baseSalary" numeric(14,2),
    "workedDays" integer,
    "workedHours" numeric(8,2),
    "overtimeHours" numeric(8,2),
    "grossAmount" numeric(14,2),
    "totalDeductions" numeric(14,2),
    "netAmount" numeric(14,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PayrollEmployeeConcept; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollEmployeeConcept" (
    id text NOT NULL,
    "payrollEmployeeId" text NOT NULL,
    "conceptId" text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    amount numeric(14,2) NOT NULL,
    total numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PayrollFinanceRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollFinanceRecord" (
    id text NOT NULL,
    "payrollRunId" text NOT NULL,
    "payrollEmployeeId" text,
    "payableId" text,
    amount numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PayrollRun; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollRun" (
    id text NOT NULL,
    "legalEntityId" text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    status public."PayrollRunStatus" DEFAULT 'DRAFT'::public."PayrollRunStatus" NOT NULL,
    notes text,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    code text NOT NULL,
    "totalGross" numeric(14,2),
    "totalDeductions" numeric(14,2),
    "totalNet" numeric(14,2),
    "publishedAt" timestamp(3) without time zone
);


--
-- Name: PayrollRunEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollRunEntry" (
    id text NOT NULL,
    "payrollRunId" text NOT NULL,
    "engagementId" text NOT NULL,
    "compensationSnapshot" jsonb,
    "grossAmount" numeric(14,2),
    "netAmount" numeric(14,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    key text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    module text DEFAULT 'GENERAL'::text NOT NULL,
    area text DEFAULT 'CORE'::text NOT NULL,
    action text DEFAULT 'READ'::text NOT NULL
);


--
-- Name: PipelineConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PipelineConfig" (
    id text NOT NULL,
    name text NOT NULL,
    type public."CrmPipelineType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PipelineRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PipelineRule" (
    id text NOT NULL,
    "ruleSetId" text NOT NULL,
    type public."PipelineRuleType" NOT NULL,
    severity public."RuleSeverity" DEFAULT 'BLOCK'::public."RuleSeverity" NOT NULL,
    message text NOT NULL,
    params jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PipelineRuleSet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PipelineRuleSet" (
    id text NOT NULL,
    "pipelineId" text NOT NULL,
    scope public."PipelineRuleScope" NOT NULL,
    "stageKey" text,
    "fromStageKey" text,
    "toStageKey" text,
    name text NOT NULL,
    description text,
    priority integer DEFAULT 100 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PipelineStage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PipelineStage" (
    id text NOT NULL,
    "pipelineId" text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    "slaDays" integer DEFAULT 0 NOT NULL,
    probability integer DEFAULT 0 NOT NULL,
    "isTerminal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PipelineTransition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PipelineTransition" (
    id text NOT NULL,
    "pipelineId" text NOT NULL,
    "fromStageKey" text NOT NULL,
    "toStageKey" text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PriceList; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceList" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    estado text DEFAULT 'Activo'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PriceListItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceListItem" (
    id text NOT NULL,
    "priceListId" text NOT NULL,
    "itemType" text NOT NULL,
    "itemId" text NOT NULL,
    precio double precision NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "categoryId" text NOT NULL,
    "subcategoryId" text,
    "inventoryAreaId" text,
    unit text,
    cost numeric(12,4) DEFAULT 0 NOT NULL,
    price numeric(12,4) DEFAULT 0 NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "avgCost" numeric(12,4) DEFAULT 0 NOT NULL,
    "baseSalePrice" numeric(12,4) DEFAULT 0 NOT NULL,
    "marginPct" double precision
);


--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCategory" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    type text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL
);


--
-- Name: ProductStock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductStock" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "branchId" text NOT NULL,
    stock integer NOT NULL,
    "minStock" integer NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductSubcategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductSubcategory" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL
);


--
-- Name: ProfessionalLicense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfessionalLicense" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    applies boolean DEFAULT false NOT NULL,
    number text,
    "issuedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "issuingEntity" text,
    "fileUrl" text,
    "reminderDays" integer,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PurchaseOrder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseOrder" (
    id text NOT NULL,
    code text NOT NULL,
    "supplierId" text NOT NULL,
    "branchId" text NOT NULL,
    "createdById" text NOT NULL,
    status public."PurchaseOrderStatus" DEFAULT 'DRAFT'::public."PurchaseOrderStatus" NOT NULL,
    "requestId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PurchaseOrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseOrderItem" (
    id text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(12,2),
    "receivedQty" integer DEFAULT 0 NOT NULL
);


--
-- Name: PurchaseRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseRequest" (
    id text NOT NULL,
    code text NOT NULL,
    "branchId" text NOT NULL,
    "requestedById" text NOT NULL,
    status public."PurchaseRequestStatus" DEFAULT 'DRAFT'::public."PurchaseRequestStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PurchaseRequestItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseRequestItem" (
    id text NOT NULL,
    "purchaseRequestId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    "unitId" text,
    "supplierId" text,
    notes text
);


--
-- Name: Quote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Quote" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    type public."QuoteType" NOT NULL,
    status public."QuoteStatus" DEFAULT 'DRAFT'::public."QuoteStatus" NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    number text NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text,
    "sentAt" timestamp(3) without time zone,
    "approvalRequestedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedById" text,
    "rejectionReason" text,
    "templateId" text,
    notes text,
    "validityDays" integer DEFAULT 30 NOT NULL,
    currency text DEFAULT 'GTQ'::text NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    "discountTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "taxTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    "pdfUrl" text,
    "pdfGeneratedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "chequePayableTo" text,
    "deliveryNote" text,
    "deliveryTime" text,
    "paymentTerms" text,
    "pricesIncludeTax" boolean DEFAULT true NOT NULL
);


--
-- Name: QuoteDelivery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuoteDelivery" (
    id text NOT NULL,
    "quoteId" text NOT NULL,
    "dealId" text,
    channel public."QuoteDeliveryChannel" NOT NULL,
    "to" jsonb NOT NULL,
    cc jsonb,
    bcc jsonb,
    subject text NOT NULL,
    "bodyText" text,
    "bodyHtml" text,
    "pdfUrl" text NOT NULL,
    "pdfHash" text NOT NULL,
    "pdfVersion" integer DEFAULT 1 NOT NULL,
    "fileAssetId" text,
    status public."QuoteDeliveryStatus" DEFAULT 'SENDING'::public."QuoteDeliveryStatus" NOT NULL,
    provider text DEFAULT 'SMTP'::text NOT NULL,
    "providerMessageId" text,
    "actorUserId" text,
    metadata jsonb,
    "sentAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "errorCode" text,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: QuoteItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuoteItem" (
    id text NOT NULL,
    "quoteId" text NOT NULL,
    category text NOT NULL,
    "productName" text NOT NULL,
    "refCode" text,
    description text,
    qty numeric(12,2) NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    "discountPct" numeric(5,2),
    "lineTotal" numeric(14,2) NOT NULL,
    enlace text
);


--
-- Name: QuoteRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuoteRequest" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text,
    services public."CrmServiceType"[],
    description text NOT NULL,
    status public."QuoteRequestStatus" DEFAULT 'PENDING'::public."QuoteRequestStatus" NOT NULL,
    "quoteId" text
);


--
-- Name: QuoteSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuoteSettings" (
    id integer DEFAULT 1 NOT NULL,
    "defaultTemplateB2BId" text,
    "defaultTemplateB2CId" text,
    "defaultValidityDays" integer DEFAULT 30 NOT NULL,
    "defaultIntroLetterHtml" text,
    "defaultTermsB2BHtml" text,
    "defaultTermsB2CHtml" text,
    "defaultFooterJson" jsonb,
    "defaultBankAccountsJson" jsonb,
    "defaultChequePayableTo" text,
    "defaultPaymentTerms" text,
    "defaultDeliveryTime" text,
    "defaultDeliveryNote" text,
    "showTaxIncludedText" boolean DEFAULT true NOT NULL,
    "showBankBlock" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: QuoteTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuoteTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    type public."QuoteType" NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sectionsJson" jsonb,
    "headerJson" jsonb,
    "coverImageUrl" text,
    "introLetterHtml" text,
    "experienceLogosJson" jsonb,
    "termsHtml" text,
    "bankAccountsJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Receivable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Receivable" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    amount numeric(12,2) NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryId" text,
    "creditTerm" public."CreditTerm" DEFAULT 'CASH'::public."CreditTerm" NOT NULL,
    "legalEntityId" text NOT NULL,
    "partyId" text NOT NULL,
    "subcategoryId" text,
    status public."DocStatus" DEFAULT 'OPEN'::public."DocStatus" NOT NULL
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isSystem" boolean DEFAULT false NOT NULL,
    "legalEntityId" text
);


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermission" (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Room; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Room" (
    id text NOT NULL,
    name text NOT NULL,
    "branchId" text NOT NULL,
    resource text NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RuleEvaluationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RuleEvaluationLog" (
    id text NOT NULL,
    "pipelineId" text NOT NULL,
    "dealId" text NOT NULL,
    "fromStageKey" text,
    "toStageKey" text,
    allowed boolean NOT NULL,
    errors jsonb,
    warnings jsonb,
    "evaluatedRules" jsonb,
    "actorUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SequenceCounter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequenceCounter" (
    id text NOT NULL,
    key text NOT NULL,
    "currentValue" integer NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Service; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Service" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    "categoryId" text NOT NULL,
    "subcategoryId" text,
    price double precision DEFAULT 0 NOT NULL,
    "durationMin" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "marginPct" double precision
);


--
-- Name: ServiceCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ServiceCategory" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    area text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL
);


--
-- Name: ServiceSubcategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ServiceSubcategory" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Activo'::text NOT NULL
);


--
-- Name: ShiftTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "crossesMidnight" boolean DEFAULT false NOT NULL,
    "weeklyPattern" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "toleranceMinutes" integer DEFAULT 0 NOT NULL,
    "maxDailyHours" numeric(6,2),
    "maxWeeklyHours" numeric(6,2)
);


--
-- Name: TimeClockDevice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimeClockDevice" (
    id text NOT NULL,
    name text NOT NULL,
    "ipAddress" text,
    location text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "branchId" text,
    "legalEntityId" text,
    "lastSyncAt" timestamp(3) without time zone
);


--
-- Name: TimeClockLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimeClockLog" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "deviceId" text,
    "timestamp" timestamp(3) without time zone NOT NULL,
    type public."TimeClockLogType" NOT NULL,
    source public."TimeClockLogSource" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "branchId" text,
    "legalEntityId" text
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "passwordHash" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "branchId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserPermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserPermission" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "permissionId" text NOT NULL,
    effect public."UserPermissionEffect" NOT NULL,
    reason text,
    "legalEntityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRole" (
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WorkSchedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkSchedule" (
    id text NOT NULL,
    "specialistId" text NOT NULL,
    "branchId" text NOT NULL,
    weekdays text[],
    blocks jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Account" (id, code, name, type, "parentId", "isActive", "createdAt", "updatedAt") FROM stdin;
cmjreroo6000c12uquo0bqu7a	1-01	Caja	ASSET	\N	t	2025-12-29 17:04:27.558	2026-01-20 01:23:18.823
cmjreroo9000d12uq34228i3b	1-02	Bancos	ASSET	\N	t	2025-12-29 17:04:27.561	2026-01-20 01:23:18.999
cmjrerooa000e12uquy5nviks	1-03	Cuentas por cobrar	ASSET	\N	t	2025-12-29 17:04:27.562	2026-01-20 01:23:19.082
cmjreroob000f12uqc5m1iqvx	2-01	Cuentas por pagar	LIABILITY	\N	t	2025-12-29 17:04:27.563	2026-01-20 01:23:19.168
cmjrerooc000g12uq3tdqd0js	1-04	Inventario	ASSET	\N	t	2025-12-29 17:04:27.565	2026-01-20 01:23:19.25
cmjrerood000h12uqywsyve5z	4-01	Ventas	INCOME	\N	t	2025-12-29 17:04:27.566	2026-01-20 01:23:19.331
cmjreroof000i12uqf6yjbytj	5-01	Costos	EXPENSE	\N	t	2025-12-29 17:04:27.567	2026-01-20 01:23:19.415
cmjreroog000j12uqgbzxpl99	5-02	Gastos administrativos	EXPENSE	\N	t	2025-12-29 17:04:27.568	2026-01-20 01:23:19.493
\.


--
-- Data for Name: ApiIntegrationConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiIntegrationConfig" (id, key, name, "isEnabled", "baseUrl", "apiKeyEnc", "apiSecretEnc", "tokenEnc", "extraJson", "lastTestAt", "lastTestError", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AppConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppConfig" (id, "companyName", "companyNit", "companyPhone", "companyAddress", "logoUrl", timezone, "updatedAt", "createdAt", "brandColor", "openingHours") FROM stdin;
\.


--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Appointment" (id, date, "durationMin", "patientId", "specialistId", "branchId", "roomId", "typeId", status, "paymentStatus", "companyId", notes, "createdAt", "updatedAt", "createdById", "updatedById") FROM stdin;
c1	2025-12-09 15:00:00	30	p1	m1	s1	room1	t1	PROGRAMADA	PENDIENTE	\N	Consulta general	2025-12-29 17:04:27.538	2025-12-29 17:04:27.538	admin-1	\N
\.


--
-- Data for Name: AppointmentType; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppointmentType" (id, name, description, "durationMin", color, status, availability, "createdAt", "updatedAt") FROM stdin;
t1	Consulta general	Atención médica general	30	#007AFF	Activo	\N	2025-12-29 17:04:27.507	2025-12-29 17:04:27.507
t2	Rayos X	Estudios de imagen	20	#34B3E6	Activo	\N	2025-12-29 17:04:27.522	2025-12-29 17:04:27.522
t3	Ultrasonido	USG diagnóstico	25	#F59E0B	Activo	\N	2025-12-29 17:04:27.524	2025-12-29 17:04:27.524
\.


--
-- Data for Name: AttendanceComputed; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceComputed" (id, "employeeId", date, "totalHours", status, color, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: AttendanceDay; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceDay" (id, "employeeId", date, "shiftTemplateId", "branchId", "legalEntityId", "checkIn", "checkOut", "totalHours", "regularHours", "overtimeHours", "tardyMinutes", status, color, notes, "isApproved", "approvedById", "approvedAt", "createdAt", "updatedAt", "closeStatus", "closedAt", "closedById", issues, "lastProcessedAt") FROM stdin;
\.


--
-- Data for Name: AttendanceIntegrationConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceIntegrationConfig" (id, provider, "apiUrl", "apiKeyEnc", enabled, "lastTestAt", "lastTestError", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "timestamp", "actorUserId", "actorRole", action, "entityType", "entityId", metadata, before, after) FROM stdin;
cmjufd7ib00013oto5dw7t8km	2025-12-31 19:44:30.276	\N	\N	LOGIN_FAILED	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "7baff3a8-720c-4176-83c1-72553b86c97a", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmjufdd3500033otoa2k9pbdr	2025-12-31 19:44:37.505	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "5bc85004-7814-4bcc-bf4c-c6efd4610db0", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmjumogkf0008laocgbqeot6n	2025-12-31 23:09:12.543	cmjuf58yo000y13t7i9phjzy4	ADMIN	DEAL_CREATED	DEAL	cmjumogjp0004laoc5m2ftkml	{"ip": "::1", "route": "/api/crm/deals", "requestId": "cdd49c4b-8e5c-4145-81f4-48abdd4e2701", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	{"stage": "NUEVO", "amount": 0, "ownerId": "ventas", "ownerUserId": "cmjuf58yo000y13t7i9phjzy4"}
cmjumpuzw000elaoc75sa43y2	2025-12-31 23:10:17.9	cmjuf58yo000y13t7i9phjzy4	ADMIN	QUOTE_CREATED	QUOTE	cmjumpuzm000blaocpzkgbfvh	{"ip": "::1", "route": "/api/crm/quotes-v2", "requestId": "f2f8bc1d-6e39-44c6-9058-29e35cef70ba", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	{"total": 250, "dealId": "cmjumogjp0004laoc5m2ftkml", "status": "DRAFT"}
cmk2zy1700001ws0j88uobtun	2026-01-06 19:42:43.597	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "e552d69b-4c87-454d-9be5-6c7ebdb5d73d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmk4o7js90001wb18ouhi2bt9	2026-01-07 23:49:44.553	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "2c696843-8b2f-45e1-9fdd-a93eb8b9bf45", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmk4up1070001pqie8l4snc9u	2026-01-08 02:51:17.719	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "53bf7a04-8337-4133-89a1-0e1471d7cecc", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmk5jmqhh000113dor8c8wn5k	2026-01-08 14:29:21.173	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "169cc33b-a448-44a0-9c35-40aa1944b83d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmk719fqm0001b87j3bsju6k4	2026-01-09 15:30:39.982	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "df204994-bf96-4cfb-bf26-b11a1e7610fe", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmkbdpsnn0001xzugcrpg03f6	2026-01-12 16:30:23.315	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "fd826a95-07a8-4c1c-aeb1-6f27014c15a0", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmkbyevoq000hxzuglz32609r	2026-01-13 02:09:45.96	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "5088edf3-86fd-47c7-933a-93cbce0503bb", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmkcr7rse0001lxih1z6fnj0f	2026-01-13 15:36:03.181	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "a1b90569-cdcd-49ac-8f40-269742479980", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmkd8g7nt00015d2g0h4p73sv	2026-01-13 23:38:30.472	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "b2e07e1e-431d-4788-9feb-4f18bb0a678c", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmkdh4908000166uv8vn4xqa9	2026-01-14 03:41:08.887	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "f5371b1b-f0a6-433e-a109-54c90c8f69e8", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	null	null
cmkldz30e0001e34rcetnoel7	2026-01-19 16:35:18.398	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "3bb4e545-59af-45af-9089-c15a5a8062de", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	null	null
cmklkuqfi0001lojph2tdi46i	2026-01-19 19:47:52.781	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "d24896b4-5008-47c3-bddb-2d803fa8208c", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	null	null
cmkm27g1y0003lojpv9vfuqmk	2026-01-20 03:53:39.334	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "7cd90c6a-0ffe-4f21-8414-91c4a37f19a8", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	null	null
cmkmtzpm60001eoqsbg3pqvvr	2026-01-20 16:51:27.726	cmjuf58yo000y13t7i9phjzy4	ADMIN	LOGIN_SUCCESS	SECURITY	cmjuf58yo000y13t7i9phjzy4	{"ip": "::1", "email": "nelsonlopezallen@gmail.com", "route": "/api/login", "requestId": "2c6637bf-cfcf-4598-9331-2852087beb0f", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	null	null
\.


--
-- Data for Name: B2BProposalDoc; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."B2BProposalDoc" (id, "dealId", "sequenceYear", "sequenceNumber", "sequenceLabel", "versionNumber", status, title, "contentJson", "contentText", "totalDeclared", "lastPdfFileAssetId", "createdByUserId", "updatedByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Branch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Branch" (id, name, "isActive", "createdById", "createdAt", "updatedAt", address, code) FROM stdin;
s1	Palín	t	\N	2026-01-08 02:54:27.285	2026-01-20 01:23:14.193	Palín, Escuintla	PAL
s2	Escuintla	t	\N	2026-01-08 02:54:27.437	2026-01-20 01:23:14.359	Escuintla	ESC
\.


--
-- Data for Name: ClientProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClientProfile" (id, type, "companyName", "firstName", "lastName", nit, dpi, email, phone, "createdAt", "updatedAt") FROM stdin;
cmjrft5ba00001ohn23nzw5k4	COMPANY	Allen MKT	\N	\N	1014792178	\N	nelsonlopezallen@gmail.com	31255656	2025-12-29 17:33:35.398	2025-12-29 17:33:35.398
cmjrl5eul0000olleiiafcohr	PERSON	\N	Nelson Sebastian	Lopez Allen	\N	\N	nelsonlopezallen@gmail.com	+502 31255656	2025-12-29 20:03:05.708	2025-12-29 20:03:05.708
cmjrlljgz000013m5vpprcqs8	PERSON	\N	Nelson Sebastian	Lopez Allen	\N	\N	\N	+502 31255656	2025-12-29 20:15:38.195	2025-12-29 20:15:38.195
cmjrybat70002avwk2njghc62	COMPANY	ALLEN MKTT	\N	\N	101478267	\N	NELSONLOPEZALLEN@GMAIL.COM	31255656	2025-12-30 02:11:35.419	2025-12-30 02:11:35.419
\.


--
-- Data for Name: Combo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Combo" (id, name, description, "priceFinal", "costProductsTotal", "costCalculated", "imageUrl", status, "createdAt", "updatedAt") FROM stdin;
combo-chequeo-basico	Chequeo basico empresa	\N	650.0000	0.0000	0.0000	\N	Activo	2025-12-29 20:06:06.863	2025-12-29 20:06:06.863
\.


--
-- Data for Name: ComboProduct; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ComboProduct" (id, "comboId", "productId", quantity, "unitCost") FROM stdin;
\.


--
-- Data for Name: ComboService; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ComboService" (id, "comboId", "serviceId") FROM stdin;
cmjrl9ams000pb58nx7z6h2fg	combo-chequeo-basico	cmjrl8thz000hgl4vngzqqbgt
\.


--
-- Data for Name: CompensationBonus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CompensationBonus" (id, "employeeId", "engagementId", name, amount, "isActive", "createdAt") FROM stdin;
cmkcsexnx0005clcuuvuxa3c2	cmkcsex1w0000clcu1finx065	\N	Bono transporte	500.00	t	2026-01-13 16:09:37.005
cmkcsexnx0006clcujc0nmz8g	cmkcsex1w0000clcu1finx065	\N	Bono desempeño	750.00	t	2026-01-13 16:09:37.005
cmkllohzr0007ucasy4wkggc0	cmklloh710002ucasqjszd33c	eng-f02f36	Bono transporte	300.00	t	2026-01-19 20:11:01.527
cmkllohzr0008ucaspuw291zf	cmklloh710002ucasqjszd33c	eng-f02f36	Bono productividad	500.00	t	2026-01-19 20:11:01.527
\.


--
-- Data for Name: CrmAccount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmAccount" (id, name, sector, address, "createdById", "createdAt", "updatedAt", "clientId", "creditTerm", nit, "ownerId", status) FROM stdin;
cmjreropo002412uq3oablgsw	Clinica San Pedro	Salud	Zona 1, Escuintla	ventas-1	2025-12-29 17:04:27.612	2025-12-29 17:04:27.612	\N	30	CF	ventas-1	ACTIVE
cmjrf08h1001yb8x1v9pdntql	Clinica San Pedro	Salud	Zona 1, Escuintla	ventas-1	2025-12-29 17:11:06.47	2025-12-29 17:11:06.47	\N	30	CF	ventas-1	ACTIVE
cmjrft5bn00021ohn7i2duaea	Allen MKT	\N	2da calle a 13-04 zona 15	Administrador	2025-12-29 17:33:35.411	2025-12-29 17:33:35.411	cmjrft5ba00001ohn23nzw5k4	\N	1014792178	Administrador	ACTIVE
cmjrjntsj000c1ohn17b1oha5	ALLEN MKT	\N	2da calle a 13-04 zona 15	Administrador	2025-12-29 19:21:25.651	2025-12-29 19:21:25.651	cmjrft5ba00001ohn23nzw5k4	\N	101479278	Administrador	ACTIVE
cmjrybatd0004avwkvtwe82pd	ALLEN MKTT	\N	2da calle a 13-04 zona 15	Administrador	2025-12-30 02:11:35.425	2025-12-30 02:11:35.425	cmjrybat70002avwk2njghc62	\N	101478267	Administrador	ACTIVE
cmjumogef0001laocywwygyro	CENTRO DE ACTIVOS LA ZONA	\N	2da calle a 13-04 zona 15 colonia tecun uman.	Administrador	2025-12-31 23:09:12.327	2025-12-31 23:09:12.327	cmjrft5ba00001ohn23nzw5k4	\N	48466484	Administrador	ACTIVE
cmk4uvebv002suje178bo7vhg	Clinica San Pedro	Salud	Zona 1, Escuintla	ventas-1	2026-01-08 02:56:14.923	2026-01-08 02:56:14.923	\N	30	CF	ventas-1	ACTIVE
cmk4uwij2002sfo0fh59viizr	Clinica San Pedro	Salud	Zona 1, Escuintla	ventas-1	2026-01-08 02:57:07.022	2026-01-08 02:57:07.022	\N	30	CF	ventas-1	ACTIVE
cmk7cwpe0003hkko62jf3eo23	Clinica San Pedro	Salud	Zona 1, Escuintla	ventas-1	2026-01-09 20:56:41.352	2026-01-09 20:56:41.352	\N	30	CF	ventas-1	ACTIVE
cmklwuj1m006eg4lnhf5xrykv	Clinica San Pedro	Salud	Zona 1, Escuintla	ventas-1	2026-01-20 01:23:38.602	2026-01-20 01:23:38.602	\N	30	CF	ventas-1	ACTIVE
\.


--
-- Data for Name: CrmActivity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmActivity" (id, "dealId", "accountId", "contactId", type, "dateTime", notes, "createdById", "createdAt", "updatedAt", "nextStepDateTime", summary) FROM stdin;
cmjreropy002b12uq1v22av63	cmjreropt002812uq4vrp1bwe	cmjreropo002412uq3oablgsw	cmjreropq002612uqsgjhspw7	CALL	2025-12-29 17:04:27.622	Solicitar info de convenios	ventas-1	2025-12-29 17:04:27.623	2025-12-29 17:04:27.623	\N	Llamada inicial
cmjreropy002c12uqgs5wwd5r	cmjreropt002812uq4vrp1bwe	cmjreropo002412uq3oablgsw	cmjreropq002612uqsgjhspw7	EMAIL	2025-12-29 17:04:27.622	Enviar propuesta	ventas-1	2025-12-29 17:04:27.623	2025-12-29 17:04:27.623	\N	Envío brochure
cmjrf08h80025b8x1j6ee3zzd	cmjrf08h40022b8x1ktl5ivn5	cmjrf08h1001yb8x1v9pdntql	cmjrf08h30020b8x1jytpkazv	CALL	2025-12-29 17:11:06.476	Solicitar info de convenios	ventas-1	2025-12-29 17:11:06.477	2025-12-29 17:11:06.477	\N	Llamada inicial
cmjrf08h80026b8x1ju719vrr	cmjrf08h40022b8x1ktl5ivn5	cmjrf08h1001yb8x1v9pdntql	cmjrf08h30020b8x1jytpkazv	EMAIL	2025-12-29 17:11:06.476	Enviar propuesta	ventas-1	2025-12-29 17:11:06.477	2025-12-29 17:11:06.477	\N	Envío brochure
cmk4uvfbp002zuje18got858b	cmk4uvent002wuje1tnbzoqj3	cmk4uvebv002suje178bo7vhg	cmk4uvehx002uuje11fnlyhrs	CALL	2026-01-08 02:56:16.212	Solicitar info de convenios	ventas-1	2026-01-08 02:56:16.213	2026-01-08 02:56:16.213	\N	Llamada inicial
cmk4uvfbp0030uje1yffp7lja	cmk4uvent002wuje1tnbzoqj3	cmk4uvebv002suje178bo7vhg	cmk4uvehx002uuje11fnlyhrs	EMAIL	2026-01-08 02:56:16.212	Enviar propuesta	ventas-1	2026-01-08 02:56:16.213	2026-01-08 02:56:16.213	\N	Envío brochure
cmk4uwj9d002zfo0f36aqpohh	cmk4uwiry002wfo0fup2awzxj	cmk4uwij2002sfo0fh59viizr	cmk4uwinl002ufo0fdxdftzai	CALL	2026-01-08 02:57:07.968	Solicitar info de convenios	ventas-1	2026-01-08 02:57:07.969	2026-01-08 02:57:07.969	\N	Llamada inicial
cmk4uwj9d0030fo0fyn9xm0xv	cmk4uwiry002wfo0fup2awzxj	cmk4uwij2002sfo0fh59viizr	cmk4uwinl002ufo0fdxdftzai	EMAIL	2026-01-08 02:57:07.968	Enviar propuesta	ventas-1	2026-01-08 02:57:07.969	2026-01-08 02:57:07.969	\N	Envío brochure
cmk7cwq6c003okko6v1g07a8x	cmk7cwpnp003lkko6affe0a6y	cmk7cwpe0003hkko62jf3eo23	cmk7cwpix003jkko6grspbgyg	CALL	2026-01-09 20:56:42.372	Solicitar info de convenios	ventas-1	2026-01-09 20:56:42.372	2026-01-09 20:56:42.372	\N	Llamada inicial
cmk7cwq6c003pkko63jh4q9z7	cmk7cwpnp003lkko6affe0a6y	cmk7cwpe0003hkko62jf3eo23	cmk7cwpix003jkko6grspbgyg	EMAIL	2026-01-09 20:56:42.372	Enviar propuesta	ventas-1	2026-01-09 20:56:42.372	2026-01-09 20:56:42.372	\N	Envío brochure
cmklwuju1006lg4lnjtfwyic4	cmklwujbj006ig4ln1d3yqutu	cmklwuj1m006eg4lnhf5xrykv	cmklwuj6q006gg4lnry7t8c5r	CALL	2026-01-20 01:23:39.624	Solicitar info de convenios	ventas-1	2026-01-20 01:23:39.625	2026-01-20 01:23:39.625	\N	Llamada inicial
cmklwuju1006mg4lnexevkqgl	cmklwujbj006ig4ln1d3yqutu	cmklwuj1m006eg4lnhf5xrykv	cmklwuj6q006gg4lnry7t8c5r	EMAIL	2026-01-20 01:23:39.624	Enviar propuesta	ventas-1	2026-01-20 01:23:39.625	2026-01-20 01:23:39.625	\N	Envío brochure
\.


--
-- Data for Name: CrmCalendarEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmCalendarEvent" (id, "leadId", "quoteId", type, "startAt", "endAt", title, notes, "ownerId", "createdById", "createdAt", "updatedAt", "dealId") FROM stdin;
\.


--
-- Data for Name: CrmContact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmContact" (id, "accountId", email, phone, "createdById", "createdAt", "updatedAt", "clientId", "firstName", "lastName", "position", type, "phonesJson") FROM stdin;
cmjreropq002612uqsgjhspw7	cmjreropo002412uq3oablgsw	compras@clinicsp.com	50244445555	ventas-1	2025-12-29 17:04:27.614	2025-12-29 17:04:27.614	\N	Carlos	Méndez	Compras	COMPANY_CONTACT	\N
cmjrf08h30020b8x1jytpkazv	cmjrf08h1001yb8x1v9pdntql	compras@clinicsp.com	50244445555	ventas-1	2025-12-29 17:11:06.471	2025-12-29 17:11:06.471	\N	Carlos	Méndez	Compras	COMPANY_CONTACT	\N
cmjrft5dr00041ohnmkdlx2k7	cmjrft5bn00021ohn7i2duaea	nelsonlopezallen@gmail.com	31255656	Administrador	2025-12-29 17:33:35.488	2025-12-29 17:33:35.488	cmjrft5ba00001ohn23nzw5k4	Nelson	Lopez	\N	COMPANY_CONTACT	\N
cmjrjnttz000e1ohnhkn9us86	cmjrjntsj000c1ohn17b1oha5	nelsonlopezallen@gmail.com	31255656	Administrador	2025-12-29 19:21:25.703	2025-12-29 19:21:25.703	cmjrft5ba00001ohn23nzw5k4	NELSON	LOPEZ	\N	COMPANY_CONTACT	\N
cmjrlljhe000113m50j6s0nn9	\N	\N	+502 31255656	Administrador	2025-12-29 20:15:38.211	2025-12-29 20:15:38.211	cmjrlljgz000013m5vpprcqs8	Nelson Sebastian	Lopez Allen	\N	PATIENT	[{"number": "31255656", "country": "+502"}]
cmjrybaxh0005avwkx9lk6j8c	cmjrybatd0004avwkvtwe82pd	NELSONLOPEZALLEN@GMAIL.COM	31255656	Administrador	2025-12-30 02:11:35.573	2025-12-30 02:11:35.573	cmjrybat70002avwk2njghc62	NELSON	LOPEZ	\N	COMPANY_CONTACT	null
cmjumogfw0002laocgbmw211p	cmjumogef0001laocywwygyro	nelsonlopezallen@gmail.com	31255656	Administrador	2025-12-31 23:09:12.381	2025-12-31 23:09:12.381	cmjrft5ba00001ohn23nzw5k4	NELSON	LOPEZ	\N	COMPANY_CONTACT	null
cmk4uvehx002uuje11fnlyhrs	cmk4uvebv002suje178bo7vhg	compras@clinicsp.com	50244445555	ventas-1	2026-01-08 02:56:15.142	2026-01-08 02:56:15.142	\N	Carlos	Méndez	Compras	COMPANY_CONTACT	\N
cmk4uwinl002ufo0fdxdftzai	cmk4uwij2002sfo0fh59viizr	compras@clinicsp.com	50244445555	ventas-1	2026-01-08 02:57:07.185	2026-01-08 02:57:07.185	\N	Carlos	Méndez	Compras	COMPANY_CONTACT	\N
cmk7cwpix003jkko6grspbgyg	cmk7cwpe0003hkko62jf3eo23	compras@clinicsp.com	50244445555	ventas-1	2026-01-09 20:56:41.529	2026-01-09 20:56:41.529	\N	Carlos	Méndez	Compras	COMPANY_CONTACT	\N
cmklwuj6q006gg4lnry7t8c5r	cmklwuj1m006eg4lnhf5xrykv	compras@clinicsp.com	50244445555	ventas-1	2026-01-20 01:23:38.786	2026-01-20 01:23:38.786	\N	Carlos	Méndez	Compras	COMPANY_CONTACT	\N
\.


--
-- Data for Name: CrmDeal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmDeal" (id, "pipelineType", "ownerId", "accountId", "contactId", status, notes, "createdById", "createdAt", "updatedAt", "amountEstimated", "expectedCloseDate", "lostReason", "probabilityPct", source, stage, competitor, "nextAction", "nextActionAt", "pipelineId", "slaStatus", "stageEnteredAt", amount, "capturedAt", "capturedById", "preferredAt", "preferredChannel", "servicesOtherNote", "branchId", "ownerUserId") FROM stdin;
cmjreropt002812uq4vrp1bwe	B2B	ventas-1	cmjreropo002412uq3oablgsw	cmjreropq002612uqsgjhspw7	OPEN	Paquete de convenios empresariales	ventas-1	2025-12-29 17:04:27.617	2025-12-29 17:04:27.617	15000.00	2025-02-15 00:00:00	\N	25	\N	CONTACTADO	\N	\N	\N	pipeline-b2b	GREEN	2025-12-29 17:04:27.617	15000.00	2025-12-29 17:04:27.617	Ventas	\N	\N	\N	\N	\N
cmjrf08h40022b8x1ktl5ivn5	B2B	ventas-1	cmjrf08h1001yb8x1v9pdntql	cmjrf08h30020b8x1jytpkazv	OPEN	Paquete de convenios empresariales	ventas-1	2025-12-29 17:11:06.473	2025-12-29 17:11:06.473	15000.00	2025-02-15 00:00:00	\N	25	\N	CONTACTADO	\N	\N	\N	pipeline-b2b	GREEN	2025-12-29 17:11:06.473	15000.00	2025-12-29 17:11:06.473	Ventas	\N	\N	\N	\N	\N
cmjrft5e400061ohnf7hfzuo9	B2B	ventas	cmjrft5bn00021ohn7i2duaea	cmjrft5dr00041ohnmkdlx2k7	OPEN	\N	Administrador	2025-12-29 17:33:35.5	2025-12-29 17:33:35.5	0.00	\N	\N	0	\N	NUEVO	\N	EMAIL	2025-12-29 19:32:00	\N	GREEN	2025-12-29 17:33:35.498	0.00	2025-12-29 17:33:35.498	Administrador	\N	EMAIL	\N	\N	\N
cmjrjntud000g1ohn6x6yioh0	B2B	ventas	cmjrjntsj000c1ohn17b1oha5	cmjrjnttz000e1ohnhkn9us86	OPEN	\N	Administrador	2025-12-29 19:21:25.717	2025-12-29 19:21:25.717	0.00	\N	\N	0	\N	NUEVO	\N	CALL	2025-12-30 16:26:00	\N	GREEN	2025-12-29 19:21:25.715	0.00	2025-12-29 19:21:25.715	Administrador	2025-12-30 16:26:00	CALL	\N	\N	\N
cmjrlljif000313m5kk4nrr87	B2C	RECEPCIONISTA	\N	cmjrlljhe000113m50j6s0nn9	OPEN	\N	Administrador	2025-12-29 20:15:38.247	2025-12-29 20:15:38.247	0.00	\N	\N	0	\N	COTIZACION	\N	WHATSAPP	2025-12-29 22:14:00	\N	GREEN	2025-12-29 20:15:38.245	0.00	2025-12-29 20:15:38.245	Administrador	\N	WHATSAPP	\N	\N	\N
cmjrybay70007avwk9lhf2jyh	B2B	ventas	cmjrybatd0004avwkvtwe82pd	cmjrybaxh0005avwkx9lk6j8c	OPEN	\N	Administrador	2025-12-30 02:11:35.599	2025-12-30 02:11:35.599	0.00	\N	\N	0	\N	NUEVO	\N	WHATSAPP	2025-12-30 04:10:00	\N	GREEN	2025-12-30 02:11:35.597	0.00	2025-12-30 02:11:35.597	Administrador	\N	WHATSAPP	\N	\N	\N
cmjumogjp0004laoc5m2ftkml	B2B	ventas	cmjumogef0001laocywwygyro	cmjumogfw0002laocgbmw211p	OPEN	\N	cmjuf58yo000y13t7i9phjzy4	2025-12-31 23:09:12.517	2025-12-31 23:09:12.517	0.00	\N	\N	0	\N	NUEVO	\N	CALL	2026-01-05 15:00:00	\N	GREEN	2025-12-31 23:09:12.515	0.00	2025-12-31 23:09:12.515	cmjuf58yo000y13t7i9phjzy4	2026-01-05 15:00:00	CALL	\N	\N	cmjuf58yo000y13t7i9phjzy4
cmk4uvent002wuje1tnbzoqj3	B2B	ventas-1	cmk4uvebv002suje178bo7vhg	cmk4uvehx002uuje11fnlyhrs	OPEN	Paquete de convenios empresariales	ventas-1	2026-01-08 02:56:15.354	2026-01-08 02:56:15.354	15000.00	2025-02-15 00:00:00	\N	25	\N	CONTACTADO	\N	\N	\N	pipeline-b2b	GREEN	2026-01-08 02:56:15.354	15000.00	2026-01-08 02:56:15.354	Ventas	\N	\N	\N	\N	\N
cmk4uwiry002wfo0fup2awzxj	B2B	ventas-1	cmk4uwij2002sfo0fh59viizr	cmk4uwinl002ufo0fdxdftzai	OPEN	Paquete de convenios empresariales	ventas-1	2026-01-08 02:57:07.342	2026-01-08 02:57:07.342	15000.00	2025-02-15 00:00:00	\N	25	\N	CONTACTADO	\N	\N	\N	pipeline-b2b	GREEN	2026-01-08 02:57:07.342	15000.00	2026-01-08 02:57:07.342	Ventas	\N	\N	\N	\N	\N
cmk7cwpnp003lkko6affe0a6y	B2B	ventas-1	cmk7cwpe0003hkko62jf3eo23	cmk7cwpix003jkko6grspbgyg	OPEN	Paquete de convenios empresariales	ventas-1	2026-01-09 20:56:41.701	2026-01-09 20:56:41.701	15000.00	2025-02-15 00:00:00	\N	25	\N	CONTACTADO	\N	\N	\N	pipeline-b2b	GREEN	2026-01-09 20:56:41.701	15000.00	2026-01-09 20:56:41.701	Ventas	\N	\N	\N	\N	\N
cmklwujbj006ig4ln1d3yqutu	B2B	ventas-1	cmklwuj1m006eg4lnhf5xrykv	cmklwuj6q006gg4lnry7t8c5r	OPEN	Paquete de convenios empresariales	ventas-1	2026-01-20 01:23:38.959	2026-01-20 01:23:38.959	15000.00	2025-02-15 00:00:00	\N	25	\N	CONTACTADO	\N	\N	\N	pipeline-b2b	GREEN	2026-01-20 01:23:38.959	15000.00	2026-01-20 01:23:38.959	Ventas	\N	\N	\N	\N	\N
\.


--
-- Data for Name: CrmDealServiceInterest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmDealServiceInterest" (id, "dealId", "serviceType", selected, notes) FROM stdin;
cmjreropt002912uqegj4qx76	cmjreropt002812uq4vrp1bwe	CLINICAS_EMPRESARIALES	t	\N
cmjreropt002a12uqq8voa653	cmjreropt002812uq4vrp1bwe	SSO	t	\N
cmjrf08h40023b8x1gnxo05lf	cmjrf08h40022b8x1ktl5ivn5	CLINICAS_EMPRESARIALES	t	\N
cmjrf08h40024b8x1yo4z7nj5	cmjrf08h40022b8x1ktl5ivn5	SSO	t	\N
cmjrft5e500071ohn7rfp4tu7	cmjrft5e400061ohnf7hfzuo9	BOTIQUINES	t	\N
cmjrft5e500081ohnexhxj98f	cmjrft5e400061ohnf7hfzuo9	EXTINTORES	t	\N
cmjrft5e500091ohncaanipl0	cmjrft5e400061ohnf7hfzuo9	SERVICIOS_MEDICOS	t	\N
cmjrjntud000h1ohn9knwpmnx	cmjrjntud000g1ohn6x6yioh0	CAPACITACIONES	t	\N
cmjrlljif000413m5yyi4utgp	cmjrlljif000313m5kk4nrr87	CONSULTAS	t	\N
cmjrlljif000513m5b17not11	cmjrlljif000313m5kk4nrr87	LABORATORIO	t	\N
cmjrlljif000613m5wz4kt1bn	cmjrlljif000313m5kk4nrr87	RAYOS_X	t	\N
cmjrybay70008avwktwxto8ug	cmjrybay70007avwk9lhf2jyh	CLINICAS_EMPRESARIALES	t	\N
cmjrybay70009avwkk2pqg9kc	cmjrybay70007avwk9lhf2jyh	CAPACITACIONES	t	\N
cmjumogjp0005laocuho7ezgp	cmjumogjp0004laoc5m2ftkml	CAPACITACIONES	t	\N
cmk4uvent002xuje1l47hrjtn	cmk4uvent002wuje1tnbzoqj3	CLINICAS_EMPRESARIALES	t	\N
cmk4uvent002yuje1b8pc9g04	cmk4uvent002wuje1tnbzoqj3	SSO	t	\N
cmk4uwiry002xfo0fnvltpp7g	cmk4uwiry002wfo0fup2awzxj	CLINICAS_EMPRESARIALES	t	\N
cmk4uwiry002yfo0feiccrsc1	cmk4uwiry002wfo0fup2awzxj	SSO	t	\N
cmk7cwpnp003mkko6x6ingshv	cmk7cwpnp003lkko6affe0a6y	CLINICAS_EMPRESARIALES	t	\N
cmk7cwpnp003nkko62rpbsfpm	cmk7cwpnp003lkko6affe0a6y	SSO	t	\N
cmklwujbj006jg4lneu9vljk3	cmklwujbj006ig4ln1d3yqutu	CLINICAS_EMPRESARIALES	t	\N
cmklwujbj006kg4lnvszfh08p	cmklwujbj006ig4ln1d3yqutu	SSO	t	\N
\.


--
-- Data for Name: CrmDealStageHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmDealStageHistory" (id, "dealId", "fromStage", "toStage", "changedAt", "changedById", comment) FROM stdin;
cmjrft5e5000a1ohnigy010lt	cmjrft5e400061ohnf7hfzuo9	\N	NUEVO	2025-12-29 17:33:35.498	Administrador	Creación de oportunidad
cmjrjntud000i1ohn2kgem3ux	cmjrjntud000g1ohn6x6yioh0	\N	NUEVO	2025-12-29 19:21:25.715	Administrador	Creación de oportunidad
cmjrlljif000713m5o3mko5sv	cmjrlljif000313m5kk4nrr87	\N	COTIZACION	2025-12-29 20:15:38.245	Administrador	Creación de oportunidad
cmjrybay7000aavwkg63uspzm	cmjrybay70007avwk9lhf2jyh	\N	NUEVO	2025-12-30 02:11:35.597	Administrador	Creación de oportunidad
cmjumogjp0006laoc3e7w0ek0	cmjumogjp0004laoc5m2ftkml	\N	NUEVO	2025-12-31 23:09:12.515	cmjuf58yo000y13t7i9phjzy4	Creación de oportunidad
\.


--
-- Data for Name: CrmLead; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmLead" (id, email, phone, source, notes, "createdById", "createdAt", "updatedAt", address, "clientId", "companyName", "leadType", "nextActionAt", nit, "ownerId", "personDpi", "personName", status) FROM stdin;
cmjreropm002312uqlqp9y0b7	maria@example.com	50255555555	Web	Interesada en rayos X	ventas-1	2025-12-29 17:04:27.61	2025-12-29 17:04:27.61	\N	\N	\N	PATIENT	\N	\N	\N	\N	María Gómez	NEW
cmjrf08gz001xb8x1oqdsgcri	maria@example.com	50255555555	Web	Interesada en rayos X	ventas-1	2025-12-29 17:11:06.468	2025-12-29 17:11:06.468	\N	\N	\N	PATIENT	\N	\N	\N	\N	María Gómez	NEW
cmk4uve5s002ruje18fgw2qyr	maria@example.com	50255555555	Web	Interesada en rayos X	ventas-1	2026-01-08 02:56:14.704	2026-01-08 02:56:14.704	\N	\N	\N	PATIENT	\N	\N	\N	\N	María Gómez	NEW
cmk4uwiek002rfo0fw7zimxen	maria@example.com	50255555555	Web	Interesada en rayos X	ventas-1	2026-01-08 02:57:06.782	2026-01-08 02:57:06.782	\N	\N	\N	PATIENT	\N	\N	\N	\N	María Gómez	NEW
cmk7cwp90003gkko6fcm6iyze	maria@example.com	50255555555	Web	Interesada en rayos X	ventas-1	2026-01-09 20:56:41.172	2026-01-09 20:56:41.172	\N	\N	\N	PATIENT	\N	\N	\N	\N	María Gómez	NEW
cmklwuiwj006dg4lnhsau112z	maria@example.com	50255555555	Web	Interesada en rayos X	ventas-1	2026-01-20 01:23:38.419	2026-01-20 01:23:38.419	\N	\N	\N	PATIENT	\N	\N	\N	\N	María Gómez	NEW
\.


--
-- Data for Name: CrmPipeline; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmPipeline" (id, type, name, description) FROM stdin;
pipeline-b2b	B2B	Pipeline B2B / SSO	Empresas y SSO
pipeline-b2c	B2C	Pipeline B2C Pacientes	Consultas, laboratorio, membresías
\.


--
-- Data for Name: CrmPipelineStage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmPipelineStage" (id, "pipelineId", stage, "probabilityPct", "slaDays", "expectedActions", "order") FROM stdin;
cmklwuh85005sg4lnxlbb6dbu	pipeline-b2b	NUEVO	5	1	["Contactar en 24h"]	1
cmklwuh85005tg4lncq5gpvdu	pipeline-b2b	CONTACTADO	15	2	["Validar servicios de interés"]	2
cmklwuh85005ug4lnu12q2hx4	pipeline-b2b	DIAGNOSTICO	30	5	["Visita / levantamiento"]	3
cmklwuh85005vg4lnzn6ge29j	pipeline-b2b	COTIZACION	45	3	["Enviar cotización"]	4
cmklwuh85005wg4lnildy6ftc	pipeline-b2b	NEGOCIACION	65	5	["Revisión y ajustes"]	5
cmklwuh85005xg4lnsr5chgjx	pipeline-b2b	GANADO	100	0	["Implementar"]	6
cmklwuh85005yg4lnrswgcqot	pipeline-b2b	PERDIDO	0	0	["Registrar motivo"]	7
cmklwuiby0066g4ln6chzo5hh	pipeline-b2c	NUEVO	10	1	["Llamar en 15 min"]	1
cmklwuiby0067g4lnwyuau7wa	pipeline-b2c	CONTACTADO	25	1	["Programar cita"]	2
cmklwuibz0068g4ln1lkecyc9	pipeline-b2c	DIAGNOSTICO	40	2	["Evaluación / orden"]	3
cmklwuibz0069g4lnb6pleqfn	pipeline-b2c	COTIZACION	55	2	["Enviar precios / orden"]	4
cmklwuibz006ag4lnogyaygod	pipeline-b2c	NEGOCIACION	70	3	["Confirmar asistencia"]	5
cmklwuibz006bg4ln6i0qvlpa	pipeline-b2c	GANADO	100	0	["Atender / facturar"]	6
cmklwuibz006cg4lnq2jkjcio	pipeline-b2c	PERDIDO	0	0	["Registrar motivo"]	7
\.


--
-- Data for Name: CrmQuote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmQuote" (id, "dealId", "quoteNumber", status, "validUntil", "totalAmount", "internalCost", "internalMargin", currency, notes, "createdById", "createdAt", "updatedAt", "leadId", "isActive", sequence, "versionLabel", "approvedAt", "approvedById", "rejectedReason") FROM stdin;
\.


--
-- Data for Name: CrmQuoteItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmQuoteItem" (id, "quoteId", "itemType", "itemId", qty, "unitPrice", "lineTotal", "costTotal", "marginTotal", "discountPct", "manualDescription", "manualUnitPrice") FROM stdin;
\.


--
-- Data for Name: CrmQuoteRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmQuoteRequest" ("quoteId", "requestId") FROM stdin;
\.


--
-- Data for Name: CrmRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmRequest" (id, "dealId", services, description, status, "requestedAt", "createdById", "createdAt", "updatedAt") FROM stdin;
cmjrujz640001avwku4yr7hkx	cmjrjntud000g1ohn6x6yioh0	{EXTINTORES,CAPACITACIONES}	mas servicios que requiere el cliente	PENDIENTE	2025-12-30 00:26:21.765	Administrador	2025-12-30 00:26:21.767	2025-12-30 00:26:21.767
\.


--
-- Data for Name: CrmTask; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CrmTask" (id, "ownerId", "dealId", "dueDate", title, status, priority, notes, "createdById", "createdAt", "updatedAt") FROM stdin;
cmjreroq1002d12uq1wjrksul	ventas-1	cmjreropt002812uq4vrp1bwe	2025-01-10 00:00:00	Agendar demo con Clinica San Pedro	OPEN	HIGH	\N	ventas-1	2025-12-29 17:04:27.625	2025-12-29 17:04:27.625
cmjreroq1002e12uqgd6410ob	ventas-2	\N	2025-01-08 00:00:00	Dar seguimiento a lead web	IN_PROGRESS	MEDIUM	\N	ventas-2	2025-12-29 17:04:27.625	2025-12-29 17:04:27.625
cmjrf08ha0027b8x1sybq0sgl	ventas-1	cmjrf08h40022b8x1ktl5ivn5	2025-01-10 00:00:00	Agendar demo con Clinica San Pedro	OPEN	HIGH	\N	ventas-1	2025-12-29 17:11:06.478	2025-12-29 17:11:06.478
cmjrf08ha0028b8x1d5p8mn5q	ventas-2	\N	2025-01-08 00:00:00	Dar seguimiento a lead web	IN_PROGRESS	MEDIUM	\N	ventas-2	2025-12-29 17:11:06.478	2025-12-29 17:11:06.478
cmk4uvfno0031uje17nrjipe9	ventas-1	cmk4uvent002wuje1tnbzoqj3	2025-01-10 00:00:00	Agendar demo con Clinica San Pedro	OPEN	HIGH	\N	ventas-1	2026-01-08 02:56:16.644	2026-01-08 02:56:16.644
cmk4uvfno0032uje1uikisqzg	ventas-2	\N	2025-01-08 00:00:00	Dar seguimiento a lead web	IN_PROGRESS	MEDIUM	\N	ventas-2	2026-01-08 02:56:16.644	2026-01-08 02:56:16.644
cmk4uwjil0031fo0fa2whqyvi	ventas-1	cmk4uwiry002wfo0fup2awzxj	2025-01-10 00:00:00	Agendar demo con Clinica San Pedro	OPEN	HIGH	\N	ventas-1	2026-01-08 02:57:08.301	2026-01-08 02:57:08.301
cmk4uwjil0032fo0fm70ifeqr	ventas-2	\N	2025-01-08 00:00:00	Dar seguimiento a lead web	IN_PROGRESS	MEDIUM	\N	ventas-2	2026-01-08 02:57:08.301	2026-01-08 02:57:08.301
cmk7cwqfk003qkko6hle92hzn	ventas-1	cmk7cwpnp003lkko6affe0a6y	2025-01-10 00:00:00	Agendar demo con Clinica San Pedro	OPEN	HIGH	\N	ventas-1	2026-01-09 20:56:42.704	2026-01-09 20:56:42.704
cmk7cwqfk003rkko6eyp2ev6w	ventas-2	\N	2025-01-08 00:00:00	Dar seguimiento a lead web	IN_PROGRESS	MEDIUM	\N	ventas-2	2026-01-09 20:56:42.704	2026-01-09 20:56:42.704
cmklwuk38006ng4lnhebv9dav	ventas-1	cmklwujbj006ig4ln1d3yqutu	2025-01-10 00:00:00	Agendar demo con Clinica San Pedro	OPEN	HIGH	\N	ventas-1	2026-01-20 01:23:39.956	2026-01-20 01:23:39.956
cmklwuk38006og4lni1f1vbcb	ventas-2	\N	2025-01-08 00:00:00	Dar seguimiento a lead web	IN_PROGRESS	MEDIUM	\N	ventas-2	2026-01-20 01:23:39.956	2026-01-20 01:23:39.956
\.


--
-- Data for Name: DisciplinaryAction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DisciplinaryAction" (id, "employeeId", type, description, "documentUrl", "issuedAt", "cooldownDays", "createdAt", "updatedAt", title, "endDate", "approvedById", comments, "createdById", "startDate", status) FROM stdin;
\.


--
-- Data for Name: DisciplinaryAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DisciplinaryAttachment" (id, "disciplinaryActionId", "fileUrl", "fileName", mime, "createdAt") FROM stdin;
\.


--
-- Data for Name: EmployeeBranchAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeBranchAssignment" (id, "employeeId", "branchId", "isPrimary", "startDate", "endDate", "createdById", "createdAt", "updatedAt", code) FROM stdin;
cmkcsdr1f0002esnepas9wvjo	cmkcsdqtb0000esnei0pmx8g3	s1	t	\N	\N	\N	2026-01-13 16:08:41.764	2026-01-13 16:08:41.764	Palín
cmkcsex960002clcurpa3nenc	cmkcsex1w0000clcu1finx065	s1	t	\N	\N	\N	2026-01-13 16:09:36.475	2026-01-13 16:09:36.475	Palín
cmklkjnrg00034ww9yr7lx6es	cmklkjnmn00014ww9rck6fi27	s1	t	2026-01-19 19:39:15.218	\N	\N	2026-01-19 19:39:16.109	2026-01-19 19:39:16.109	PRB
cmklloh720004ucase5rb8l6s	cmklloh710002ucasqjszd33c	s1	t	2026-01-19 20:11:00.489	\N	\N	2026-01-19 20:11:00.493	2026-01-19 20:11:00.493	Palín – Clínica Principal
hr-branch-ana-s1	cmkeai8nu001s10q62mr5tjis	s1	t	2024-02-01 00:00:00	\N	admin-seed	2026-01-20 01:23:34.102	2026-01-20 01:23:34.102	\N
hr-branch-luis-s2	cmklwugku005ig4lneeu1k02v	s2	t	2024-05-15 00:00:00	\N	admin-seed	2026-01-20 01:23:35.671	2026-01-20 01:23:35.671	\N
hr-branch-luis-s1	cmklwugku005ig4lneeu1k02v	s1	f	2024-06-01 00:00:00	\N	admin-seed	2026-01-20 01:23:35.749	2026-01-20 01:23:35.749	\N
\.


--
-- Data for Name: EmployeeCompensation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeCompensation" (id, "engagementId", "effectiveFrom", "effectiveTo", "baseSalary", currency, "payFrequency", allowances, deductions, "isActive", "createdById", "createdAt", "paymentScheme") FROM stdin;
hr-eng-ana-le1-base	hr-eng-ana-le1	2024-02-01 00:00:00	\N	8000.00	GTQ	MONTHLY	{}	{}	t	admin-seed	2026-01-20 01:23:33.935	MONTHLY
hr-eng-luis-le2-base	hr-eng-luis-le2	2024-05-15 00:00:00	\N	12000.00	GTQ	MONTHLY	{}	{}	t	admin-seed	2026-01-20 01:23:35.585	MONTHLY
\.


--
-- Data for Name: EmployeeDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeDocument" (id, "employeeId", type, title, notes, "retentionUntil", "isArchived", "currentVersionId", "createdById", "createdAt", "updatedAt", visibility) FROM stdin;
doc-3c7142	cmklloh710002ucasqjszd33c	DPI	DPI	\N	\N	f	ver-f35f96	\N	2026-01-19 20:12:09.768	2026-01-19 20:12:10.434	PERSONAL
hr-doc-1	cmkeai8nu001s10q62mr5tjis	DPI	DPI	\N	2029-01-15 00:00:00	f	hr-doc-1-v1	admin-seed	2026-01-20 01:23:34.458	2026-01-20 01:23:34.812	PERSONAL
hr-doc-2	cmkeai8nu001s10q62mr5tjis	CONTRATO	Contrato indefinido	\N	2029-02-01 00:00:00	f	hr-doc-2-v1	admin-seed	2026-01-20 01:23:34.974	2026-01-20 01:23:35.154	PERSONAL
hr-doc-3	cmklwugku005ig4lneeu1k02v	CV	CV actualizado	\N	2029-05-01 00:00:00	f	hr-doc-3-v1	admin-seed	2026-01-20 01:23:35.917	2026-01-20 01:23:36.084	PERSONAL
\.


--
-- Data for Name: EmployeeDocumentVersion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeDocumentVersion" (id, "documentId", "versionNumber", "fileUrl", "issuedAt", "deliveredAt", "expiresAt", notes, "uploadedById", "createdAt", "canEmployeeView", "viewGrantedUntil") FROM stdin;
ver-f35f96	doc-3c7142	1	/uploads/hr/demo-dpi.pdf	2026-01-19 20:12:09.092	2026-01-19 20:12:09.092	\N	\N	\N	2026-01-19 20:12:09.768	t	\N
hr-doc-1-v1	hr-doc-1	1	/uploads/hr/ana-dpi.pdf	2024-01-15 00:00:00	2024-01-15 00:00:00	\N	\N	\N	2026-01-20 01:23:34.63	f	\N
hr-doc-2-v1	hr-doc-2	1	/uploads/hr/ana-contrato.pdf	2024-02-01 00:00:00	\N	\N	\N	\N	2026-01-20 01:23:35.073	f	\N
hr-doc-3-v1	hr-doc-3	1	/uploads/hr/luis-cv.pdf	2024-05-01 00:00:00	\N	\N	\N	\N	2026-01-20 01:23:36.002	f	\N
\.


--
-- Data for Name: EmployeeEngagement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeEngagement" (id, "employeeId", "legalEntityId", "employmentType", status, "startDate", "endDate", "isPayrollEligible", "isPrimary", "compensationAmount", "compensationCurrency", "compensationFrequency", "compensationNotes", "createdById", "createdAt", "updatedAt", "baseSalary", "paymentScheme", "baseAllowance") FROM stdin;
cmkcsdr9h0004esne36gmcl7p	cmkcsdqtb0000esnei0pmx8g3	le-safe-2	DEPENDENCIA	ACTIVE	2026-01-13 16:08:42.047	\N	t	t	6500.00	GTQ	MONTHLY	\N	\N	2026-01-13 16:08:42.054	2026-01-13 16:08:42.054	6500.00	MONTHLY	\N
cmkcsexh70004clcu5mc7txbw	cmkcsex1w0000clcu1finx065	le-safe-2	DEPENDENCIA	ACTIVE	2026-01-13 16:09:36.727	\N	t	t	6500.00	GTQ	MONTHLY	\N	\N	2026-01-13 16:09:36.764	2026-01-13 16:09:36.764	6500.00	MONTHLY	\N
eng-f02f36	cmklloh710002ucasqjszd33c	le1	DEPENDENCIA	ACTIVE	2026-01-19 20:11:00.489	\N	t	t	6000.00	GTQ	MONTHLY	\N	\N	2026-01-19 20:11:00.493	2026-01-19 20:11:00.493	6000.00	MONTHLY	\N
hr-eng-ana-le1	cmkeai8nu001s10q62mr5tjis	le1	DEPENDENCIA	ACTIVE	2024-02-01 00:00:00	\N	t	t	8000.00	GTQ	MONTHLY	\N	admin-seed	2026-01-20 01:23:33.649	2026-01-20 01:23:33.649	\N	MONTHLY	\N
hr-eng-luis-le2	cmklwugku005ig4lneeu1k02v	le2	HONORARIOS	SUSPENDED	2024-05-15 00:00:00	\N	t	t	12000.00	GTQ	MONTHLY	\N	admin-seed	2026-01-20 01:23:35.499	2026-01-20 01:23:35.499	\N	MONTHLY	\N
\.


--
-- Data for Name: EmployeeEvaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeEvaluation" (id, "employeeId", "formId", score, comments, "evaluatedAt", "evaluatedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: EmployeePositionAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeePositionAssignment" (id, "employeeId", "positionId", "departmentId", "isPrimary", "startDate", "endDate", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
cmklkjnvw00054ww92jfa79uo	cmklkjnmn00014ww9rck6fi27	cmk4utack001kevdm4sjnkjey	\N	t	2026-01-19 19:39:15.218	\N	\N	\N	2026-01-19 19:39:16.269	2026-01-19 19:39:16.269
cmklloh720006ucasi17hj521	cmklloh710002ucasqjszd33c	cmkllogot0000ucaswpecj7hs	\N	t	2026-01-19 20:11:00.489	\N	\N	\N	2026-01-19 20:11:00.493	2026-01-19 20:11:00.493
hr-pos-ana	cmkeai8nu001s10q62mr5tjis	cmk4utack001kevdm4sjnkjey	cmk4uta3r001gevdmogul0wjr	t	2024-02-01 00:00:00	\N	\N	admin-seed	2026-01-20 01:23:34.281	2026-01-20 01:23:34.281
hr-pos-luis	cmklwugku005ig4lneeu1k02v	cmk4utalc001nevdmoa14dcbr	cmk4ut9z5001fevdm99ilb0ax	t	2024-05-15 00:00:00	\N	\N	admin-seed	2026-01-20 01:23:35.832	2026-01-20 01:23:35.832
\.


--
-- Data for Name: EmployeeShiftAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeShiftAssignment" (id, "employeeId", "shiftTemplateId", "startDate", "endDate", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EvaluationForm; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationForm" (id, name, description, "isActive", "createdAt", "updatedAt") FROM stdin;
eval-form-1	Evaluación 360 básica	Escala 1-5	t	2026-01-09 20:53:38.351	2026-01-09 20:56:38.616
\.


--
-- Data for Name: EvaluationQuestion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationQuestion" (id, "formId", type, question, options, "order", "createdAt") FROM stdin;
eval-q-1	eval-form-1	SCALE	Puntualidad	\N	1	2026-01-09 20:53:38.522
eval-q-2	eval-form-1	SCALE	Trabajo en equipo	\N	2	2026-01-09 20:53:38.691
eval-q-3	eval-form-1	TEXT	Fortalezas	\N	3	2026-01-09 20:53:38.772
\.


--
-- Data for Name: FileAsset; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FileAsset" (id, "storageKey", "mimeType", "sizeBytes", sha256, "createdAt", "createdByUserId", "originalName", "dealId") FROM stdin;
\.


--
-- Data for Name: FinanceAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FinanceAttachment" (id, "fileUrl", "fileName", "mimeType", "sizeBytes", "createdAt", "uploadedById", "receivableId", "payableId", "paymentId") FROM stdin;
cmjrerop5001812uq0g77zrpq	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2025-12-29 17:04:27.593	\N	\N	cmjrerop4001712uqniqurk24	\N
cmjrf08gk0012b8x1hamlbk1f	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2025-12-29 17:11:06.452	\N	\N	cmjrf08gk0011b8x120v9teu8	\N
cmk4ut8xz0018evdm6g8panhi	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-08 02:54:34.631	\N	\N	cmk4ut8xy0017evdmdx8um0f6	\N
cmk4uuh0b0018fwx5tmqqfmca	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-08 02:55:31.739	\N	\N	cmk4uuh0b0017fwx5ai8sq36o	\N
cmk4uv78r0018uje1sv11z206	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-08 02:56:05.74	\N	\N	cmk4uv78r0017uje1kxcu4k7g	\N
cmk4uwd3l0018fo0fbi9a9the	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-08 02:56:59.986	\N	\N	cmk4uwd3l0017fo0fdllloxja	\N
cmk7cgy5f0018t3xnfwh3w53l	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:44:26.211	\N	\N	cmk7cgy5f0017t3xnc4h63k3y	\N
cmk7cnhzs00188gm1in4zffwh	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:49:31.864	\N	\N	cmk7cnhzs00178gm11m0tg1vw	\N
cmk7cobbd0018u77jqohan65e	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:50:09.865	\N	\N	cmk7cobbd0017u77j0d0mpz0c	\N
cmk7cp5k20018gwxr9qpqesgb	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:50:49.058	\N	\N	cmk7cp5k20017gwxrri02wxof	\N
cmk7cq1kv0018wwje9kkssvtk	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:51:30.559	\N	\N	cmk7cq1ku0017wwje6tguvac2	\N
cmk7cqrt10018b4dafpodautd	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:52:04.549	\N	\N	cmk7cqrt00017b4da1slk65qz	\N
cmk7crkul0018i5dbcjxgp1sl	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:52:42.189	\N	\N	cmk7crkul0017i5dbe37b2wbc	\N
cmk7cse090018re0u5hjlrt4f	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:53:19.977	\N	\N	cmk7cse090017re0udf14u8yd	\N
cmk7ct9ho0018802qql5vocn4	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:54:00.78	\N	\N	cmk7ct9ho0017802qkvnx8gtb	\N
cmk7cuxda0018apcmeen7wn8v	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:55:18.383	\N	\N	cmk7cuxda0017apcmhjlizr4f	\N
cmk7cwb3u0018kko6qx0xazlf	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-09 20:56:22.842	\N	\N	cmk7cwb3u0017kko6z0ssq7go	\N
cmkeai6ct001810q60dgajal1	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-14 17:23:47.501	\N	\N	cmkeai6ct001710q6i7ym2lez	\N
cmklwu6h90018g4lnuzxwp7rq	/uploads/finance/demo-factura.pdf	Factura demo	application/pdf	1024	2026-01-20 01:23:22.317	\N	\N	cmklwu6h90017g4lnc4au3k9s	\N
\.


--
-- Data for Name: FinanceCategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FinanceCategory" (id, "flowType", name, slug, "isActive", "order", "createdAt", "updatedAt") FROM stdin;
cmjreronw000212uq2rmgjbxl	INCOME	Servicios médicos	servicios-medicos	t	0	2025-12-29 17:04:27.549	2026-01-20 01:23:17.147
cmjreroo1000712uqrn10id1y	EXPENSE	Operación	operacion	t	0	2025-12-29 17:04:27.554	2026-01-20 01:23:17.557
\.


--
-- Data for Name: FinanceSubcategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FinanceSubcategory" (id, "categoryId", name, slug, "isActive", "order", "createdAt", "updatedAt") FROM stdin;
cmjreronz000412uql8qx3yh1	cmjreronw000212uq2rmgjbxl	Consultas	consultas	t	0	2025-12-29 17:04:27.551	2026-01-20 01:23:17.31
cmjreroo0000612uq8o01ugvj	cmjreronw000212uq2rmgjbxl	Imágenes	imagenes	t	1	2025-12-29 17:04:27.553	2026-01-20 01:23:17.473
cmjreroo2000912uqu3nyxhv9	cmjreroo1000712uqrn10id1y	Insumos	insumos	t	0	2025-12-29 17:04:27.554	2026-01-20 01:23:17.646
cmjreroo3000b12uq9ooukvxn	cmjreroo1000712uqrn10id1y	Honorarios	honorarios	t	1	2025-12-29 17:04:27.556	2026-01-20 01:23:17.735
\.


--
-- Data for Name: FinancialAccount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FinancialAccount" (id, name, type, currency, "branchId", "isActive", "createdAt", "updatedAt", "accountNumber", "bankName", "legalEntityId") FROM stdin;
cmjrerooi000l12uqxpv40fqu	Caja Palín	CASH	GTQ	\N	t	2025-12-29 17:04:27.571	2026-01-20 01:23:19.733	\N	\N	le1
cmjrerook000n12uqngjsqclh	Banco BAC	BANK	GTQ	\N	t	2025-12-29 17:04:27.573	2026-01-20 01:23:19.977	\N	\N	le1
cmjreroom000p12uqqxz34wdk	Caja StarLabs	CASH	GTQ	\N	t	2025-12-29 17:04:27.575	2026-01-20 01:23:20.144	\N	\N	le2
\.


--
-- Data for Name: FinancialTransaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FinancialTransaction" (id, "financialAccountId", date, amount, type, description, reference, "createdById", "createdAt") FROM stdin;
cmjreroox001112uqlj1nqtqg	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2025-12-29 17:04:27.586
cmjreroox001212uqlv0cbb3b	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2025-12-29 17:04:27.586
cmjreroox001312uqlf4fuczk	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2025-12-29 17:04:27.586
cmjrf08ge000vb8x1q2jjthxb	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2025-12-29 17:11:06.447
cmjrf08ge000wb8x1dst2ly8u	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2025-12-29 17:11:06.447
cmjrf08ge000xb8x1hlesqw1v	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2025-12-29 17:11:06.447
cmk4ut8e30011evdm6d86zx05	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:54:33.915
cmk4ut8e30012evdml17luny3	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:54:33.915
cmk4ut8e30013evdmqqhi5dca	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-08 02:54:33.915
cmk4uug9o0011fwx5qg4m3xdh	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:55:30.781
cmk4uug9o0012fwx5yenhizii	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:55:30.781
cmk4uug9o0013fwx5t3vyq73v	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-08 02:55:30.781
cmk4uv6ie0011uje1tr9lvp7x	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:56:04.79
cmk4uv6ie0012uje1now041u0	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:56:04.79
cmk4uv6ie0013uje1auph2rzz	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-08 02:56:04.79
cmk4uwcjv0011fo0f3qito4zn	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:56:59.275
cmk4uwcjv0012fo0fmhu425u5	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-08 02:56:59.275
cmk4uwcjv0013fo0ffqt6mrko	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-08 02:56:59.275
cmk7cgxkr0011t3xn5tou3bzc	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:44:25.468
cmk7cgxkr0012t3xnicpg8qsg	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:44:25.468
cmk7cgxkr0013t3xnhsiounr9	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:44:25.468
cmk7cnhfe00118gm1o5i3dzqf	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:49:31.13
cmk7cnhfe00128gm14yhg88nv	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:49:31.13
cmk7cnhfe00138gm1i65kiz4n	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:49:31.13
cmk7coarq0011u77jzn0gve5n	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:50:09.159
cmk7coarq0012u77j0vl53off	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:50:09.159
cmk7coarq0013u77j9w6wqp7k	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:50:09.159
cmk7cp4sf0011gwxriysy8id2	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:50:48.063
cmk7cp4sf0012gwxrwjbluiwf	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:50:48.063
cmk7cp4sf0013gwxrfps8m725	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:50:48.063
cmk7cq10h0011wwje3aazci47	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:51:29.825
cmk7cq10h0012wwje71k5ibyj	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:51:29.825
cmk7cq10h0013wwje1jr32n35	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:51:29.825
cmk7cqr850011b4da197nrw6v	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:52:03.798
cmk7cqr850012b4dapue1pyiy	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:52:03.798
cmk7cqr850013b4da3hjlorkw	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:52:03.798
cmk7crk9g0011i5dbnfmvb078	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:52:41.428
cmk7crk9g0012i5dbvbrn9jge	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:52:41.428
cmk7crk9g0013i5db96gl00ht	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:52:41.428
cmk7csdfi0011re0uky8u29e8	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:53:19.23
cmk7csdfi0012re0urv0l5wkd	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:53:19.23
cmk7csdfi0013re0upv6f8dz4	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:53:19.23
cmk7ct8wc0011802qcibuqpi0	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:54:00.012
cmk7ct8wc0012802ql1ee18sm	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:54:00.012
cmk7ct8wc0013802qn2p2q9m5	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:54:00.012
cmk7cuws60011apcm5l21frnf	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:55:17.622
cmk7cuws60012apcmrt6fcy7p	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:55:17.622
cmk7cuws60013apcmwef4kgf0	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:55:17.622
cmk7cwaiz0011kko61chuu4jo	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:56:22.091
cmk7cwaiz0012kko6y5tislxf	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-09 20:56:22.091
cmk7cwaiz0013kko6n3n8rq95	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-09 20:56:22.091
cmkeai5o9001110q6xa5nlzw1	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-14 17:23:46.617
cmkeai5o9001210q6r605rmql	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-14 17:23:46.617
cmkeai5o9001310q6udsip6zk	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-14 17:23:46.617
cmklwu5wa0011g4lnccn2nqcj	cmjrerooi000l12uqxpv40fqu	2025-01-01 00:00:00	2000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-20 01:23:21.562
cmklwu5wa0012g4lnn2uaz0ap	cmjrerook000n12uqngjsqclh	2025-01-01 00:00:00	3000.00	IN	Saldo inicial	Apertura	admin-seed	2026-01-20 01:23:21.562
cmklwu5wa0013g4ln51gi4i9d	cmjrerooi000l12uqxpv40fqu	2025-01-05 00:00:00	1500.00	IN	Venta al contado	VENT-1001	admin-seed	2026-01-20 01:23:21.562
\.


--
-- Data for Name: HrAttendanceEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrAttendanceEvent" (id, "employeeId", "occurredAt", type, source, note, "createdByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HrCompensationHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrCompensationHistory" (id, "employeeId", "effectiveFrom", "prevSalary", "newSalary", "prevAllowance", "newAllowance", "prevPayScheme", "newPayScheme", comments, "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: HrDepartment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrDepartment" (id, name, description, "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
cmk4ut9z5001fevdm99ilb0ax	Administración	Operaciones y soporte corporativo	t	admin-seed	2026-01-08 02:54:35.969	2026-01-20 01:23:32.161
cmk4uta3r001gevdmogul0wjr	Clínica	Servicios médicos en clínica	t	admin-seed	2026-01-08 02:54:36.135	2026-01-20 01:23:32.327
cmk4uta62001hevdm2j83ewgv	Laboratorio	Procesos y análisis de laboratorio	t	admin-seed	2026-01-08 02:54:36.218	2026-01-20 01:23:32.413
cmk4uta84001ievdmyiyn831i	Imagenología	Rayos X, US y otros estudios	t	admin-seed	2026-01-08 02:54:36.292	2026-01-20 01:23:32.493
cmk4utaac001jevdmer8fay0h	Comercial	Ventas y relaciones comerciales	t	admin-seed	2026-01-08 02:54:36.372	2026-01-20 01:23:32.574
\.


--
-- Data for Name: HrEmployee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrEmployee" (id, "employeeCode", "firstName", "lastName", dpi, nit, email, phone, "birthDate", address, status, "isActive", "createdById", "createdAt", "updatedAt", "dpiPhotoUrl", "emergencyContactName", "emergencyContactPhone", "homePhone", "personalEmail", "photoUrl", "primaryLegalEntityId", "residenceProofUrl", "rtuFileUrl", "userId", "isExternal", notes, "completedAt", "onboardingStatus", "onboardingStep") FROM stdin;
cmkcsdqtb0000esnei0pmx8g3	EMP-DEMO-1470	María Elena	Alvarez	\N	\N	\N	55512345	\N	Zona 10, Ciudad de Guatemala	ACTIVE	t	\N	2026-01-13 16:08:41.471	2026-01-13 16:08:41.471	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	DRAFT	1
cmkcsex1w0000clcu1finx065	EMP-DEMO-6212	María Elena	Alvarez	\N	\N	\N	55512345	\N	Zona 10, Ciudad de Guatemala	ACTIVE	t	\N	2026-01-13 16:09:36.213	2026-01-13 16:09:36.213	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	DRAFT	1
cmkljdr0g0000bn9cuudb6tjq	EMP-000002	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE	f	cmjuf58yo000y13t7i9phjzy4	2026-01-19 19:06:40.768	2026-01-19 19:06:40.768	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	DRAFT	1
cmklje7d30001bn9ci5y8mk8w	EMP-000003	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE	f	cmjuf58yo000y13t7i9phjzy4	2026-01-19 19:07:01.959	2026-01-19 19:07:01.959	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	DRAFT	1
cmkljfutd0002bn9cmv5pc5ud	EMP-000004	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE	f	cmjuf58yo000y13t7i9phjzy4	2026-01-19 19:08:19.01	2026-01-19 19:08:19.01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	DRAFT	1
cmklkjnmn00014ww9rck6fi27	EMP-TEST-555218	Prueba	UX	955521801	\N	prueba-ux-555218@starmedical.test	55555555	\N	Dirección de prueba	ACTIVE	t	\N	2026-01-19 19:39:15.218	2026-01-19 19:39:15.218	/uploads/hr/demo-dpi.pdf	Contacto Prueba	44444444	22222222	\N	\N	le1	/uploads/hr/demo-recibo.pdf	/uploads/hr/demo-rtu.pdf	\N	f	\N	\N	ACTIVE	3
cmklloh710002ucasqjszd33c	EMP-880478	Carlos Andrés	Méndez López	9876543210001	\N	\N	55123456	\N	Colonia Las Flores, Palín, Escuintla	ACTIVE	t	\N	2026-01-19 20:11:00.493	2026-01-19 20:12:23.476	/uploads/hr/demo-dpi.pdf	Contacto demo	44444444	\N	\N	\N	le1	/uploads/hr/demo-recibo.pdf	/uploads/hr/demo-rtu.pdf	\N	f	\N	2026-01-19 20:12:22.814	ACTIVE	6
cmkeai8nu001s10q62mr5tjis	EMP-0001	Ana	Morales	1234567890101	\N	ana.morales@starmedical.test	50255560001	\N	Palín, Escuintla	ACTIVE	t	admin-seed	2026-01-14 17:23:50.489	2026-01-20 01:23:33.452	/uploads/hr/ana-dpi-foto.jpg	María Morales	50244445555	50222280001	\N	\N	le1	/uploads/hr/ana-recibo-agua.pdf	/uploads/hr/ana-rtu.pdf	\N	f	\N	\N	DRAFT	1
cmklwugku005ig4lneeu1k02v	EMP-0002	Luis	Pérez	1234567890202	\N	luis.perez@starmedical.test	50255560002	\N	Escuintla, Guatemala	SUSPENDED	t	admin-seed	2026-01-20 01:23:35.405	2026-01-20 01:23:35.405	/uploads/hr/luis-dpi.jpg	Carlos Pérez	50244446666	50222280002	\N	\N	le2	/uploads/hr/luis-recibo-luz.pdf	/uploads/hr/luis-rtu.pdf	\N	f	\N	\N	DRAFT	1
cmkm406st0004lojpy8hs5klw	EMP-000005	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE	f	cmjuf58yo000y13t7i9phjzy4	2026-01-20 04:43:59.982	2026-01-20 04:43:59.982	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	DRAFT	1
\.


--
-- Data for Name: HrEmployeeWarning; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrEmployeeWarning" (id, "employeeId", title, description, "issuedAt", "createdAt", "createdById") FROM stdin;
\.


--
-- Data for Name: HrPayrollLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrPayrollLine" (id, "payrollRunId", "employeeId", "baseSalary", bonuses, deductions, "netPay", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HrPayrollRun; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrPayrollRun" (id, "periodStart", "periodEnd", status, "createdByUserId", "approvedByUserId", "publishedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HrPosition; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrPosition" (id, name, description, "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
cmkllogot0000ucaswpecj7hs	Auxiliar administrativo	Apoyo administrativo	t	\N	2026-01-19 20:10:59.837	2026-01-19 20:10:59.837
cmk4utack001kevdm4sjnkjey	Doctor	Profesional médico	t	admin-seed	2026-01-08 02:54:36.453	2026-01-20 01:23:32.659
cmk4utagu001levdmmkkgbfx8	Enfermería	Cuidados y apoyo clínico	t	admin-seed	2026-01-08 02:54:36.607	2026-01-20 01:23:32.834
cmk4utaj1001mevdmm8gp11kx	Recepción	Atención y admisión	t	admin-seed	2026-01-08 02:54:36.685	2026-01-20 01:23:32.914
cmk4utalc001nevdmoa14dcbr	RRHH	Gestión de personal	t	admin-seed	2026-01-08 02:54:36.768	2026-01-20 01:23:33.043
cmk4utang001oevdm86eu00ku	Finanzas	Administración financiera	t	admin-seed	2026-01-08 02:54:36.845	2026-01-20 01:23:33.124
cmk4utapo001pevdmcn8l1ril	Técnico RX	Técnico en Rayos X	t	admin-seed	2026-01-08 02:54:36.924	2026-01-20 01:23:33.218
cmk4utarv001qevdmpwa48k8i	Técnico US	Técnico en Ultrasonido	t	admin-seed	2026-01-08 02:54:37.003	2026-01-20 01:23:33.344
\.


--
-- Data for Name: HrSettings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrSettings" (id, "currencyCode", "createdAt", "updatedAt", "logoUrl", "warningThreshold", "warningWindowDays") FROM stdin;
1	GTQ	2026-01-14 00:29:27.877	2026-01-14 00:29:27.877	\N	\N	\N
\.


--
-- Data for Name: HrWarningAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HrWarningAttachment" (id, "warningId", "fileUrl", "fileName", mime, "createdAt") FROM stdin;
\.


--
-- Data for Name: InventoryArea; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryArea" (id, name, slug, "order", "isExternal") FROM stdin;
\.


--
-- Data for Name: InventoryEmailSchedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryEmailSchedule" (id, email, "isEnabled", "reportType", "branchId", "scheduleType", "sendTime", timezone, "oneTimeDate", "monthlyDay", "useLastDay", "biweeklyMode", "fixedDays", "startDate", "lastSentAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: InventoryEmailScheduleLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryEmailScheduleLog" (id, "scheduleId", "reportType", "periodFrom", "periodTo", "sentAt", status, error) FROM stdin;
\.


--
-- Data for Name: InventoryEmailSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryEmailSetting" (id, "isEnabled", frequency, "branchId", recipients, "includeAllProducts", "createdAt", "updatedAt", "lastSentAt", "reportType", "biweeklyMode", "fixedDays", "monthlyDay", "recipientsJson", "scheduleType", "sendTime", "startDate", timezone, "useLastDay", "oneTimeDate", "oneTimeTime", "sentAt") FROM stdin;
\.


--
-- Data for Name: InventoryMarginPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryMarginPolicy" (id, "marginProductsPct", "marginServicesPct", "roundingMode", "autoApplyOnCreate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: InventoryMovement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryMovement" (id, "productId", "branchId", type, quantity, "unitCost", "salePrice", reference, reason, "createdById", "createdAt") FROM stdin;
cmk4ut6dz000hevdmkr4o0etx	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-08 02:54:31.319
cmk4uudld000hfwx52l0ch7t9	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-08 02:55:27.314
cmk4uv3vv000huje1p0by3xev	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-08 02:56:01.388
cmk4uwaj3000hfo0f7w2qy3x4	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-08 02:56:56.655
cmk7cgvga000ht3xnr4e13mjt	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:44:22.714
cmk7cnfbx000h8gm1xx6i10a7	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:49:28.413
cmk7co8qj000hu77j9ckog03a	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:50:06.524
cmk7cp22r000hgwxrh9nib3sc	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:50:44.548
cmk7cpyzr000hwwjeviq76snr	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:51:27.207
cmk7cqp2b000hb4dal96lib2v	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:52:00.996
cmk7cri5d000hi5dbg6sifvtu	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:52:38.69
cmk7csbaj000hre0un2i88s5c	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:53:16.459
cmk7ct6qg000h802q90g3kbxl	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:53:57.208
cmk7cuuko000hapcm58o2hsos	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:55:14.761
cmk7cw879000hkko6b1w1it2g	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-09 20:56:19.077
cmkeai356000h10q62za27yqm	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-14 17:23:43.338
cmklwu3n7000hg4lngazsr0hb	cmk4ut64v000devdmuqsibmi8	s1	ENTRY	50	2.5000	\N	Seed inicial	\N	admin-seed	2026-01-20 01:23:18.643
\.


--
-- Data for Name: InventoryReportLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryReportLog" (id, "settingId", "periodFrom", "periodTo", "sentAt", status, error, "reportType") FROM stdin;
\.


--
-- Data for Name: InvoiceConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoiceConfig" (id, "legalName", nit, "fiscalAddress", "defaultTaxRate", "invoiceFooterText", "pdfTemplateConfig", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: InvoiceSeries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoiceSeries" (id, "invoiceConfigId", code, "initialNumber", "currentNumber", "branchId", "isActive", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: JournalEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JournalEntry" (id, date, reference, description, "branchId", "createdById", "totalDebit", "totalCredit", status, "createdAt", "updatedAt", "legalEntityId", "sourceId", "sourceType") FROM stdin;
cmjrerooo000r12uqwnoqqfm2	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2025-12-29 17:04:27.576	2025-12-29 17:04:27.576	le1	\N	\N
cmjreroou000x12uqrm9w9h73	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2025-12-29 17:04:27.582	2025-12-29 17:04:27.582	le1	\N	\N
cmjrf08g7000lb8x12mfbwfwf	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2025-12-29 17:11:06.44	2025-12-29 17:11:06.44	le1	\N	\N
cmjrf08gc000rb8x1gn1r9wse	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2025-12-29 17:11:06.444	2025-12-29 17:11:06.444	le1	\N	\N
cmk4ut7jw000revdm1ojbjf5e	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-08 02:54:32.828	2026-01-08 02:54:32.828	le1	\N	\N
cmk4ut81d000xevdm4ihwvkel	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-08 02:54:33.458	2026-01-08 02:54:33.458	le1	\N	\N
cmk4uuf4p000rfwx5psihwlvd	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-08 02:55:29.305	2026-01-08 02:55:29.305	le1	\N	\N
cmk4uufsg000xfwx5wvpil0sv	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-08 02:55:30.161	2026-01-08 02:55:30.161	le1	\N	\N
cmk4uv5em000ruje1lrg4ftl4	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-08 02:56:03.358	2026-01-08 02:56:03.358	le1	\N	\N
cmk4uv61g000xuje1f525u9p3	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-08 02:56:04.18	2026-01-08 02:56:04.18	le1	\N	\N
cmk4uwbph000rfo0fqxjf21i7	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-08 02:56:58.181	2026-01-08 02:56:58.181	le1	\N	\N
cmk4uwc6u000xfo0fqge4ph2z	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-08 02:56:58.807	2026-01-08 02:56:58.807	le1	\N	\N
cmk7cgwor000rt3xnoq9fm7em	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:44:24.315	2026-01-09 20:44:24.315	le1	\N	\N
cmk7cgx76000xt3xnl12z6r01	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:44:24.979	2026-01-09 20:44:24.979	le1	\N	\N
cmk7cngk4000r8gm1dwotxkra	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:49:30.004	2026-01-09 20:49:30.004	le1	\N	\N
cmk7cnh22000x8gm1591iodal	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:49:30.65	2026-01-09 20:49:30.65	le1	\N	\N
cmk7co9x3000ru77jnnoq1e38	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:50:08.055	2026-01-09 20:50:08.055	le1	\N	\N
cmk7coaeg000xu77jn9hq8xlx	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:50:08.68	2026-01-09 20:50:08.68	le1	\N	\N
cmk7cp3mr000rgwxr8vubfd9y	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:50:46.564	2026-01-09 20:50:46.564	le1	\N	\N
cmk7cp4a4000xgwxrxjwiepnv	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:50:47.404	2026-01-09 20:50:47.404	le1	\N	\N
cmk7cq05z000rwwjelj1vgub7	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:51:28.727	2026-01-09 20:51:28.727	le1	\N	\N
cmk7cq0na000xwwjea1odctjt	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:51:29.35	2026-01-09 20:51:29.35	le1	\N	\N
cmk7cqqbn000rb4da9b0itjot	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:52:02.627	2026-01-09 20:52:02.627	le1	\N	\N
cmk7cqqu4000xb4danbuo8jco	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:52:03.292	2026-01-09 20:52:03.292	le1	\N	\N
cmk7crjcw000ri5dbb4pbegje	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:52:40.256	2026-01-09 20:52:40.256	le1	\N	\N
cmk7crjv6000xi5dbpp8qy6bj	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:52:40.915	2026-01-09 20:52:40.915	le1	\N	\N
cmk7cscj5000rre0uc2o4o1nc	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:53:18.066	2026-01-09 20:53:18.066	le1	\N	\N
cmk7csd1o000xre0uwx5nrh9u	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:53:18.732	2026-01-09 20:53:18.732	le1	\N	\N
cmk7ct7zr000r802q9fxsvaro	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:53:58.84	2026-01-09 20:53:58.84	le1	\N	\N
cmk7ct8in000x802q53xjqyfd	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:53:59.52	2026-01-09 20:53:59.52	le1	\N	\N
cmk7cuvup000rapcmrudmxsl0	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:55:16.417	2026-01-09 20:55:16.417	le1	\N	\N
cmk7cuwdn000xapcmaymsbmwd	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:55:17.099	2026-01-09 20:55:17.099	le1	\N	\N
cmk7cw9f9000rkko6s9p35sj4	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-09 20:56:20.662	2026-01-09 20:56:20.662	le1	\N	\N
cmk7cwa55000xkko66rvpzg7s	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-09 20:56:21.593	2026-01-09 20:56:21.593	le1	\N	\N
cmkeai4mm000r10q6syzgu1pn	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-14 17:23:45.262	2026-01-14 17:23:45.262	le1	\N	\N
cmkeai58d000x10q6o0y06pwz	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-14 17:23:46.045	2026-01-14 17:23:46.045	le1	\N	\N
cmklwu4v5000rg4lnqor63ngr	2025-01-01 00:00:00	Apertura	Saldo inicial en caja y bancos	s1	admin-seed	5000.00	5000.00	POSTED	2026-01-20 01:23:20.225	2026-01-20 01:23:20.225	le1	\N	\N
cmklwu5dt000xg4lnlv2qn52u	2025-01-05 00:00:00	VENT-1001	Venta al contado	s1	admin-seed	1500.00	1500.00	POSTED	2026-01-20 01:23:20.898	2026-01-20 01:23:20.898	le1	\N	\N
\.


--
-- Data for Name: JournalEntryLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JournalEntryLine" (id, "entryId", "accountId", debit, credit, memo, "entityType", "entityId", "createdAt") FROM stdin;
cmjrerooo000t12uqixgvnwfc	cmjrerooo000r12uqwnoqqfm2	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2025-12-29 17:04:27.576
cmjrerooo000u12uqai3h1n8d	cmjrerooo000r12uqwnoqqfm2	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2025-12-29 17:04:27.576
cmjrerooo000v12uq6twb92iq	cmjrerooo000r12uqwnoqqfm2	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2025-12-29 17:04:27.576
cmjreroou000z12uqu0lu8k00	cmjreroou000x12uqrm9w9h73	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2025-12-29 17:04:27.582
cmjreroou001012uqix52umon	cmjreroou000x12uqrm9w9h73	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2025-12-29 17:04:27.582
cmjrf08g7000nb8x1byk25b13	cmjrf08g7000lb8x12mfbwfwf	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2025-12-29 17:11:06.44
cmjrf08g7000ob8x10pwapabk	cmjrf08g7000lb8x12mfbwfwf	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2025-12-29 17:11:06.44
cmjrf08g7000pb8x11pac95ol	cmjrf08g7000lb8x12mfbwfwf	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2025-12-29 17:11:06.44
cmjrf08gc000tb8x121oainch	cmjrf08gc000rb8x1gn1r9wse	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2025-12-29 17:11:06.444
cmjrf08gc000ub8x1qwd3h9dm	cmjrf08gc000rb8x1gn1r9wse	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2025-12-29 17:11:06.444
cmk4ut7jw000tevdmvpz8bms0	cmk4ut7jw000revdm1ojbjf5e	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-08 02:54:32.828
cmk4ut7jw000uevdmi9r4f2vy	cmk4ut7jw000revdm1ojbjf5e	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-08 02:54:32.828
cmk4ut7jw000vevdmhl90rawg	cmk4ut7jw000revdm1ojbjf5e	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-08 02:54:32.828
cmk4ut81d000zevdmhk25nhjk	cmk4ut81d000xevdm4ihwvkel	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-08 02:54:33.458
cmk4ut81d0010evdmzrftha1i	cmk4ut81d000xevdm4ihwvkel	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-08 02:54:33.458
cmk4uuf4p000tfwx5u5ynexqv	cmk4uuf4p000rfwx5psihwlvd	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-08 02:55:29.305
cmk4uuf4p000ufwx56rblqgq2	cmk4uuf4p000rfwx5psihwlvd	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-08 02:55:29.305
cmk4uuf4p000vfwx52wx50ihq	cmk4uuf4p000rfwx5psihwlvd	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-08 02:55:29.305
cmk4uufsg000zfwx54gkyro5a	cmk4uufsg000xfwx5wvpil0sv	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-08 02:55:30.161
cmk4uufsg0010fwx5cze5j2vh	cmk4uufsg000xfwx5wvpil0sv	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-08 02:55:30.161
cmk4uv5em000tuje14o3vzzhn	cmk4uv5em000ruje1lrg4ftl4	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-08 02:56:03.358
cmk4uv5em000uuje1xoyt89iq	cmk4uv5em000ruje1lrg4ftl4	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-08 02:56:03.358
cmk4uv5em000vuje1v92lsi56	cmk4uv5em000ruje1lrg4ftl4	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-08 02:56:03.358
cmk4uv61g000zuje1jarkaqse	cmk4uv61g000xuje1f525u9p3	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-08 02:56:04.18
cmk4uv61g0010uje1j693pm6j	cmk4uv61g000xuje1f525u9p3	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-08 02:56:04.18
cmk4uwbph000tfo0ftzmn00ru	cmk4uwbph000rfo0fqxjf21i7	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-08 02:56:58.181
cmk4uwbph000ufo0flh4dioou	cmk4uwbph000rfo0fqxjf21i7	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-08 02:56:58.181
cmk4uwbph000vfo0fa5vklyru	cmk4uwbph000rfo0fqxjf21i7	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-08 02:56:58.181
cmk4uwc6v000zfo0frpv3umq3	cmk4uwc6u000xfo0fqge4ph2z	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-08 02:56:58.807
cmk4uwc6v0010fo0fdtfanhh1	cmk4uwc6u000xfo0fqge4ph2z	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-08 02:56:58.807
cmk7cgwor000tt3xnj5wmyt9m	cmk7cgwor000rt3xnoq9fm7em	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:44:24.315
cmk7cgwor000ut3xnkieyqih7	cmk7cgwor000rt3xnoq9fm7em	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:44:24.315
cmk7cgwor000vt3xngvkgqiaw	cmk7cgwor000rt3xnoq9fm7em	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:44:24.315
cmk7cgx76000zt3xnusg362c6	cmk7cgx76000xt3xnl12z6r01	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:44:24.979
cmk7cgx760010t3xnp99o61z1	cmk7cgx76000xt3xnl12z6r01	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:44:24.979
cmk7cngk4000t8gm1k18i5n3z	cmk7cngk4000r8gm1dwotxkra	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:49:30.004
cmk7cngk4000u8gm1rqcxzchn	cmk7cngk4000r8gm1dwotxkra	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:49:30.004
cmk7cngk4000v8gm1ricwsvln	cmk7cngk4000r8gm1dwotxkra	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:49:30.004
cmk7cnh22000z8gm1ne96us1n	cmk7cnh22000x8gm1591iodal	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:49:30.65
cmk7cnh2200108gm10zslmpbh	cmk7cnh22000x8gm1591iodal	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:49:30.65
cmk7co9x3000tu77jh46fqlb6	cmk7co9x3000ru77jnnoq1e38	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:50:08.055
cmk7co9x3000uu77js9u8ydat	cmk7co9x3000ru77jnnoq1e38	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:50:08.055
cmk7co9x3000vu77jgwbal2u1	cmk7co9x3000ru77jnnoq1e38	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:50:08.055
cmk7coaeg000zu77j1cxrys25	cmk7coaeg000xu77jn9hq8xlx	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:50:08.68
cmk7coaeg0010u77jmiy0tj0z	cmk7coaeg000xu77jn9hq8xlx	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:50:08.68
cmk7cp3mr000tgwxrtof6b4iv	cmk7cp3mr000rgwxr8vubfd9y	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:50:46.564
cmk7cp3mr000ugwxrbw8kui0l	cmk7cp3mr000rgwxr8vubfd9y	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:50:46.564
cmk7cp3mr000vgwxrirf8to6a	cmk7cp3mr000rgwxr8vubfd9y	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:50:46.564
cmk7cp4a4000zgwxr8pg31unk	cmk7cp4a4000xgwxrxjwiepnv	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:50:47.404
cmk7cp4a40010gwxr5w0jio2v	cmk7cp4a4000xgwxrxjwiepnv	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:50:47.404
cmk7cq05z000twwjevqerhawv	cmk7cq05z000rwwjelj1vgub7	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:51:28.727
cmk7cq05z000uwwjeo7jtbgmh	cmk7cq05z000rwwjelj1vgub7	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:51:28.727
cmk7cq05z000vwwje803tug2b	cmk7cq05z000rwwjelj1vgub7	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:51:28.727
cmk7cq0na000zwwjef23c6u1s	cmk7cq0na000xwwjea1odctjt	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:51:29.35
cmk7cq0na0010wwje04kyhkqc	cmk7cq0na000xwwjea1odctjt	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:51:29.35
cmk7cqqbn000tb4da9mm2lk4p	cmk7cqqbn000rb4da9b0itjot	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:52:02.627
cmk7cqqbn000ub4da1n53gjg5	cmk7cqqbn000rb4da9b0itjot	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:52:02.627
cmk7cqqbn000vb4dax261gdxz	cmk7cqqbn000rb4da9b0itjot	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:52:02.627
cmk7cqqu4000zb4da25bsuenu	cmk7cqqu4000xb4danbuo8jco	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:52:03.292
cmk7cqqu40010b4dad88059cn	cmk7cqqu4000xb4danbuo8jco	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:52:03.292
cmk7crjcw000ti5dbpg70flok	cmk7crjcw000ri5dbb4pbegje	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:52:40.256
cmk7crjcw000ui5db2uae56wb	cmk7crjcw000ri5dbb4pbegje	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:52:40.256
cmk7crjcw000vi5db3l9cr3x1	cmk7crjcw000ri5dbb4pbegje	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:52:40.256
cmk7crjv7000zi5dba4ndw7p1	cmk7crjv6000xi5dbpp8qy6bj	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:52:40.915
cmk7crjv70010i5dbdpjogre2	cmk7crjv6000xi5dbpp8qy6bj	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:52:40.915
cmk7cscj5000tre0ug4yzjtzd	cmk7cscj5000rre0uc2o4o1nc	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:53:18.066
cmk7cscj5000ure0u3p4383x4	cmk7cscj5000rre0uc2o4o1nc	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:53:18.066
cmk7cscj5000vre0ucgaxhdwh	cmk7cscj5000rre0uc2o4o1nc	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:53:18.066
cmk7csd1o000zre0u5iknrxg4	cmk7csd1o000xre0uwx5nrh9u	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:53:18.732
cmk7csd1o0010re0uex7l0oiz	cmk7csd1o000xre0uwx5nrh9u	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:53:18.732
cmk7ct7zr000t802q8banp8ze	cmk7ct7zr000r802q9fxsvaro	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:53:58.84
cmk7ct7zr000u802qcl1y3vq8	cmk7ct7zr000r802q9fxsvaro	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:53:58.84
cmk7ct7zr000v802qj3p3vvq5	cmk7ct7zr000r802q9fxsvaro	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:53:58.84
cmk7ct8in000z802qm6vnttkg	cmk7ct8in000x802q53xjqyfd	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:53:59.52
cmk7ct8in0010802qlztt1fc2	cmk7ct8in000x802q53xjqyfd	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:53:59.52
cmk7cuvup000tapcmmstns0vo	cmk7cuvup000rapcmrudmxsl0	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:55:16.417
cmk7cuvup000uapcmes9rcb2x	cmk7cuvup000rapcmrudmxsl0	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:55:16.417
cmk7cuvup000vapcmp5hcawt0	cmk7cuvup000rapcmrudmxsl0	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:55:16.417
cmk7cuwdn000zapcmuwzc5r57	cmk7cuwdn000xapcmaymsbmwd	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:55:17.099
cmk7cuwdn0010apcmicxzayxu	cmk7cuwdn000xapcmaymsbmwd	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:55:17.099
cmk7cw9f9000tkko64b6qknzr	cmk7cw9f9000rkko6s9p35sj4	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-09 20:56:20.662
cmk7cw9f9000ukko6cyxo4bvg	cmk7cw9f9000rkko6s9p35sj4	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-09 20:56:20.662
cmk7cw9f9000vkko6yms8yoes	cmk7cw9f9000rkko6s9p35sj4	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-09 20:56:20.662
cmk7cwa55000zkko6xenu3wj6	cmk7cwa55000xkko66rvpzg7s	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-09 20:56:21.593
cmk7cwa550010kko6svdvm615	cmk7cwa55000xkko66rvpzg7s	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-09 20:56:21.593
cmkeai4mm000t10q6tu2ad0gj	cmkeai4mm000r10q6syzgu1pn	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-14 17:23:45.262
cmkeai4mm000u10q65gsgiycs	cmkeai4mm000r10q6syzgu1pn	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-14 17:23:45.262
cmkeai4mm000v10q6kqiudvsv	cmkeai4mm000r10q6syzgu1pn	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-14 17:23:45.262
cmkeai58d000z10q68z2jsz7f	cmkeai58d000x10q6o0y06pwz	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-14 17:23:46.045
cmkeai58d001010q64k7q8n55	cmkeai58d000x10q6o0y06pwz	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-14 17:23:46.045
cmklwu4v5000tg4lnc792e86k	cmklwu4v5000rg4lnqor63ngr	cmjreroo6000c12uquo0bqu7a	2000.00	0.00	Caja	\N	\N	2026-01-20 01:23:20.225
cmklwu4v5000ug4lngh5s24o4	cmklwu4v5000rg4lnqor63ngr	cmjreroo9000d12uq34228i3b	3000.00	0.00	Bancos	\N	\N	2026-01-20 01:23:20.225
cmklwu4v5000vg4lnp07dch6j	cmklwu4v5000rg4lnqor63ngr	cmjreroog000j12uqgbzxpl99	0.00	5000.00	Aportación	\N	\N	2026-01-20 01:23:20.225
cmklwu5du000zg4lnr43fd4xo	cmklwu5dt000xg4lnlv2qn52u	cmjreroo6000c12uquo0bqu7a	1500.00	0.00	Cobro en caja	\N	\N	2026-01-20 01:23:20.898
cmklwu5du0010g4lnl7qla9a5	cmklwu5dt000xg4lnlv2qn52u	cmjrerood000h12uqywsyve5z	0.00	1500.00	Ingreso por ventas	\N	\N	2026-01-20 01:23:20.898
\.


--
-- Data for Name: LabIntegrationConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabIntegrationConfig" (id, provider, "apiUrl", "apiKeyEnc", enabled, "lastTestAt", "lastTestError", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: LeaveBalance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LeaveBalance" (id, "employeeId", "policyId", "availableDays", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LeavePolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LeavePolicy" (id, name, "daysPerYear", "isActive", "createdAt", "updatedAt") FROM stdin;
leave-ley	LEY	15	t	2026-01-09 20:50:21.003	2026-01-09 20:56:34.72
leave-interna	INTERNA	20	t	2026-01-09 20:50:21.166	2026-01-09 20:56:34.888
\.


--
-- Data for Name: LeaveRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LeaveRequest" (id, "employeeId", "policyId", type, "startDate", "endDate", days, status, "approvedBy", reason, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LegalEntity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LegalEntity" (id, name, "comercialName", nit, "fiscalAddress", phone, email, "isActive", "createdAt", "updatedAt") FROM stdin;
le-safe-1	StarMedical	StarMedical	CF	\N	\N	\N	t	2026-01-09 21:19:56.579	2026-01-12 17:04:33.904
le-safe-2	AllenMKT	AllenMKT	CF-ALLEN	\N	\N	\N	t	2026-01-09 21:19:56.84	2026-01-12 17:04:34.228
le1	StarMedical, S.A.	StarMedical	123456-7	\N	\N	\N	t	2025-12-29 17:04:27.543	2026-01-20 01:23:16.323
le2	StarLabs, S.A.	StarLabs	987654-3	\N	\N	\N	t	2025-12-29 17:04:27.544	2026-01-20 01:23:16.696
\.


--
-- Data for Name: MailGlobalConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MailGlobalConfig" (id, provider, "smtpHost", "smtpPort", "smtpSecure", "imapHost", "imapPort", "imapSecure", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: MailModuleAccount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MailModuleAccount" (id, "moduleKey", email, username, "passwordEnc", "fromName", "fromEmail", "isEnabled", "lastTestAt", "lastTestError", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: MembershipBenefit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipBenefit" (id, "planId", kind, "targetType", "targetId", "categoryId", "discountPercent", "includedQty", frequency, "resetEveryDays", "branchScope", "branchIds", "actionOnExceed", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MembershipConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipConfig" (id, "reminderDays", "graceDays", "inactiveAfterDays", "autoRenewWithPayment", "prorateOnMidmonth", "blockIfBalanceDue", "requireInitialPayment", "cashTransferMinMonths", "retryPolicy", "priceChangeNoticeDays", "createdAt", "updatedAt") FROM stdin;
1	30	7	90	t	t	t	t	2	\N	30	2026-01-09 20:03:55.82	2026-01-09 20:03:55.82
\.


--
-- Data for Name: MembershipContract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipContract" (id, code, "ownerType", "ownerId", "planId", status, "startAt", "endAt", "nextRenewAt", "billingFrequency", "priceLockedMonthly", "priceLockedAnnual", balance, channel, "assignedBranchId", "allowDependents", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MembershipDependent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipDependent" (id, "contractId", "personId", "relationType", active, "createdAt") FROM stdin;
\.


--
-- Data for Name: MembershipException; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipException" (id, "contractId", reason, "allowBenefits", "expiresAt", "createdByUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: MembershipPayment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipPayment" (id, "contractId", amount, method, kind, status, "paidAt", "refNo", "invoiceId", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: MembershipPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipPlan" (id, slug, name, type, active, description, "priceMonthly", "priceAnnual", currency, "maxDependents", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MembershipUsage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipUsage" (id, "contractId", "benefitId", "occurredAt", module, "referenceId", qty, "amountDiscounted", "amountCharged", exceeded, "branchId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, type, severity, title, description, "entityId", "entityType", "employeeId", "dueAt", "sentAt", "readAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: NotificationOutbox; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NotificationOutbox" (id, channel, "templateKey", payload, status, "entityId", "entityType", "scheduledAt", "sentAt", error, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OvertimeRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OvertimeRequest" (id, "employeeId", "attendanceDayId", "calculatedHours", "requestedHours", status, "reviewedById", "reviewedAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Party; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Party" (id, type, name, nit, email, phone, address, "isActive", "createdAt", "updatedAt") FROM stdin;
party-client-1	CLIENT	Clinica San Pedro	CF	\N	\N	\N	t	2025-12-29 17:04:27.545	2026-01-20 01:23:16.789
party-provider-1	PROVIDER	Proveedor Insumos	1293812-2	\N	\N	\N	t	2025-12-29 17:04:27.547	2026-01-20 01:23:16.983
party-prof-1	PROFESSIONAL	Dr. Carlos Pérez	4587123-1	\N	\N	\N	t	2025-12-29 17:04:27.548	2026-01-20 01:23:17.064
\.


--
-- Data for Name: Payable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payable" (id, date, "dueDate", amount, "paidAmount", reference, "createdAt", "updatedAt", "categoryId", "legalEntityId", "partyId", "subcategoryId", status) FROM stdin;
cmjrerop4001712uqniqurk24	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2025-12-29 17:04:27.593	2025-12-29 17:04:27.593	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmjrf08gk0011b8x120v9teu8	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2025-12-29 17:11:06.452	2025-12-29 17:11:06.452	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk4ut8xy0017evdmdx8um0f6	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-08 02:54:34.631	2026-01-08 02:54:34.631	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk4uuh0b0017fwx5ai8sq36o	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-08 02:55:31.739	2026-01-08 02:55:31.739	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk4uv78r0017uje1kxcu4k7g	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-08 02:56:05.74	2026-01-08 02:56:05.74	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk4uwd3l0017fo0fdllloxja	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-08 02:56:59.986	2026-01-08 02:56:59.986	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cgy5f0017t3xnc4h63k3y	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:44:26.211	2026-01-09 20:44:26.211	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cnhzs00178gm11m0tg1vw	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:49:31.864	2026-01-09 20:49:31.864	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cobbd0017u77j0d0mpz0c	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:50:09.865	2026-01-09 20:50:09.865	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cp5k20017gwxrri02wxof	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:50:49.058	2026-01-09 20:50:49.058	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cq1ku0017wwje6tguvac2	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:51:30.559	2026-01-09 20:51:30.559	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cqrt00017b4da1slk65qz	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:52:04.549	2026-01-09 20:52:04.549	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7crkul0017i5dbe37b2wbc	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:52:42.189	2026-01-09 20:52:42.189	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cse090017re0udf14u8yd	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:53:19.977	2026-01-09 20:53:19.977	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7ct9ho0017802qkvnx8gtb	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:54:00.78	2026-01-09 20:54:00.78	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cuxda0017apcmhjlizr4f	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:55:18.383	2026-01-09 20:55:18.383	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmk7cwb3u0017kko6z0ssq7go	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-09 20:56:22.842	2026-01-09 20:56:22.842	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmkeai6ct001710q6i7ym2lez	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-14 17:23:47.501	2026-01-14 17:23:47.501	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
cmklwu6h90017g4lnc4au3k9s	2025-01-04 00:00:00	2025-01-20 00:00:00	800.00	0.00	COMP-55	2026-01-20 01:23:22.317	2026-01-20 01:23:22.317	cmjreroo1000712uqrn10id1y	le1	party-provider-1	\N	OPEN
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, type, "receivableId", "payableId", "financialAccountId", date, amount, reference, "createdById", "createdAt", "legalEntityId", method) FROM stdin;
cmjreropa001912uqzmn28gi2	AR	cmjrerop1001512uqf1qd5m0a	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2025-12-29 17:04:27.598	le1	CASH
cmjreropa001a12uqj9ejrgpy	AP	\N	cmjrerop4001712uqniqurk24	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2025-12-29 17:04:27.598	le1	TRANSFER
cmjrf08gn0013b8x16tjgvy15	AR	cmjrf08gh000zb8x1gezds195	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2025-12-29 17:11:06.456	le1	CASH
cmjrf08gn0014b8x1863mbmmb	AP	\N	cmjrf08gk0011b8x120v9teu8	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2025-12-29 17:11:06.456	le1	TRANSFER
cmk4ut9f20019evdm4wx6nf13	AR	cmk4ut8r70015evdmgb1ygl6l	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-08 02:54:35.247	le1	CASH
cmk4ut9f2001aevdmqj5vi666	AP	\N	cmk4ut8xy0017evdmdx8um0f6	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-08 02:54:35.247	le1	TRANSFER
cmk4uuhna0019fwx5g59vut6b	AR	cmk4uugre0015fwx5kdqyvhso	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-08 02:55:32.566	le1	CASH
cmk4uuhna001afwx59m1jchl6	AP	\N	cmk4uuh0b0017fwx5ai8sq36o	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-08 02:55:32.566	le1	TRANSFER
cmk4uv7wa0019uje16ahv6wt1	AR	cmk4uv6zu0015uje1co7r62zs	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-08 02:56:06.586	le1	CASH
cmk4uv7wa001auje1tlzgysrp	AP	\N	cmk4uv78r0017uje1kxcu4k7g	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-08 02:56:06.586	le1	TRANSFER
cmk4uwdl60019fo0fqphe3092	AR	cmk4uwcwz0015fo0ffasuxkhf	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-08 02:57:00.619	le1	CASH
cmk4uwdl6001afo0fzvyqp0l7	AP	\N	cmk4uwd3l0017fo0fdllloxja	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-08 02:57:00.619	le1	TRANSFER
cmk7cgyo60019t3xndlz703xp	AR	cmk7cgxy90015t3xnqrqbd0qi	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:44:26.887	le1	CASH
cmk7cgyo6001at3xna8txfpdu	AP	\N	cmk7cgy5f0017t3xnc4h63k3y	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:44:26.887	le1	TRANSFER
cmk7cnihp00198gm1l5d7txag	AR	cmk7cnhsv00158gm17w2uofc4	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:49:32.509	le1	CASH
cmk7cnihp001a8gm18uuj1rwr	AP	\N	cmk7cnhzs00178gm11m0tg1vw	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:49:32.509	le1	TRANSFER
cmk7cobst0019u77jduu7ve7b	AR	cmk7cob4n0015u77jzmitdajg	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:50:10.494	le1	CASH
cmk7cobst001au77je1c3t6kt	AP	\N	cmk7cobbd0017u77j0d0mpz0c	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:50:10.494	le1	TRANSFER
cmk7cp6al0019gwxr3fyqes9r	AR	cmk7cp5bo0015gwxr9sxvyz1e	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:50:50.013	le1	CASH
cmk7cp6al001agwxr1l651z1m	AP	\N	cmk7cp5k20017gwxrri02wxof	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:50:50.013	le1	TRANSFER
cmk7cq2260019wwjewugwwmzv	AR	cmk7cq1e20015wwjet0tyui4g	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:51:31.183	le1	CASH
cmk7cq226001awwjesvx0prjv	AP	\N	cmk7cq1ku0017wwje6tguvac2	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:51:31.183	le1	TRANSFER
cmk7cqsbv0019b4dai5mt95im	AR	cmk7cqrly0015b4daisp5krnu	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:52:05.228	le1	CASH
cmk7cqsbw001ab4da0epc45tz	AP	\N	cmk7cqrt00017b4da1slk65qz	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:52:05.228	le1	TRANSFER
cmk7crlcx0019i5dbi8pz8f4z	AR	cmk7crkni0015i5dbg4vr8a85	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:52:42.849	le1	CASH
cmk7crlcx001ai5dbrlvwv0tb	AP	\N	cmk7crkul0017i5dbe37b2wbc	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:52:42.849	le1	TRANSFER
cmk7cseix0019re0ulzm3t8g5	AR	cmk7csdt50015re0u9d9twlaj	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:53:20.649	le1	CASH
cmk7cseix001are0u81nh9bwh	AP	\N	cmk7cse090017re0udf14u8yd	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:53:20.649	le1	TRANSFER
cmk7cta040019802qv4lfdaiw	AR	cmk7ct9ah0015802q9nmw1xhr	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:54:01.445	le1	CASH
cmk7cta04001a802qm8fu7w18	AP	\N	cmk7ct9ho0017802qkvnx8gtb	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:54:01.445	le1	TRANSFER
cmk7cuxwa0019apcmycqfs1pw	AR	cmk7cux670015apcm71dybkid	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:55:19.066	le1	CASH
cmk7cuxwa001aapcmygow3r9s	AP	\N	cmk7cuxda0017apcmhjlizr4f	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:55:19.066	le1	TRANSFER
cmk7cwblu0019kko6kc6n4x82	AR	cmk7cwawm0015kko67d8d8xrt	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-09 20:56:23.49	le1	CASH
cmk7cwblu001akko61hrmz0uo	AP	\N	cmk7cwb3u0017kko6z0ssq7go	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-09 20:56:23.49	le1	TRANSFER
cmkeai6y5001910q6mjdh2jsp	AR	cmkeai645001510q6l902i8w7	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-14 17:23:48.269	le1	CASH
cmkeai6y5001a10q6jyje38w3	AP	\N	cmkeai6ct001710q6i7ym2lez	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-14 17:23:48.269	le1	TRANSFER
cmklwu6z70019g4ln12u7hw6i	AR	cmklwu69t0015g4lno7tt01t5	\N	cmjrerooi000l12uqxpv40fqu	2025-01-06 00:00:00	200.00	Abono cliente	admin-seed	2026-01-20 01:23:22.963	le1	CASH
cmklwu6z7001ag4ln51r507z5	AP	\N	cmklwu6h90017g4lnc4au3k9s	cmjrerook000n12uqngjsqclh	2025-01-10 00:00:00	300.00	Pago proveedor	admin-seed	2026-01-20 01:23:22.963	le1	TRANSFER
\.


--
-- Data for Name: PayrollConcept; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollConcept" (id, code, type, description, "isTaxable", "isEditable", "isActive", "createdAt", "updatedAt") FROM stdin;
salario_base	SALARIO_BASE	EARNING	Salario base	t	f	t	2026-01-09 20:52:18.85	2026-01-12 17:04:36.92
hora_extra	HORA_EXTRA	EARNING	Horas extra aprobadas	t	f	t	2026-01-09 20:52:19.024	2026-01-12 17:04:37.132
bono	BONO	EARNING	Bonificación	t	t	t	2026-01-09 20:52:19.108	2026-01-12 17:04:37.231
descuento	DESCUENTO	DEDUCTION	Descuento	f	t	t	2026-01-09 20:52:19.192	2026-01-12 17:04:37.344
honorarios	HONORARIOS	EARNING	Honorarios profesionales	t	t	t	2026-01-09 20:52:19.278	2026-01-12 17:04:37.451
\.


--
-- Data for Name: PayrollEmployee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollEmployee" (id, "payrollRunId", "employeeId", "engagementId", "employmentType", "baseSalary", "workedDays", "workedHours", "overtimeHours", "grossAmount", "totalDeductions", "netAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PayrollEmployeeConcept; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollEmployeeConcept" (id, "payrollEmployeeId", "conceptId", quantity, amount, total, "createdAt") FROM stdin;
\.


--
-- Data for Name: PayrollFinanceRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollFinanceRecord" (id, "payrollRunId", "payrollEmployeeId", "payableId", amount, "createdAt") FROM stdin;
\.


--
-- Data for Name: PayrollRun; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollRun" (id, "legalEntityId", "periodStart", "periodEnd", status, notes, "approvedAt", "approvedById", "createdById", "createdAt", "updatedAt", code, "totalGross", "totalDeductions", "totalNet", "publishedAt") FROM stdin;
\.


--
-- Data for Name: PayrollRunEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollRunEntry" (id, "payrollRunId", "engagementId", "compensationSnapshot", "grossAmount", "netAmount", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, key, description, "createdAt", "updatedAt", module, area, action) FROM stdin;
cmjuf58xh000013t7z9dcqcj6	crm.lead.read	crm.lead.read	2025-12-31 19:38:18.87	2025-12-31 19:38:18.87	GENERAL	CORE	READ
cmjuf58xq000113t7p8b14yz1	crm.lead.write	crm.lead.write	2025-12-31 19:38:18.879	2025-12-31 19:38:18.879	GENERAL	CORE	READ
cmjuf58xt000213t7n9qgqgq0	crm.deal.read	crm.deal.read	2025-12-31 19:38:18.881	2025-12-31 19:38:18.881	GENERAL	CORE	READ
cmjuf58xu000313t740cwc1p6	crm.deal.write	crm.deal.write	2025-12-31 19:38:18.883	2025-12-31 19:38:18.883	GENERAL	CORE	READ
cmjuf58xx000413t7fd6mql9n	crm.quote.read	crm.quote.read	2025-12-31 19:38:18.885	2025-12-31 19:38:18.885	GENERAL	CORE	READ
cmjuf58xz000513t7x66415ph	crm.quote.write	crm.quote.write	2025-12-31 19:38:18.887	2025-12-31 19:38:18.887	GENERAL	CORE	READ
cmjuf58y0000613t7kxqv4mq2	crm.quote.send	crm.quote.send	2025-12-31 19:38:18.889	2025-12-31 19:38:18.889	GENERAL	CORE	READ
cmjuf58y2000713t7trtwl52q	crm.quote.approve	crm.quote.approve	2025-12-31 19:38:18.89	2025-12-31 19:38:18.89	GENERAL	CORE	READ
cmjuf58y3000813t7ffiebgjy	crm.config.read	crm.config.read	2025-12-31 19:38:18.892	2025-12-31 19:38:18.892	GENERAL	CORE	READ
cmjuf58y5000913t7glgaxxsc	crm.config.write	crm.config.write	2025-12-31 19:38:18.894	2025-12-31 19:38:18.894	GENERAL	CORE	READ
cmjuf58y6000a13t767t8e9o3	crm.audit.read	crm.audit.read	2025-12-31 19:38:18.895	2025-12-31 19:38:18.895	GENERAL	CORE	READ
cmkbexgh4000mj0ryol9cwtu2	HR:DOCS:READ	Ver expedientes y documentos de RRHH	2026-01-12 17:04:20.393	2026-01-20 01:23:24.903	HR	DOCS	READ
cmk7drpfr000cjsjk8zcavlim	HR:ATTENDANCE:READ	Ver marcajes y asistencia	2026-01-09 21:20:47.752	2026-01-20 01:23:25.148	HR	ATTENDANCE	READ
cmk7cgzb2001gt3xnymbtjjkp	HR:READ	Ver módulo de RRHH	2026-01-09 20:44:27.71	2026-01-09 20:56:24.325	GENERAL	CORE	READ
cmk7cgzfz001ht3xna7461sxi	HR:WRITE	Crear y editar empleados	2026-01-09 20:44:27.888	2026-01-09 20:56:24.492	GENERAL	CORE	READ
cmkbexgdr000lj0ryv0xuz4l6	HR:EMPLOYEES:DELETE	Desactivar o baja de empleados	2026-01-12 17:04:20.272	2026-01-12 17:04:37.847	HR	EMPLOYEES	DELETE
cmk7cgzkm001jt3xn131uxj10	HR:APPROVE	Aprobar procesos RRHH y nómina	2026-01-09 20:44:28.055	2026-01-09 20:56:24.659	GENERAL	CORE	READ
cmk7drpkb000djsjk8w6s3v03	HR:ATTENDANCE:WRITE	Registrar/ajustar asistencia	2026-01-09 21:20:47.915	2026-01-20 01:23:25.229	HR	ATTENDANCE	WRITE
cmk7cgzia001it3xnvx84as8o	HR:DOCS:EDIT	Subir y editar documentos laborales	2026-01-09 20:44:27.97	2026-01-12 17:04:38.051	HR	DOCS	EDIT
cmk7drpoj000fjsjk5cykgbv6	HR:PAYROLL:READ	Ver corridas de nómina	2026-01-09 21:20:48.068	2026-01-20 01:23:25.47	HR	PAYROLL	READ
cmk7drpqo000gjsjkaibr524a	HR:PAYROLL:WRITE	Crear/editar nómina	2026-01-09 21:20:48.144	2026-01-20 01:23:25.549	HR	PAYROLL	WRITE
cmk7drpmf000ejsjkwj4dhpiq	HR:ATTENDANCE:APPROVE	Aprobar horas extra y ajustes	2026-01-09 21:20:47.992	2026-01-12 17:04:38.371	HR	ATTENDANCE	APPROVE
cmk7drpsv000hjsjktnlf25pa	HR:PAYROLL:APPROVE	Aprobar nómina	2026-01-09 21:20:48.224	2026-01-20 01:23:25.638	HR	PAYROLL	APPROVE
cmk7drpv4000ijsjk5tnam0cr	HR:PAYROLL:PUBLISH	Publicar nómina hacia finanzas	2026-01-09 21:20:48.304	2026-01-20 01:23:25.721	HR	PAYROLL	PUBLISH
cmkbexh4z000vj0ryq7yxy32m	HR:LEAVE:READ	Ver permisos/ausencias	2026-01-12 17:04:21.252	2026-01-12 17:04:38.891	HR	LEAVE	READ
cmkbexh7j000wj0ry3fhryn6t	HR:LEAVE:APPROVE	Aprobar o denegar ausencias	2026-01-12 17:04:21.344	2026-01-12 17:04:38.987	HR	LEAVE	APPROVE
cmkbexha4000xj0ryob50a3w0	HR:SETTINGS:ADMIN	Configurar RRHH y nómina	2026-01-12 17:04:21.436	2026-01-12 17:04:39.091	HR	SETTINGS	ADMIN
cmkbexhfo000zj0rybdvfkbmq	CRM:LEADS:WRITE	Crear/editar leads	2026-01-12 17:04:21.637	2026-01-20 01:23:23.469	CRM	LEADS	WRITE
cmkbexhkw0011j0ryxedjf0v7	CRM:DEALS:WRITE	Crear/editar oportunidades	2026-01-12 17:04:21.824	2026-01-20 01:23:23.629	CRM	DEALS	WRITE
cmkbexhnw0012j0ry1fkveyq2	CRM:QUOTES:READ	Ver cotizaciones	2026-01-12 17:04:21.932	2026-01-20 01:23:23.712	CRM	QUOTES	READ
cmkbexhqj0013j0ry1bb0owiv	CRM:QUOTES:WRITE	Crear/editar cotizaciones	2026-01-12 17:04:22.028	2026-01-20 01:23:23.792	CRM	QUOTES	WRITE
cmkbexhwf0015j0ry28tfa8t5	CRM:QUOTES:PUBLISH	Enviar/publicar cotizaciones	2026-01-12 17:04:22.24	2026-01-20 01:23:23.879	CRM	QUOTES	PUBLISH
cmkbexhtc0014j0rys5fmlahz	CRM:QUOTES:APPROVE	Aprobar cotizaciones	2026-01-12 17:04:22.128	2026-01-20 01:23:23.963	CRM	QUOTES	APPROVE
cmkbexi1r0017j0ryopbk6vt5	CRM:PROPOSALS:WRITE	Crear/editar propuestas	2026-01-12 17:04:22.432	2026-01-20 01:23:24.135	CRM	PROPOSALS	WRITE
cmkbexhz70016j0rycwrorf2u	CRM:PROPOSALS:READ	Ver propuestas	2026-01-12 17:04:22.34	2026-01-20 01:23:24.044	CRM	PROPOSALS	READ
cmkbexi4g0018j0rydb20oi5r	CRM:PROPOSALS:PUBLISH	Enviar propuestas	2026-01-12 17:04:22.528	2026-01-20 01:23:24.217	CRM	PROPOSALS	PUBLISH
cmkbexi790019j0ryf0kp4dbh	CRM:FILES:READ	Ver archivos de CRM	2026-01-12 17:04:22.629	2026-01-20 01:23:24.307	CRM	FILES	READ
cmkbexi9v001aj0ryddll8fa9	CRM:FILES:WRITE	Subir y editar archivos	2026-01-12 17:04:22.724	2026-01-20 01:23:24.392	CRM	FILES	WRITE
cmkbexicn001bj0rysw4og6xg	CRM:SETTINGS:ADMIN	Configurar pipelines y CRM	2026-01-12 17:04:22.824	2026-01-20 01:23:24.475	CRM	SETTINGS	ADMIN
cmkbexifn001cj0ryc2f2ow2r	CRM:AUDIT:READ	Ver auditoría de CRM	2026-01-12 17:04:22.932	2026-01-20 01:23:24.557	CRM	AUDIT	READ
cmkbexg5b000jj0ry65afsh5f	HR:EMPLOYEES:READ	Ver empleados y su ficha	2026-01-12 17:04:19.967	2026-01-20 01:23:24.64	HR	EMPLOYEES	READ
cmkbexgb7000kj0ryxbzls3rc	HR:EMPLOYEES:WRITE	Crear y editar empleados	2026-01-12 17:04:20.18	2026-01-20 01:23:24.736	HR	EMPLOYEES	WRITE
cmkbexiib001dj0ryaf1ph11o	FIN:GENERAL:READ	Ver módulo de finanzas y dashboards	2026-01-12 17:04:23.027	2026-01-12 17:04:40.735	FIN	GENERAL	READ
cmkbexiks001ej0ry6cm5k93b	FIN:GENERAL:WRITE	Crear/editar transacciones financieras	2026-01-12 17:04:23.116	2026-01-12 17:04:40.827	FIN	GENERAL	WRITE
cmkbexinf001fj0rymyz7wzhp	FIN:PAYMENTS:APPROVE	Aprobar pagos y desembolsos	2026-01-12 17:04:23.212	2026-01-12 17:04:40.939	FIN	PAYMENTS	APPROVE
cmkbexiq1001gj0ryvlkvjklr	FIN:REPORTS:READ	Ver reportes financieros	2026-01-12 17:04:23.305	2026-01-12 17:04:41.047	FIN	REPORTS	READ
cmkbexisn001hj0ryqb9zp99v	FIN:SETTINGS:ADMIN	Configurar catálogos financieros	2026-01-12 17:04:23.4	2026-01-12 17:04:41.151	FIN	SETTINGS	ADMIN
cmkbexiv9001ij0ryolmxe0q4	INV:ITEMS:READ	Ver catálogo de inventario	2026-01-12 17:04:23.494	2026-01-12 17:04:41.251	INV	ITEMS	READ
cmkbexiy0001jj0ryeitn7qko	INV:ITEMS:WRITE	Crear/editar ítems y SKUs	2026-01-12 17:04:23.592	2026-01-12 17:04:41.359	INV	ITEMS	WRITE
cmkbexj0r001kj0ryois2zwzk	INV:ITEMS:DELETE	Desactivar ítems	2026-01-12 17:04:23.692	2026-01-12 17:04:41.458	INV	ITEMS	DELETE
cmkbexj37001lj0rywscjg5ia	INV:STOCK:WRITE	Registrar movimientos/ajustes	2026-01-12 17:04:23.779	2026-01-12 17:04:41.555	INV	STOCK	WRITE
cmkbexj67001mj0rycmk4fdw4	INV:STOCK:APPROVE	Aprobar movimientos sensibles	2026-01-12 17:04:23.888	2026-01-12 17:04:41.663	INV	STOCK	APPROVE
cmkbexhd0000yj0ry6w315yeq	CRM:LEADS:READ	Ver leads	2026-01-12 17:04:21.541	2026-01-20 01:23:23.299	CRM	LEADS	READ
cmkbexhic0010j0ry2qgsb86t	CRM:DEALS:READ	Ver oportunidades	2026-01-12 17:04:21.732	2026-01-20 01:23:23.553	CRM	DEALS	READ
cmkbexj98001nj0ry0kqeh8y7	INV:REPORTS:READ	Ver reportes/Kardex	2026-01-12 17:04:23.997	2026-01-12 17:04:41.751	INV	REPORTS	READ
cmkbexjc7001oj0ryull8xrbs	INV:SETTINGS:ADMIN	Configurar inventario	2026-01-12 17:04:24.103	2026-01-12 17:04:41.847	INV	SETTINGS	ADMIN
cmkbexjeo001pj0ryd3e4izy9	AGENDA:APPOINTMENTS:READ	Ver agenda y citas	2026-01-12 17:04:24.193	2026-01-12 17:04:41.965	AGENDA	APPOINTMENTS	READ
cmkbexjhg001qj0ryr5xem9l9	AGENDA:APPOINTMENTS:WRITE	Crear o reprogramar citas	2026-01-12 17:04:24.292	2026-01-12 17:04:42.087	AGENDA	APPOINTMENTS	WRITE
cmkbexjjz001rj0rybt7rgy4y	AGENDA:APPOINTMENTS:DELETE	Cancelar citas	2026-01-12 17:04:24.384	2026-01-12 17:04:42.221	AGENDA	APPOINTMENTS	DELETE
cmkbexjmk001sj0ry0wi776hy	AGENDA:APPOINTMENTS:APPROVE	Confirmar/autorizar citas	2026-01-12 17:04:24.476	2026-01-12 17:04:42.349	AGENDA	APPOINTMENTS	APPROVE
cmkbexjpf001tj0ry3p9qo4we	AGENDA:SETTINGS:ADMIN	Configurar agenda	2026-01-12 17:04:24.58	2026-01-12 17:04:42.482	AGENDA	SETTINGS	ADMIN
cmkbexjrw001uj0ryrmsnr544	USERS:GENERAL:READ	Ver usuarios	2026-01-12 17:04:24.668	2026-01-12 17:04:42.61	USERS	GENERAL	READ
cmkbexjun001vj0ryrjoeswh3	USERS:GENERAL:WRITE	Crear/editar usuarios	2026-01-12 17:04:24.767	2026-01-12 17:04:42.749	USERS	GENERAL	WRITE
cmkbexjx4001wj0ryg192fdz7	USERS:GENERAL:ADMIN	Administrar roles y seguridad	2026-01-12 17:04:24.856	2026-01-12 17:04:42.893	USERS	GENERAL	ADMIN
cmkbexjzz001xj0ry63mub0kq	SECURITY:PERMISSIONS:ADMIN	Gestionar matriz de permisos	2026-01-12 17:04:24.96	2026-01-12 17:04:43.026	SECURITY	PERMISSIONS	ADMIN
cmkbexk2f001yj0rymxsag2gg	SETTINGS:GENERAL:ADMIN	Administración global	2026-01-12 17:04:25.048	2026-01-12 17:04:43.159	SETTINGS	GENERAL	ADMIN
cmklwu8el001sg4lnupni0kux	HR:EMPLOYEES:STATUS	\N	2026-01-20 01:23:24.814	2026-01-20 01:23:24.814	HR	EMPLOYEES	STATUS
cmklwu8je001ug4lncwfo5ip1	HR:DOCS:UPLOAD	\N	2026-01-20 01:23:24.987	2026-01-20 01:23:24.987	HR	DOCS	UPLOAD
cmklwu8lj001vg4ln4pqqajii	HR:DOCS:RESTRICTED	\N	2026-01-20 01:23:25.064	2026-01-20 01:23:25.064	HR	DOCS	RESTRICTED
cmklwu8sf001yg4ln5djea9uy	HR:ATTENDANCE:CLOSE	\N	2026-01-20 01:23:25.312	2026-01-20 01:23:25.312	HR	ATTENDANCE	CLOSE
cmklwu8up001zg4lnn0gwb6mm	HR:DASHBOARD:READ	\N	2026-01-20 01:23:25.393	2026-01-20 01:23:25.393	HR	DASHBOARD	READ
cmklwu95z0024g4ln6q8ropwn	HR:SETTINGS:READ	\N	2026-01-20 01:23:25.8	2026-01-20 01:23:25.8	HR	SETTINGS	READ
cmklwu9860025g4lnbzjrsl9k	HR:SETTINGS:WRITE	\N	2026-01-20 01:23:25.878	2026-01-20 01:23:25.878	HR	SETTINGS	WRITE
cmklwu9aa0026g4lnli37ct7a	USERS:ADMIN	\N	2026-01-20 01:23:25.954	2026-01-20 01:23:25.954	USERS	ADMIN	READ
\.


--
-- Data for Name: PipelineConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PipelineConfig" (id, name, type, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PipelineRule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PipelineRule" (id, "ruleSetId", type, severity, message, params, "isActive", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PipelineRuleSet; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PipelineRuleSet" (id, "pipelineId", scope, "stageKey", "fromStageKey", "toStageKey", name, description, priority, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PipelineStage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PipelineStage" (id, "pipelineId", key, name, "order", "slaDays", probability, "isTerminal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PipelineTransition; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PipelineTransition" (id, "pipelineId", "fromStageKey", "toStageKey", "isEnabled", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PriceList; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PriceList" (id, name, type, estado, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PriceListItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PriceListItem" (id, "priceListId", "itemType", "itemId", precio) FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Product" (id, name, code, "categoryId", "subcategoryId", "inventoryAreaId", unit, cost, price, status, "createdAt", "updatedAt", "avgCost", "baseSalePrice", "marginPct") FROM stdin;
cmjrl8tha0001gl4vyz2nixxk	Botiquin basico	BOT-001	botiquines	\N	\N	\N	0.0000	450.0000	Activo	2025-12-29 20:05:44.638	2025-12-29 20:06:06.842	0.0000	450.0000	\N
cmjrl8thi0003gl4vbmfv0g1w	Botiquin industrial	BOT-002	botiquines	\N	\N	\N	0.0000	950.0000	Activo	2025-12-29 20:05:44.646	2025-12-29 20:06:06.845	0.0000	950.0000	\N
cmjrl8thj0005gl4vjenr06fs	Extintor PQS 10lb	EXT-010	extintores	\N	\N	\N	0.0000	380.0000	Activo	2025-12-29 20:05:44.648	2025-12-29 20:06:06.846	0.0000	380.0000	\N
cmjrl8thl0007gl4v1b834b1b	Extintor CO2 15lb	EXT-015	extintores	\N	\N	\N	0.0000	620.0000	Activo	2025-12-29 20:05:44.65	2025-12-29 20:06:06.847	0.0000	620.0000	\N
cmjrl8thm0009gl4vtimbgd3q	Monitor de signos vitales	EQ-100	equipo-medico	\N	\N	\N	0.0000	5200.0000	Activo	2025-12-29 20:05:44.651	2025-12-29 20:06:06.848	0.0000	5200.0000	\N
cmjrl8tho000bgl4vwmm4jhki	Desfibrilador AED	EQ-200	equipo-medico	\N	\N	\N	0.0000	11200.0000	Activo	2025-12-29 20:05:44.652	2025-12-29 20:06:06.849	0.0000	11200.0000	\N
cmk4ut64v000devdmuqsibmi8	Paracetamol 500mg	MED-001	botiquines	\N	\N	u	2.5000	5.0000	Activo	2026-01-08 02:54:30.992	2026-01-20 01:23:18.305	2.5000	5.0000	\N
\.


--
-- Data for Name: ProductCategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductCategory" (id, name, slug, type, "order", status) FROM stdin;
botiquines	Botiquines	botiquines	PRODUCTO	0	Activo
extintores	Extintores	extintores	PRODUCTO	0	Activo
equipo-medico	Equipo Medico	equipo-medico	PRODUCTO	0	Activo
\.


--
-- Data for Name: ProductStock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductStock" (id, "productId", "branchId", stock, "minStock", "updatedAt") FROM stdin;
cmk4ut69j000fevdmfaszvred	cmk4ut64v000devdmuqsibmi8	s1	50	10	2026-01-20 01:23:18.475
\.


--
-- Data for Name: ProductSubcategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductSubcategory" (id, "categoryId", name, slug, "order", status) FROM stdin;
\.


--
-- Data for Name: ProfessionalLicense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProfessionalLicense" (id, "employeeId", applies, number, "issuedAt", "expiresAt", "issuingEntity", "fileUrl", "reminderDays", notes, "createdAt", "updatedAt") FROM stdin;
cmklwugg2005gg4ln66qj8wqg	cmkeai8nu001s10q62mr5tjis	t	COL-2024-001	2024-01-10 00:00:00	2026-01-09 00:00:00	\N	/uploads/hr/ana-licencia.pdf	\N	\N	2026-01-20 01:23:35.233	2026-01-20 01:23:35.233
cmklwuh5y005kg4lnu9cxu7qx	cmklwugku005ig4lneeu1k02v	f	\N	\N	\N	\N	\N	\N	\N	2026-01-20 01:23:36.166	2026-01-20 01:23:36.166
\.


--
-- Data for Name: PurchaseOrder; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PurchaseOrder" (id, code, "supplierId", "branchId", "createdById", status, "requestId", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PurchaseOrderItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PurchaseOrderItem" (id, "purchaseOrderId", "productId", quantity, "unitCost", "receivedQty") FROM stdin;
\.


--
-- Data for Name: PurchaseRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PurchaseRequest" (id, code, "branchId", "requestedById", status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PurchaseRequestItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PurchaseRequestItem" (id, "purchaseRequestId", "productId", quantity, "unitId", "supplierId", notes) FROM stdin;
\.


--
-- Data for Name: Quote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Quote" (id, "dealId", type, status, "isActive", number, "issuedAt", "createdById", "sentAt", "approvalRequestedAt", "approvedAt", "approvedById", "rejectedAt", "rejectedById", "rejectionReason", "templateId", notes, "validityDays", currency, subtotal, "discountTotal", "taxTotal", total, "pdfUrl", "pdfGeneratedAt", "createdAt", "updatedAt", "chequePayableTo", "deliveryNote", "deliveryTime", "paymentTerms", "pricesIncludeTax") FROM stdin;
cmjrlljqd000a13m5a5f9jtcf	cmjrlljif000313m5kk4nrr87	B2C	DRAFT	f	001-2025	2025-12-29 20:15:38.533	\N	\N	\N	\N	\N	\N	\N	\N	quote-template-b2c-simple		15	GTQ	540.00	0.00	0.00	540.00	\N	\N	2025-12-29 20:15:38.533	2025-12-29 20:15:38.533	StarMedical, S.A.	Coordinaremos la entrega con tu equipo una vez recibida la aprobación.	Entrega en 3-5 días hábiles según disponibilidad.	Pago contra entrega o transferencia previa.	t
cmjs4ra0b000davwkkp5h4geq	cmjrjntud000g1ohn6x6yioh0	B2B	DRAFT	f	002-2025	2025-12-30 05:11:58.571	\N	\N	\N	\N	\N	\N	\N	\N	quote-template-b2b-propuesta		15	GTQ	3000.00	75.00	0.00	2925.00	/uploads/quotes/quote-b2b-76ef6034-cb9b-4b4d-8d6f-7d5b2c3fdaa0.pdf	2025-12-30 05:15:16.079	2025-12-30 05:11:58.571	2025-12-30 05:15:16.08	StarMedical, S.A.	Coordinaremos la entrega con tu equipo una vez recibida la aprobación.	Entrega en 3-5 días hábiles según disponibilidad.	Pago contra entrega o transferencia previa.	t
cmjumpuzm000blaocpzkgbfvh	cmjumogjp0004laoc5m2ftkml	B2B	DRAFT	f	003-2025	2025-12-31 23:10:17.89	\N	\N	\N	\N	\N	\N	\N	\N	quote-template-b2b-propuesta		15	GTQ	250.00	0.00	0.00	250.00	\N	\N	2025-12-31 23:10:17.89	2025-12-31 23:10:17.89	StarMedical, S.A.	Coordinaremos la entrega con tu equipo una vez recibida la aprobación.	Entrega en 3-5 días hábiles según disponibilidad.	Crédito 30 días	t
cmk31l5r60004ws0jjjws1a63	cmjumogjp0004laoc5m2ftkml	B2B	DRAFT	f	001-2026	2026-01-06 20:28:42.21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	15	GTQ	3500.00	0.00	0.00	3500.00	\N	\N	2026-01-06 20:28:42.21	2026-01-06 20:28:42.21	StarMedical, S.A.	Coordinaremos la entrega con tu equipo una vez recibida la aprobación.	Entrega en 3-5 días hábiles según disponibilidad.	Pago contra entrega o transferencia previa.	t
\.


--
-- Data for Name: QuoteDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuoteDelivery" (id, "quoteId", "dealId", channel, "to", cc, bcc, subject, "bodyText", "bodyHtml", "pdfUrl", "pdfHash", "pdfVersion", "fileAssetId", status, provider, "providerMessageId", "actorUserId", metadata, "sentAt", "deliveredAt", "failedAt", "errorCode", "errorMessage", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: QuoteItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuoteItem" (id, "quoteId", category, "productName", "refCode", description, qty, "unitPrice", "discountPct", "lineTotal", enlace) FROM stdin;
cmjrlljqd000b13m5fqov9o2j	cmjrlljqd000a13m5a5f9jtcf	Servicio	Servicio manual	\N	\N	1.00	200.00	\N	200.00	\N
cmjrlljqd000c13m5yz49yit7	cmjrlljqd000a13m5a5f9jtcf	Servicio	Servicio manual	\N	\N	1.00	340.00	\N	340.00	\N
cmjs4ra0b000eavwkc3byf6h8	cmjs4ra0b000davwkkp5h4geq	Servicio	Consultoria SSO	\N	\N	1.00	1500.00	\N	1500.00	\N
cmjs4ra0b000favwk4dzr0cx0	cmjs4ra0b000davwkkp5h4geq	Equipo	Botiquin industrial	\N	\N	2.00	750.00	5.00	1425.00	\N
cmjumpuzm000claoc45b9lz2l	cmjumpuzm000blaocpzkgbfvh	Servicios medicos	Consulta medica general	SRV-CON	\N	1.00	250.00	\N	250.00	\N
\.


--
-- Data for Name: QuoteRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuoteRequest" (id, "dealId", "createdAt", "createdById", services, description, status, "quoteId") FROM stdin;
\.


--
-- Data for Name: QuoteSettings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuoteSettings" (id, "defaultTemplateB2BId", "defaultTemplateB2CId", "defaultValidityDays", "defaultIntroLetterHtml", "defaultTermsB2BHtml", "defaultTermsB2CHtml", "defaultFooterJson", "defaultBankAccountsJson", "defaultChequePayableTo", "defaultPaymentTerms", "defaultDeliveryTime", "defaultDeliveryNote", "showTaxIncludedText", "showBankBlock", "createdAt", "updatedAt") FROM stdin;
1	quote-template-b2b-propuesta	quote-template-b2c-simple	15	<p>Estimado {{clientName}},</p><p>Adjuntamos nuestra propuesta para {{services}} con el detalle comercial y operativo.</p><p>Quedamos atentos a programar una reunión para resolver dudas.</p>	<ul><li>Precios en GTQ, vigencia 15 días.</li><li>Los servicios se calendarizan en coordinación con su equipo.</li><li>Se requiere orden de compra o aprobación escrita.</li></ul>	<p>Precios incluyen IVA y pueden variar según existencias. Garantía según fabricante.</p>	{"text": "Gracias por confiar en StarMedical. Nuestro equipo queda atento a tus comentarios."}	[{"bank": "BAC", "currency": "GTQ", "accountName": "StarMedical, S.A.", "accountType": "Monetaria", "accountNumber": "200045612-1"}, {"bank": "BI", "currency": "USD", "accountName": "StarMedical, S.A.", "accountType": "Monetaria", "accountNumber": "120-554166-2"}]	StarMedical, S.A.	Pago contra entrega o transferencia previa.	Entrega en 3-5 días hábiles según disponibilidad.	Coordinaremos la entrega con tu equipo una vez recibida la aprobación.	t	t	2025-12-29 17:04:27.632	2026-01-20 01:23:40.638
\.


--
-- Data for Name: QuoteTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuoteTemplate" (id, name, type, "isDefault", "sectionsJson", "headerJson", "coverImageUrl", "introLetterHtml", "experienceLogosJson", "termsHtml", "bankAccountsJson", "createdAt", "updatedAt") FROM stdin;
quote-template-b2c-simple	B2C Simple (Diprolab)	B2C	t	{"sections": [{"key": "header", "label": "Encabezado", "enabled": true}, {"key": "client", "label": "Datos cliente", "enabled": true}, {"key": "items", "label": "Productos/Servicios", "enabled": true}, {"key": "totals", "label": "Totales", "enabled": true}, {"key": "notes", "label": "Observaciones", "enabled": true}, {"key": "banks", "label": "Datos bancarios", "enabled": true}]}	{"email": "ventas@starmedical.com", "phone": "+502 2456-7890", "address": "Ciudad de Guatemala", "logoUrl": "/assets/quotes/starmedical-logo.png", "companyName": "StarMedical"}	\N	\N	\N	<p>Precios incluyen IVA y pueden variar según existencias. Garantía según fabricante.</p>	[{"bank": "BAC", "currency": "GTQ", "accountName": "StarMedical, S.A.", "accountType": "Monetaria", "accountNumber": "200045612-1"}, {"bank": "BI", "currency": "USD", "accountName": "StarMedical, S.A.", "accountType": "Monetaria", "accountNumber": "120-554166-2"}]	2025-12-29 17:04:27.627	2026-01-20 01:23:40.301
quote-template-b2b-propuesta	B2B Propuesta	B2B	t	{"sections": [{"key": "cover", "label": "Portada", "enabled": true}, {"key": "letter", "label": "Carta de presentación", "enabled": true}, {"key": "experience", "label": "Logos experiencia", "enabled": true}, {"key": "quote", "label": "Cotización", "enabled": true}, {"key": "terms", "label": "Términos", "enabled": true}, {"key": "banks", "label": "Datos bancarios", "enabled": true}]}	{"email": "ventas@starmedical.com", "phone": "+502 2456-7890", "address": "Ciudad de Guatemala", "logoUrl": "/assets/quotes/starmedical-logo.png", "tagline": "Soluciones médicas y SSO para empresas", "companyName": "StarMedical"}	/assets/quotes/cover-b2b-default.jpg	<p>Estimado {{clientName}},</p><p>Adjuntamos nuestra propuesta para {{services}} con el detalle comercial y operativo.</p><p>Quedamos atentos a programar una reunión para resolver dudas.</p>	[{"name": "Cliente 1", "logoUrl": "/assets/quotes/logos/cliente1.png"}, {"name": "Cliente 2", "logoUrl": "/assets/quotes/logos/cliente2.png"}]	<ul><li>Precios en GTQ, vigencia 15 días.</li><li>Los servicios se calendarizan en coordinación con su equipo.</li><li>Se requiere orden de compra o aprobación escrita.</li></ul>	[{"bank": "BAC", "currency": "GTQ", "accountName": "StarMedical, S.A.", "accountType": "Monetaria", "accountNumber": "200045612-1"}, {"bank": "BI", "currency": "USD", "accountName": "StarMedical, S.A.", "accountType": "Monetaria", "accountNumber": "120-554166-2"}]	2025-12-29 17:04:27.629	2026-01-20 01:23:40.469
\.


--
-- Data for Name: Receivable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Receivable" (id, date, "dueDate", amount, "paidAmount", reference, "createdAt", "updatedAt", "categoryId", "creditTerm", "legalEntityId", "partyId", "subcategoryId", status) FROM stdin;
cmjrerop1001512uqf1qd5m0a	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2025-12-29 17:04:27.589	2025-12-29 17:04:27.589	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmjrf08gh000zb8x1gezds195	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2025-12-29 17:11:06.45	2025-12-29 17:11:06.45	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk4ut8r70015evdmgb1ygl6l	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-08 02:54:34.387	2026-01-08 02:54:34.387	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk4uugre0015fwx5kdqyvhso	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-08 02:55:31.419	2026-01-08 02:55:31.419	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk4uv6zu0015uje1co7r62zs	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-08 02:56:05.418	2026-01-08 02:56:05.418	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk4uwcwz0015fo0ffasuxkhf	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-08 02:56:59.748	2026-01-08 02:56:59.748	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cgxy90015t3xnqrqbd0qi	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:44:25.953	2026-01-09 20:44:25.953	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cnhsv00158gm17w2uofc4	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:49:31.616	2026-01-09 20:49:31.616	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cob4n0015u77jzmitdajg	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:50:09.623	2026-01-09 20:50:09.623	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cp5bo0015gwxr9sxvyz1e	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:50:48.756	2026-01-09 20:50:48.756	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cq1e20015wwjet0tyui4g	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:51:30.314	2026-01-09 20:51:30.314	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cqrly0015b4daisp5krnu	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:52:04.294	2026-01-09 20:52:04.294	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7crkni0015i5dbg4vr8a85	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:52:41.935	2026-01-09 20:52:41.935	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7csdt50015re0u9d9twlaj	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:53:19.721	2026-01-09 20:53:19.721	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7ct9ah0015802q9nmw1xhr	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:54:00.521	2026-01-09 20:54:00.521	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cux670015apcm71dybkid	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:55:18.128	2026-01-09 20:55:18.128	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmk7cwawm0015kko67d8d8xrt	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-09 20:56:22.583	2026-01-09 20:56:22.583	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmkeai645001510q6l902i8w7	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-14 17:23:47.189	2026-01-14 17:23:47.189	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
cmklwu69t0015g4lno7tt01t5	2025-01-03 00:00:00	2025-02-02 00:00:00	1200.00	200.00	FAC-1002	2026-01-20 01:23:22.049	2026-01-20 01:23:22.049	cmjreronw000212uq2rmgjbxl	DAYS_30	le1	party-client-1	\N	PARTIAL
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, name, description, "createdAt", "updatedAt", "isSystem", "legalEntityId") FROM stdin;
cmjuf58y7000b13t7i5nou4vl	ADMIN	ADMIN	2025-12-31 19:38:18.896	2026-01-20 01:23:26.036	t	\N
cmk4ut9s7001cevdmjevr87t5	HR_ADMIN	HR_ADMIN	2026-01-08 02:54:35.719	2026-01-20 01:23:26.876	f	\N
cmk4ut9uf001devdm7t7qj4bq	HR_USER	HR_USER	2026-01-08 02:54:35.8	2026-01-20 01:23:27.54	f	\N
cmk7cgz1p001ct3xng1kiexwg	STAFF	STAFF	2026-01-09 20:44:27.373	2026-01-20 01:23:28.27	t	\N
cmk4ut9wx001eevdmwqx04prj	VIEWER	VIEWER	2026-01-08 02:54:35.89	2026-01-20 01:23:28.938	f	\N
cmklwuc470041g4lnehhpnier	SUPERVISOR	SUPERVISOR	2026-01-20 01:23:29.623	2026-01-20 01:23:29.623	f	\N
cmklwucmy004hg4lnj27zctdw	SALES	SALES	2026-01-20 01:23:30.298	2026-01-20 01:23:30.298	f	\N
cmklwud5b004ug4ln7th4jezc	RECEPTION	RECEPTION	2026-01-20 01:23:30.959	2026-01-20 01:23:30.959	f	\N
cmklwudl8004yg4lnel3npkwt	FINANCE	FINANCE	2026-01-20 01:23:31.532	2026-01-20 01:23:31.532	f	\N
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermission" (id, "roleId", "permissionId", "createdAt") FROM stdin;
cmklwu9qd0028g4lniuwsgxix	cmjuf58y7000b13t7i5nou4vl	cmkbexhd0000yj0ry6w315yeq	2026-01-20 01:23:26.533
cmklwu9qd0029g4lnhpysonvj	cmjuf58y7000b13t7i5nou4vl	cmkbexhfo000zj0rybdvfkbmq	2026-01-20 01:23:26.533
cmklwu9qd002ag4lnnexen0m1	cmjuf58y7000b13t7i5nou4vl	cmkbexhic0010j0ry2qgsb86t	2026-01-20 01:23:26.533
cmklwu9qd002bg4lnwgrcdw78	cmjuf58y7000b13t7i5nou4vl	cmkbexhkw0011j0ryxedjf0v7	2026-01-20 01:23:26.533
cmklwu9qd002cg4lnfonxw7m5	cmjuf58y7000b13t7i5nou4vl	cmkbexhnw0012j0ry1fkveyq2	2026-01-20 01:23:26.533
cmklwu9qd002dg4ln59qywzdn	cmjuf58y7000b13t7i5nou4vl	cmkbexhqj0013j0ry1bb0owiv	2026-01-20 01:23:26.533
cmklwu9qd002eg4lnes8q3by8	cmjuf58y7000b13t7i5nou4vl	cmkbexhwf0015j0ry28tfa8t5	2026-01-20 01:23:26.533
cmklwu9qd002fg4lnq3l5zdi3	cmjuf58y7000b13t7i5nou4vl	cmkbexhtc0014j0rys5fmlahz	2026-01-20 01:23:26.533
cmklwu9qd002gg4lnyogsmqmc	cmjuf58y7000b13t7i5nou4vl	cmkbexhz70016j0rycwrorf2u	2026-01-20 01:23:26.533
cmklwu9qd002hg4lng2qtn97x	cmjuf58y7000b13t7i5nou4vl	cmkbexi1r0017j0ryopbk6vt5	2026-01-20 01:23:26.533
cmklwu9qd002ig4ln2ef7s8ng	cmjuf58y7000b13t7i5nou4vl	cmkbexi4g0018j0rydb20oi5r	2026-01-20 01:23:26.533
cmklwu9qd002jg4lns5x17lcf	cmjuf58y7000b13t7i5nou4vl	cmkbexi790019j0ryf0kp4dbh	2026-01-20 01:23:26.533
cmklwu9qd002kg4lnsgg1tq11	cmjuf58y7000b13t7i5nou4vl	cmkbexi9v001aj0ryddll8fa9	2026-01-20 01:23:26.533
cmklwu9qd002lg4lnvdrug5it	cmjuf58y7000b13t7i5nou4vl	cmkbexicn001bj0rysw4og6xg	2026-01-20 01:23:26.533
cmklwu9qd002mg4ln02xu2fsk	cmjuf58y7000b13t7i5nou4vl	cmkbexifn001cj0ryc2f2ow2r	2026-01-20 01:23:26.533
cmklwu9qd002ng4lnr42qm2ol	cmjuf58y7000b13t7i5nou4vl	cmkbexg5b000jj0ry65afsh5f	2026-01-20 01:23:26.533
cmklwu9qd002og4ln481rfs3i	cmjuf58y7000b13t7i5nou4vl	cmkbexgb7000kj0ryxbzls3rc	2026-01-20 01:23:26.533
cmklwu9qd002pg4ln75x57gos	cmjuf58y7000b13t7i5nou4vl	cmklwu8el001sg4lnupni0kux	2026-01-20 01:23:26.533
cmklwu9qd002qg4lns1gh35g5	cmjuf58y7000b13t7i5nou4vl	cmkbexgh4000mj0ryol9cwtu2	2026-01-20 01:23:26.533
cmklwu9qd002rg4lnptlylnrg	cmjuf58y7000b13t7i5nou4vl	cmklwu8je001ug4lncwfo5ip1	2026-01-20 01:23:26.533
cmklwu9qd002sg4lncy9cp6t0	cmjuf58y7000b13t7i5nou4vl	cmklwu8lj001vg4ln4pqqajii	2026-01-20 01:23:26.533
cmklwu9qd002tg4lngrslkkpn	cmjuf58y7000b13t7i5nou4vl	cmk7drpfr000cjsjk8zcavlim	2026-01-20 01:23:26.533
cmklwu9qd002ug4lnfuiwmb6f	cmjuf58y7000b13t7i5nou4vl	cmk7drpkb000djsjk8w6s3v03	2026-01-20 01:23:26.533
cmklwu9qd002vg4ln4x6up67h	cmjuf58y7000b13t7i5nou4vl	cmklwu8sf001yg4ln5djea9uy	2026-01-20 01:23:26.533
cmklwu9qd002wg4ln69hgs9yw	cmjuf58y7000b13t7i5nou4vl	cmklwu8up001zg4lnn0gwb6mm	2026-01-20 01:23:26.533
cmklwu9qd002xg4lnsibfz9h6	cmjuf58y7000b13t7i5nou4vl	cmk7drpoj000fjsjk5cykgbv6	2026-01-20 01:23:26.533
cmklwu9qd002yg4lnd7libmp6	cmjuf58y7000b13t7i5nou4vl	cmk7drpqo000gjsjkaibr524a	2026-01-20 01:23:26.533
cmklwu9qd002zg4lnfyi3vhvr	cmjuf58y7000b13t7i5nou4vl	cmk7drpsv000hjsjktnlf25pa	2026-01-20 01:23:26.533
cmklwu9qd0030g4lnw8ob42qw	cmjuf58y7000b13t7i5nou4vl	cmk7drpv4000ijsjk5tnam0cr	2026-01-20 01:23:26.533
cmklwu9qd0031g4lnf5gqocba	cmjuf58y7000b13t7i5nou4vl	cmklwu95z0024g4ln6q8ropwn	2026-01-20 01:23:26.533
cmklwu9qd0032g4lnttjh4xei	cmjuf58y7000b13t7i5nou4vl	cmklwu9860025g4lnbzjrsl9k	2026-01-20 01:23:26.533
cmklwu9qd0033g4lnbddo4wjo	cmjuf58y7000b13t7i5nou4vl	cmklwu9aa0026g4lnli37ct7a	2026-01-20 01:23:26.533
cmklwua9e0035g4lnylkh3drz	cmk4ut9s7001cevdmjevr87t5	cmkbexg5b000jj0ry65afsh5f	2026-01-20 01:23:27.218
cmklwua9e0036g4lnjmzlhwaw	cmk4ut9s7001cevdmjevr87t5	cmkbexgb7000kj0ryxbzls3rc	2026-01-20 01:23:27.218
cmklwua9e0037g4lnwubskram	cmk4ut9s7001cevdmjevr87t5	cmklwu8el001sg4lnupni0kux	2026-01-20 01:23:27.218
cmklwua9e0038g4lnk5w6yul0	cmk4ut9s7001cevdmjevr87t5	cmkbexgh4000mj0ryol9cwtu2	2026-01-20 01:23:27.218
cmklwua9e0039g4ln717t0ml0	cmk4ut9s7001cevdmjevr87t5	cmklwu8je001ug4lncwfo5ip1	2026-01-20 01:23:27.218
cmklwua9e003ag4lng7cxwjzt	cmk4ut9s7001cevdmjevr87t5	cmklwu8lj001vg4ln4pqqajii	2026-01-20 01:23:27.218
cmklwua9e003bg4lnr3afhpgw	cmk4ut9s7001cevdmjevr87t5	cmk7drpfr000cjsjk8zcavlim	2026-01-20 01:23:27.218
cmklwua9e003cg4lnwhksrm2z	cmk4ut9s7001cevdmjevr87t5	cmk7drpkb000djsjk8w6s3v03	2026-01-20 01:23:27.218
cmklwua9e003dg4lnnc2qxp0k	cmk4ut9s7001cevdmjevr87t5	cmklwu8sf001yg4ln5djea9uy	2026-01-20 01:23:27.218
cmklwua9e003eg4lnfbhiaumj	cmk4ut9s7001cevdmjevr87t5	cmklwu8up001zg4lnn0gwb6mm	2026-01-20 01:23:27.218
cmklwua9e003fg4lnkvvbs64g	cmk4ut9s7001cevdmjevr87t5	cmk7drpoj000fjsjk5cykgbv6	2026-01-20 01:23:27.218
cmklwua9e003gg4ln160lcs6w	cmk4ut9s7001cevdmjevr87t5	cmk7drpqo000gjsjkaibr524a	2026-01-20 01:23:27.218
cmklwua9e003hg4lnvbyk7pm7	cmk4ut9s7001cevdmjevr87t5	cmk7drpsv000hjsjktnlf25pa	2026-01-20 01:23:27.218
cmklwua9e003ig4lnsou2v30t	cmk4ut9s7001cevdmjevr87t5	cmk7drpv4000ijsjk5tnam0cr	2026-01-20 01:23:27.218
cmklwua9e003jg4ln7l4fda40	cmk4ut9s7001cevdmjevr87t5	cmklwu95z0024g4ln6q8ropwn	2026-01-20 01:23:27.218
cmklwua9e003kg4lnnuidjqo7	cmk4ut9s7001cevdmjevr87t5	cmklwu9860025g4lnbzjrsl9k	2026-01-20 01:23:27.218
cmklwua9e003lg4lnewei026c	cmk4ut9s7001cevdmjevr87t5	cmklwu9aa0026g4lnli37ct7a	2026-01-20 01:23:27.218
cmklwuatn003ng4lnkvsxcqow	cmk4ut9uf001devdm7t7qj4bq	cmkbexg5b000jj0ry65afsh5f	2026-01-20 01:23:27.862
cmklwuatn003og4lnay1i3k9n	cmk4ut9uf001devdm7t7qj4bq	cmkbexgb7000kj0ryxbzls3rc	2026-01-20 01:23:27.862
cmklwuatn003pg4lnlcvg5d40	cmk4ut9uf001devdm7t7qj4bq	cmklwu8up001zg4lnn0gwb6mm	2026-01-20 01:23:27.862
cmklwuatn003qg4lnn4h5y6xl	cmk4ut9uf001devdm7t7qj4bq	cmkbexgh4000mj0ryol9cwtu2	2026-01-20 01:23:27.862
cmklwuatn003rg4lnlsmx5cok	cmk4ut9uf001devdm7t7qj4bq	cmklwu8je001ug4lncwfo5ip1	2026-01-20 01:23:27.862
cmklwuatn003sg4lntc9fwspq	cmk4ut9uf001devdm7t7qj4bq	cmk7drpfr000cjsjk8zcavlim	2026-01-20 01:23:27.862
cmklwuatn003tg4lnkxo8yev1	cmk4ut9uf001devdm7t7qj4bq	cmk7drpkb000djsjk8w6s3v03	2026-01-20 01:23:27.862
cmklwuatn003ug4lnv11ujkzw	cmk4ut9uf001devdm7t7qj4bq	cmk7drpoj000fjsjk5cykgbv6	2026-01-20 01:23:27.862
cmklwubc0003wg4lndml122ky	cmk7cgz1p001ct3xng1kiexwg	cmkbexg5b000jj0ry65afsh5f	2026-01-20 01:23:28.609
cmklwubc1003xg4ln18qiqgym	cmk7cgz1p001ct3xng1kiexwg	cmkbexgh4000mj0ryol9cwtu2	2026-01-20 01:23:28.609
cmklwubc1003yg4lnvowk5pvu	cmk7cgz1p001ct3xng1kiexwg	cmk7drpfr000cjsjk8zcavlim	2026-01-20 01:23:28.609
cmklwubve0040g4ln848qpxjf	cmk4ut9wx001eevdmwqx04prj	cmkbexg5b000jj0ry65afsh5f	2026-01-20 01:23:29.307
cmklwucdm0042g4lnfrb2ee1q	cmklwuc470041g4lnehhpnier	cmkbexhd0000yj0ry6w315yeq	2026-01-20 01:23:29.962
cmklwucdm0043g4lngwnhgpk8	cmklwuc470041g4lnehhpnier	cmkbexhfo000zj0rybdvfkbmq	2026-01-20 01:23:29.962
cmklwucdm0044g4ln4jtcoawb	cmklwuc470041g4lnehhpnier	cmkbexhic0010j0ry2qgsb86t	2026-01-20 01:23:29.962
cmklwucdm0045g4lnwossus9p	cmklwuc470041g4lnehhpnier	cmkbexhkw0011j0ryxedjf0v7	2026-01-20 01:23:29.962
cmklwucdm0046g4lnz3mf7hja	cmklwuc470041g4lnehhpnier	cmkbexhnw0012j0ry1fkveyq2	2026-01-20 01:23:29.962
cmklwucdm0047g4lnci3fvawz	cmklwuc470041g4lnehhpnier	cmkbexhqj0013j0ry1bb0owiv	2026-01-20 01:23:29.962
cmklwucdm0048g4lnxdsh6bka	cmklwuc470041g4lnehhpnier	cmkbexhwf0015j0ry28tfa8t5	2026-01-20 01:23:29.962
cmklwucdm0049g4ln60cpenug	cmklwuc470041g4lnehhpnier	cmkbexhtc0014j0rys5fmlahz	2026-01-20 01:23:29.962
cmklwucdm004ag4ln90la8230	cmklwuc470041g4lnehhpnier	cmkbexhz70016j0rycwrorf2u	2026-01-20 01:23:29.962
cmklwucdm004bg4lnap55rew7	cmklwuc470041g4lnehhpnier	cmkbexi1r0017j0ryopbk6vt5	2026-01-20 01:23:29.962
cmklwucdm004cg4lnw73hpiu0	cmklwuc470041g4lnehhpnier	cmkbexi4g0018j0rydb20oi5r	2026-01-20 01:23:29.962
cmklwucdm004dg4ln1zd6w0z9	cmklwuc470041g4lnehhpnier	cmkbexi790019j0ryf0kp4dbh	2026-01-20 01:23:29.962
cmklwucdm004eg4lnw1363jjq	cmklwuc470041g4lnehhpnier	cmkbexi9v001aj0ryddll8fa9	2026-01-20 01:23:29.962
cmklwucdm004fg4ln2142508x	cmklwuc470041g4lnehhpnier	cmkbexicn001bj0rysw4og6xg	2026-01-20 01:23:29.962
cmklwucdm004gg4ln4l0koc71	cmklwuc470041g4lnehhpnier	cmkbexifn001cj0ryc2f2ow2r	2026-01-20 01:23:29.962
cmklwucvw004ig4lnansqb22g	cmklwucmy004hg4lnj27zctdw	cmkbexhd0000yj0ry6w315yeq	2026-01-20 01:23:30.621
cmklwucvx004jg4lnjvqlg4nu	cmklwucmy004hg4lnj27zctdw	cmkbexhfo000zj0rybdvfkbmq	2026-01-20 01:23:30.621
cmklwucvx004kg4lnev4cpcbn	cmklwucmy004hg4lnj27zctdw	cmkbexhic0010j0ry2qgsb86t	2026-01-20 01:23:30.621
cmklwucvx004lg4lnesupide1	cmklwucmy004hg4lnj27zctdw	cmkbexhkw0011j0ryxedjf0v7	2026-01-20 01:23:30.621
cmklwucvx004mg4lnb54j4dgi	cmklwucmy004hg4lnj27zctdw	cmkbexhnw0012j0ry1fkveyq2	2026-01-20 01:23:30.621
cmklwucvx004ng4lnay1glm9h	cmklwucmy004hg4lnj27zctdw	cmkbexhqj0013j0ry1bb0owiv	2026-01-20 01:23:30.621
cmklwucvx004og4lnrhas41ut	cmklwucmy004hg4lnj27zctdw	cmkbexhwf0015j0ry28tfa8t5	2026-01-20 01:23:30.621
cmklwucvx004pg4ln5k9niqc6	cmklwucmy004hg4lnj27zctdw	cmkbexhz70016j0rycwrorf2u	2026-01-20 01:23:30.621
cmklwucvx004qg4ln0vebd1w2	cmklwucmy004hg4lnj27zctdw	cmkbexi1r0017j0ryopbk6vt5	2026-01-20 01:23:30.621
cmklwucvx004rg4lnpadze5am	cmklwucmy004hg4lnj27zctdw	cmkbexi4g0018j0rydb20oi5r	2026-01-20 01:23:30.621
cmklwucvx004sg4ln7i4ou2fy	cmklwucmy004hg4lnj27zctdw	cmkbexi790019j0ryf0kp4dbh	2026-01-20 01:23:30.621
cmklwucvx004tg4lnqs9ymkw9	cmklwucmy004hg4lnj27zctdw	cmkbexi9v001aj0ryddll8fa9	2026-01-20 01:23:30.621
cmklwudc1004vg4lnb394quzs	cmklwud5b004ug4ln7th4jezc	cmkbexhd0000yj0ry6w315yeq	2026-01-20 01:23:31.201
cmklwudc1004wg4lnnqzf805y	cmklwud5b004ug4ln7th4jezc	cmkbexhic0010j0ry2qgsb86t	2026-01-20 01:23:31.201
cmklwudc1004xg4lnmr1pi9cj	cmklwud5b004ug4ln7th4jezc	cmkbexhnw0012j0ry1fkveyq2	2026-01-20 01:23:31.201
cmklwudtw004zg4ln6uuc99tw	cmklwudl8004yg4lnel3npkwt	cmkbexhnw0012j0ry1fkveyq2	2026-01-20 01:23:31.845
cmklwudtw0050g4ln6ubyk13c	cmklwudl8004yg4lnel3npkwt	cmkbexhtc0014j0rys5fmlahz	2026-01-20 01:23:31.845
\.


--
-- Data for Name: Room; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Room" (id, name, "branchId", resource, status, "createdAt", "updatedAt") FROM stdin;
room1	Consultorio 1	s1	Consultorio	Activo	2025-12-29 17:04:27.527	2025-12-29 17:04:27.527
room2	Sala Rayos X	s1	Rayos X	Activo	2025-12-29 17:04:27.53	2025-12-29 17:04:27.53
room3	Sala USG	s2	Ultrasonido	Activo	2025-12-29 17:04:27.532	2025-12-29 17:04:27.532
\.


--
-- Data for Name: RuleEvaluationLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RuleEvaluationLog" (id, "pipelineId", "dealId", "fromStageKey", "toStageKey", allowed, errors, warnings, "evaluatedRules", "actorUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SequenceCounter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SequenceCounter" (id, key, "currentValue", "updatedAt") FROM stdin;
cmk4uvgh60033uje1qahw45p6	B2B_PROPOSAL_2026	0	2026-01-08 02:56:17.707
\.


--
-- Data for Name: Service; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Service" (id, name, code, "categoryId", "subcategoryId", price, "durationMin", status, "createdAt", "updatedAt", "marginPct") FROM stdin;
cmjrl8thx000dgl4vegis2o4c	Consulta medica general	SRV-CON	servicios-medicos	\N	250	0	Activo	2025-12-29 20:05:44.661	2025-12-29 20:06:06.857	\N
cmjrl8thz000fgl4vja6pjogg	Visita empresarial SSO	SRV-SSO	servicios-medicos	\N	950	0	Activo	2025-12-29 20:05:44.663	2025-12-29 20:06:06.859	\N
cmjrl8thz000hgl4vngzqqbgt	Perfil lipido	LAB-LIP	laboratorio	\N	180	0	Activo	2025-12-29 20:05:44.664	2025-12-29 20:06:06.86	\N
cmjrl8ti0000jgl4vog687d9r	Hemograma completo	LAB-HEM	laboratorio	\N	120	0	Activo	2025-12-29 20:05:44.664	2025-12-29 20:06:06.861	\N
cmjrl8ti0000lgl4vv7sj4h22	Rayos X torax	IMG-XR	imagenes	\N	280	0	Activo	2025-12-29 20:05:44.665	2025-12-29 20:06:06.861	\N
cmjrl8ti1000ngl4vra32enas	Ultrasonido abdominal	IMG-US	imagenes	\N	420	0	Activo	2025-12-29 20:05:44.665	2025-12-29 20:06:06.862	\N
\.


--
-- Data for Name: ServiceCategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ServiceCategory" (id, name, slug, area, "order", status) FROM stdin;
servicios-medicos	Servicios medicos	servicios-medicos	GENERAL	0	Activo
laboratorio	Laboratorio	laboratorio	GENERAL	0	Activo
imagenes	Imagenes	imagenes	GENERAL	0	Activo
\.


--
-- Data for Name: ServiceSubcategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ServiceSubcategory" (id, "categoryId", name, slug, "order", status) FROM stdin;
\.


--
-- Data for Name: ShiftTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftTemplate" (id, name, "startTime", "endTime", "crossesMidnight", "weeklyPattern", "isActive", "createdAt", "updatedAt", "toleranceMinutes", "maxDailyHours", "maxWeeklyHours") FROM stdin;
shift-diurno	Diurno 8x5	08:00	17:00	f	{"fri": true, "mon": true, "sat": false, "sun": false, "thu": true, "tue": true, "wed": true}	t	2026-01-09 20:52:17.616	2026-01-12 17:04:36.303	10	9.00	45.00
shift-sabado	Sábado 5h	08:00	13:00	f	{"fri": false, "mon": false, "sat": true, "sun": false, "thu": false, "tue": false, "wed": false}	t	2026-01-09 21:19:58.737	2026-01-12 17:04:36.616	10	\N	\N
shift-nocturno	Nocturno	19:00	07:00	t	{"fri": true, "mon": true, "sat": true, "sun": true, "thu": true, "tue": true, "wed": true}	t	2026-01-09 20:52:17.794	2026-01-12 17:04:36.811	10	12.00	36.00
\.


--
-- Data for Name: TimeClockDevice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimeClockDevice" (id, name, "ipAddress", location, "isActive", "createdAt", "updatedAt", "branchId", "legalEntityId", "lastSyncAt") FROM stdin;
clock-hq	Reloj Bio HQ	192.168.1.10	Recepción	t	2026-01-09 20:52:18.062	2026-01-09 20:56:36.381	s1	le1	2026-01-09 20:56:36.38
clock-esc	Reloj Bio Escuintla	192.168.2.10	Entrada principal	t	2026-01-09 20:52:19.448	2026-01-09 20:56:37.865	s2	le2	2026-01-09 20:56:37.864
\.


--
-- Data for Name: TimeClockLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimeClockLog" (id, "employeeId", "deviceId", "timestamp", type, source, notes, "createdAt", "branchId", "legalEntityId") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, name, "passwordHash", "isActive", "branchId", "createdAt", "updatedAt") FROM stdin;
cmjuf58yo000y13t7i9phjzy4	nelsonlopezallen@gmail.com	Nelson Lopez	$2a$10$EOoxquNrBEwkaClfCIENkeU3DtEme1KWrsQKKeLrjPa5ZfuZjQxzu	t	\N	2025-12-31 19:38:18.912	2025-12-31 19:38:18.912
\.


--
-- Data for Name: UserPermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserPermission" (id, "userId", "permissionId", effect, reason, "legalEntityId", "createdAt") FROM stdin;
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRole" ("userId", "roleId", "createdAt") FROM stdin;
cmjuf58yo000y13t7i9phjzy4	cmjuf58y7000b13t7i5nou4vl	2026-01-12 16:27:55.287
\.


--
-- Data for Name: WorkSchedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkSchedule" (id, "specialistId", "branchId", weekdays, blocks, "createdAt", "updatedAt") FROM stdin;
cmjreroni000012uqxyhrs4sl	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2025-12-29 17:04:27.534	2025-12-29 17:04:27.534
cmjreronk000112uque1hb9sy	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2025-12-29 17:04:27.537	2025-12-29 17:04:27.537
cmjrf08f80000b8x1l4giyaxm	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2025-12-29 17:11:06.404	2025-12-29 17:11:06.404
cmjrf08fa0001b8x1f1rtr5rx	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2025-12-29 17:11:06.406	2025-12-29 17:11:06.406
cmk4ut4iv0000evdm3ahrhf3f	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-08 02:54:28.903	2026-01-08 02:54:28.903
cmk4ut4n60001evdmjrbreufa	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-08 02:54:29.058	2026-01-08 02:54:29.058
cmk4uub720000fwx5yl1yf8af	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-08 02:55:24.206	2026-01-08 02:55:24.206
cmk4uubco0001fwx574j8g5yu	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-08 02:55:24.408	2026-01-08 02:55:24.408
cmk4uv1gi0000uje16yu04mig	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-08 02:55:58.242	2026-01-08 02:55:58.242
cmk4uv1mb0001uje169j1pxwf	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-08 02:55:58.452	2026-01-08 02:55:58.452
cmk4uw8pe0000fo0f3y8fifsu	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-08 02:56:54.291	2026-01-08 02:56:54.291
cmk4uw8tv0001fo0fx0bsey1z	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-08 02:56:54.451	2026-01-08 02:56:54.451
cmk7cgtgp0000t3xnyqh5v19f	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:44:20.137	2026-01-09 20:44:20.137
cmk7cgtld0001t3xnjnx1fkby	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:44:20.305	2026-01-09 20:44:20.305
cmk7cndel00008gm1n8i68f0k	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:49:25.918	2026-01-09 20:49:25.918
cmk7cndj600018gm1t9t15uv0	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:49:26.083	2026-01-09 20:49:26.083
cmk7co6w20000u77jhkv484qg	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:50:04.13	2026-01-09 20:50:04.13
cmk7co70u0001u77jywie0a0i	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:50:04.302	2026-01-09 20:50:04.302
cmk7cozgb0000gwxryialvznv	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:50:41.148	2026-01-09 20:50:41.148
cmk7cozlr0001gwxruuox1fjg	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:50:41.343	2026-01-09 20:50:41.343
cmk7cpx5e0000wwjesbpu2upm	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:51:24.818	2026-01-09 20:51:24.818
cmk7cpx9u0001wwjep54hguic	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:51:24.978	2026-01-09 20:51:24.978
cmk7cqn3i0000b4dapfqxmwpq	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:51:58.447	2026-01-09 20:51:58.447
cmk7cqn880001b4dao054pfqz	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:51:58.616	2026-01-09 20:51:58.616
cmk7crg7j0000i5dbna0ig91e	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:52:36.175	2026-01-09 20:52:36.175
cmk7crgc70001i5dbuy46a6q7	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:52:36.344	2026-01-09 20:52:36.344
cmk7cs9c80000re0uumbwq326	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:53:13.929	2026-01-09 20:53:13.929
cmk7cs9gy0001re0urqg412l8	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:53:14.098	2026-01-09 20:53:14.098
cmk7ct4s70000802q3i6cvec2	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:53:54.68	2026-01-09 20:53:54.68
cmk7ct4ww0001802q82x0og8m	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:53:54.849	2026-01-09 20:53:54.849
cmk7cuskg0000apcmvorxvphz	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:55:12.16	2026-01-09 20:55:12.16
cmk7cusp50001apcmzizd0jff	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:55:12.329	2026-01-09 20:55:12.329
cmk7cw6a60000kko65h1tqa4n	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-09 20:56:16.591	2026-01-09 20:56:16.591
cmk7cw6eu0001kko6lhdw8r0a	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-09 20:56:16.759	2026-01-09 20:56:16.759
cmkeai0ut000010q6jinsspvl	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-14 17:23:40.374	2026-01-14 17:23:40.374
cmkeai10l000110q6tpcamcs2	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-14 17:23:40.581	2026-01-14 17:23:40.581
cmklwu1if0000g4ln0aity80e	m1	s1	{Lunes,Miércoles,Viernes}	[{"fin": "12:00", "inicio": "08:00"}, {"fin": "18:00", "inicio": "14:00"}]	2026-01-20 01:23:15.88	2026-01-20 01:23:15.88
cmklwu1n20001g4lnui7bnu6j	m2	s1	{Martes,Jueves}	[{"fin": "13:00", "inicio": "09:00"}, {"fin": "17:00", "inicio": "15:00"}]	2026-01-20 01:23:16.046	2026-01-20 01:23:16.046
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
9bd104fc-2eb4-492d-a92b-b295f2a6e52f	d65b813e52203cd6832290992ce4a45ad9c93ff205a72feb81afde0044856cea	2026-01-20 01:18:38.959207+00	20251215204753_p2_purchases_reports		\N	2026-01-20 01:18:38.959207+00	0
3e243a12-4647-4b8d-bc87-43e680147996	cad1d98d650dcfd26ca045bcd832522ac781227952c430947a2739e070f8edb4	2026-01-13 17:19:06.100009+00	20260322120000_warning_attachments	\N	\N	2026-01-13 17:19:05.51075+00	1
8d0154ba-6326-4a5a-8cbd-45e5e41ca942	df1bc1e62884129d9e22cf274ec61484a963aa4bc7ff4d2cfc44f76f0e405307	2026-01-20 01:18:42.40153+00	20251215212015_p2_hardening_reports		\N	2026-01-20 01:18:42.40153+00	0
b48d1c82-86f1-4ea4-9921-411f4c75c3fe	ae09b6b1a411789519747092578494e44ab24456b4f9fdd3f728d924adc50877	2026-01-14 00:29:27.250661+00	20260323120000_disciplinary_termination	\N	\N	2026-01-14 00:29:26.611677+00	1
69c99f58-795c-479d-b9e5-7bb33d47e1e8	580cd85168d2bedf570d56ae2cb87691331aaf7c66faf1142aa86db71bcdd46f	2026-01-20 01:18:46.106598+00	20251215220438_p3_movimientos_report		\N	2026-01-20 01:18:46.106598+00	0
51279733-7e34-4635-8575-a62e239920ba	18cd6029a1ac229fe7d9782ad160f1f054d2ea6e9aa98abcd32091b56c0b35ab	2026-01-14 00:29:28.135624+00	20260323123000_hr_settings	\N	\N	2026-01-14 00:29:27.486694+00	1
4fd3d02c-5746-434c-8b78-963342c58a58	60e49d3c78fb5daa81baf423008aa47a3b4d298f1be588d1b3bd119aab026189	2026-01-20 01:18:49.616151+00	20251215225013_inventory_email_schedule		\N	2026-01-20 01:18:49.616151+00	0
ff946e63-3583-4ab3-8805-556b244414e2	bdf17dbc3f12f90c9e412da73dce229faeec3ba0a69ca6b26f5fb777c1a776d4	\N	0001_init	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 0001_init\n\nDatabase error code: 42710\n\nDatabase error:\nERROR: type "AppointmentStatus" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42710), message: "type \\"AppointmentStatus\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("typecmds.c"), line: Some(1177), routine: Some("DefineEnum") }\n\n	2026-01-20 01:18:19.275414+00	2026-01-20 01:17:27.523309+00	0
232c7a85-d3fa-480b-be35-2fabb9f4ab70	bdf17dbc3f12f90c9e412da73dce229faeec3ba0a69ca6b26f5fb777c1a776d4	2026-01-20 01:18:19.446404+00	0001_init		\N	2026-01-20 01:18:19.446404+00	0
9dbaf41e-aad0-4fcc-810d-7eca61f39b67	d90e725b42ea015e77ac3fdcfb58f6024760f83bf0006febe8f24cb7ebd089ee	2026-01-20 01:18:23.349911+00	0002_catalogos		\N	2026-01-20 01:18:23.349911+00	0
97300d54-5fcd-4c80-9086-77c8e3f1e702	d6ad03f9157a81d37ccac0bfdf1f3066c1e2b8cc7f7f3b9a76ba72e04a89f3cd	2026-01-20 01:18:27.178328+00	20251213034930_init_pricelists		\N	2026-01-20 01:18:27.178328+00	0
95f4fecc-7823-4f36-8618-58516bd5e6f2	1a57158eebf70614ab20ecd1e4a83db3d7db9e7bb9a82e4ca20b3b13cee625fb	2026-01-20 01:18:31.428619+00	20251214223238_inventory_kardex		\N	2026-01-20 01:18:31.428619+00	0
d0514a6f-7a80-4fa5-9e5c-257688ab4ef8	f5965448305a763a7ea0bf99efca1593bb1feb85d6c378a1b270e9eb47e60f28	2026-01-20 01:18:34.920396+00	20251215051547_add_combos_and_status		\N	2026-01-20 01:18:34.920396+00	0
fafbe0c2-aa16-44b4-a667-14c0fd619110	e46ce783806eb49eb44f2bf43a8f6916453f77fae63d2020693cb0e466a9d39e	2026-01-20 01:18:53.52036+00	20251216121500_inventory_email_onetime		\N	2026-01-20 01:18:53.52036+00	0
a51955bc-83a2-4aa1-ae35-c579fe98a9bb	2aeba3bbb6c253285c6e5eab022f68cff4413669dfc04adb4290598c60b1b367	2026-01-20 01:18:58.01014+00	20251216124000_inventory_email_schedule_multi		\N	2026-01-20 01:18:58.01014+00	0
28aaacee-5547-4a6a-a676-81c624ec0cad	a977308a0776d6d1aacdc53c6bcc4fba21d2b2be22c90c9c44a31c76039ad8f4	2026-01-20 01:19:01.441562+00	20251216133000_inventory_margin_policy_and_logs		\N	2026-01-20 01:19:01.441562+00	0
d23cff74-00e3-48c8-916d-f82821fcd19a	1bbed5088159749e7d06e0ef93c52fd3cfeec8a2df4f90a5ccb5ece03f989dfa	2026-01-20 01:19:04.911076+00	20251216173916_central_config_mail		\N	2026-01-20 01:19:04.911076+00	0
f819c685-157b-471c-8b7b-7943f216c53a	b06375dbff8030b839a61b429250c03f9e822cd30fbc29db1df0c299d7d730a5	2026-01-20 01:19:08.314636+00	20251216175612_central_config_expanded		\N	2026-01-20 01:19:08.314636+00	0
0f5def26-d83b-4706-bbdc-afcd515cc769	4694461ea7610091ec3ac3b80130171c16571a8596890a95d7e77cde4ed23b71	2026-01-20 01:19:11.790409+00	20251220150337_api_integration_config		\N	2026-01-20 01:19:11.790409+00	0
fadbe215-6a67-4531-a13c-e9cfaf28160d	19ca5952467e417919f1b5e5980be7bc9829165e9e2c3e42d2d0cd31778554a4	2026-01-20 01:19:15.175925+00	20251220153655_finanzas_mvp		\N	2026-01-20 01:19:15.175925+00	0
9eb2defb-ef3c-4790-9961-3a21f0cdddf0	0ba48687b4fb3f8ce4f98ed167162483b470b24f3ba2fd15f68d8477f9f09f33	2026-01-20 01:19:18.735122+00	20251223214857_finance_operativo_base		\N	2026-01-20 01:19:18.735122+00	0
c7d3d0cd-f751-4298-8816-acc35645088f	5db7278224d537ed7f4cd1bd2bf5e1586e070cc238e6736cc087fa3d38699edb	2026-01-20 01:19:22.319203+00	20251223220420_crm_mvp		\N	2026-01-20 01:19:22.319203+00	0
abef8b58-d920-47de-bb1d-580abd365e2d	4777f17a4fa7b7b2dafc0c6528fde330398c1c48a092766fbdea5488985195c4	2026-01-20 01:19:26.324709+00	20251224183501_crm_quote_and_clients		\N	2026-01-20 01:19:26.324709+00	0
b65f600a-0bc1-491b-ac51-6de04e5d6be7	4c7119343f57763591edd0465b9d1d6032e047b94b597e2e7a0c75bdb9583b09	2026-01-09 18:56:50.508523+00	20260109115921_memberships_module	\N	\N	2026-01-09 18:56:49.658278+00	1
952c535f-b4d7-4d59-ad6b-3264ecd84555	a962c00cd654f12e654a9d3dd03367a0656f9349217272550890b939e6f92101	2026-01-09 18:56:51.459052+00	20260309120000_hr_rrhh_module	\N	\N	2026-01-09 18:56:50.669226+00	1
fa012cf2-0ff3-469e-be83-40928a010963	7df8aa3061a2b27841981fef4fe8f0e57b060cca216c05bfd7e634e8c4241ea0	2026-01-09 18:47:05.342216+00	00000000000000_baseline_init		\N	2026-01-09 18:47:05.342216+00	0
33b6d321-1caa-48c4-8e56-dbae4681d012	b049df70f468119ead4964e905c36251ae6a45b1c8df687ea0a89a28a7a05fae	2026-01-09 20:28:07.161975+00	20260312120000_attendance_biometric	\N	\N	2026-01-09 20:28:06.382898+00	1
8b4f6819-7984-4408-a74c-0a21adcb471d	c66cc4d90c9b0781c74e27d840e3d9202d85941886e834ec0faa35cbd862983e	\N	20260313130000_payroll_module	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260313130000_payroll_module\n\nDatabase error code: 42804\n\nDatabase error:\nERROR: default for column "status" cannot be cast automatically to type "PayrollRunStatus_new"\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42804), message: "default for column \\"status\\" cannot be cast automatically to type \\"PayrollRunStatus_new\\"", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(13243), routine: Some("ATExecAlterColumnType") }\n\n	2026-01-09 20:38:21.687306+00	2026-01-09 20:37:54.426256+00	0
1b77f129-d50c-4be3-b6cd-68c78a1e3531	a42e475cbb900f29decf3aec587c059f6d08ebd4f9d1541acd7ff767b91acfa2	2026-01-09 20:38:33.271623+00	20260313130000_payroll_module	\N	\N	2026-01-09 20:38:32.612753+00	1
2f886ba7-2e26-48cb-a621-8bccec549078	478ba87154bd32f78ef5095a2401120d9ab14156565860a8fcbcc0c40f68e78d	2026-01-12 16:27:55.804579+00	20260315123000_permissions_matrix	\N	\N	2026-01-12 16:27:54.969363+00	1
ca7145e2-3a52-4401-8cbd-6415a16a8e17	e5fce79387abc1157f6e78f58e806a107dd354e431ed3b04e008b0a13eb5606c	2026-01-12 17:14:38.829154+00	20260318120000_hr_onboarding	\N	\N	2026-01-12 17:14:38.32203+00	1
37940ee0-946f-4fc5-9d14-d0cb53dc3e05	4d80cfbfa07a0a5b72d5f118eeeaedc050cba4db15022ac0868e753a41287956	2026-01-12 17:38:10.18643+00	20260318180000_attendance_close_flow	\N	\N	2026-01-12 17:38:09.200054+00	1
c48cdfe8-24f5-45df-b94b-3cbccf315822	322d2c17c95b332d46f5b824b7f98812765be2723be131728029193297a23ba1	2026-01-12 18:00:53.569091+00	20260318200000_hr_onboarding_nullable	\N	\N	2026-01-12 18:00:52.913781+00	1
bd4753c6-ba28-4498-8f19-c8127518ccc3	3a6f19a551b4221c53d6021d7e162f582c6d1a45b2197a9378835c3a74dec6f0	2026-01-13 16:09:10.847854+00	20260319120000_compensation_bonus	\N	\N	2026-01-13 16:09:10.120556+00	1
7363acb0-8a26-4193-a6a7-8c53f240b5e5	f95a575efe6dff5ef1a7d1e655c87230dc717656f432bfebcc14c96cc620ed2b	2026-01-20 01:19:29.728695+00	20251224191057_crm_leads_calendar		\N	2026-01-20 01:19:29.728695+00	0
af2ff221-8654-41f5-aed1-fdf398fefc0e	4f6d8b5471b64dfd1c29970ad0921dda0a3a0f3ee90331581b9d52ee1b73ced8	2026-01-20 01:19:33.890469+00	20251227014058_crm_refactor		\N	2026-01-20 01:19:33.890469+00	0
3c9449c4-34c4-42b4-9467-604ffa55cb2e	8e17ca4acfb4b6675310ca9432e2261c871fc99ec69869428e6ed78729dd196e	2026-01-20 01:19:37.35082+00	20251228090000_phase4_amount_capture		\N	2026-01-20 01:19:37.35082+00	0
663b8512-5c1b-4534-b79a-0b02fa8ef9ef	f7ed63425599d2546cfdd97a1692d023738c8db927b7a9bc345234d7ab4e917d	2026-01-20 01:19:40.855598+00	20251229170421_quote_v2_phase1		\N	2026-01-20 01:19:40.855598+00	0
3e87974b-546b-4003-8b2d-dfdf73ac9a5e	1694ad0974ea915e3935dc723f00845e6cd4463f528fbd8a78c847b10221c672	2026-01-20 01:19:45.965626+00	20251229172503_quote_v2_b2c_simple_fields		\N	2026-01-20 01:19:45.965626+00	0
a50f8d4f-a044-499b-8c18-674f75a8ca51	97d918a61ae026b3b1ca8722e5e5eb9ca4d34e9926abe78545154e79c5bf12c4	2026-01-20 01:19:49.35392+00	20251229193500_contact_phones_json		\N	2026-01-20 01:19:49.35392+00	0
94c492cc-2ca6-4580-86c7-577520e34c25	a0525be0e621376a4a18e45546b3ad525b323fccc33337eeedcfaab920cf1814	2026-01-20 01:19:52.731926+00	20251231193814_rbac_audit		\N	2026-01-20 01:19:52.731926+00	0
86fc8796-3817-4cc3-a3cd-7d18fc3de5ed	6d3605ae23473b39a1a102681274f7c80586b47a39a1a32a11704190f3b0dd4b	2026-01-20 01:19:56.195086+00	20251231194835_quote_delivery_send		\N	2026-01-20 01:19:56.195086+00	0
be442d8d-94e2-4df5-ac6d-0ee5cd617c77	4951f1dfd478c829e58b5f6b1288c83c9c0682941827802707e2b895e1d61a3f	2026-01-20 01:19:59.532825+00	20251231224227_rule_engine_pipeline		\N	2026-01-20 01:19:59.532825+00	0
d8454ddc-41a9-4994-b7b3-2c8fc16ea81a	a050671b8db9e8ae9968d2611c51afcc9c7711b1bcda7cf777e169146112e990	2026-01-20 01:20:08.875286+00	20260106203652_add_fileasset_dealid		\N	2026-01-20 01:20:08.875286+00	0
d81df73f-efb9-4069-b51e-a0354209ca02	fba473525a172c7dc377ec022eb88e15a7316d3fd0ad9c704b0f56ca9f678490	2026-01-20 01:20:12.215175+00	20260107183851_hr_v2		\N	2026-01-20 01:20:12.215175+00	0
4302286d-8179-4bf0-8621-9dad3e98458a	62a78c71845e2ed9f0fb69099c29ddd98a71d484d4d485cb1913c1963e59c55c	2026-01-20 01:20:15.554761+00	20260107233127_hr_foundation		\N	2026-01-20 01:20:15.554761+00	0
daacb596-64a7-42f8-a944-7b2bc6333915	a1deb0729596c54b93e84c669223ebc9fc7038ea0990226455121cd252895911	2026-01-20 01:21:02.87617+00	20260101010101_b2b_proposals		\N	2026-01-20 01:21:02.87617+00	0
fc7108fc-a4e2-482f-b3da-4814eea34f8d	751b79bcd4eceeade1d36a5ac9dec4201ec3138d9bf79aec65b3a92ff148aa1b	2026-01-20 01:21:28.56205+00	20260324120000_hr_compensation_history		\N	2026-01-20 01:21:28.56205+00	0
e755dec4-a6b0-421c-81bb-fe6abd98ff72	4f09817849fbdbc015273a2b6b2d62ffda42c1935fd43c0ee055e321bd17804a	2026-01-20 01:22:00.261252+00	20260119_hr_attendance_payroll		\N	2026-01-20 01:22:00.261252+00	0
\.


--
-- Name: membership_contract_code_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.membership_contract_code_seq', 1, false);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: ApiIntegrationConfig ApiIntegrationConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiIntegrationConfig"
    ADD CONSTRAINT "ApiIntegrationConfig_pkey" PRIMARY KEY (id);


--
-- Name: AppConfig AppConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppConfig"
    ADD CONSTRAINT "AppConfig_pkey" PRIMARY KEY (id);


--
-- Name: AppointmentType AppointmentType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentType"
    ADD CONSTRAINT "AppointmentType_pkey" PRIMARY KEY (id);


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceComputed AttendanceComputed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceComputed"
    ADD CONSTRAINT "AttendanceComputed_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceDay AttendanceDay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceIntegrationConfig AttendanceIntegrationConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceIntegrationConfig"
    ADD CONSTRAINT "AttendanceIntegrationConfig_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: B2BProposalDoc B2BProposalDoc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."B2BProposalDoc"
    ADD CONSTRAINT "B2BProposalDoc_pkey" PRIMARY KEY (id);


--
-- Name: Branch Branch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_pkey" PRIMARY KEY (id);


--
-- Name: ClientProfile ClientProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientProfile"
    ADD CONSTRAINT "ClientProfile_pkey" PRIMARY KEY (id);


--
-- Name: ComboProduct ComboProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComboProduct"
    ADD CONSTRAINT "ComboProduct_pkey" PRIMARY KEY (id);


--
-- Name: ComboService ComboService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComboService"
    ADD CONSTRAINT "ComboService_pkey" PRIMARY KEY (id);


--
-- Name: Combo Combo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Combo"
    ADD CONSTRAINT "Combo_pkey" PRIMARY KEY (id);


--
-- Name: CompensationBonus CompensationBonus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompensationBonus"
    ADD CONSTRAINT "CompensationBonus_pkey" PRIMARY KEY (id);


--
-- Name: CrmAccount CrmAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmAccount"
    ADD CONSTRAINT "CrmAccount_pkey" PRIMARY KEY (id);


--
-- Name: CrmActivity CrmActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmActivity"
    ADD CONSTRAINT "CrmActivity_pkey" PRIMARY KEY (id);


--
-- Name: CrmCalendarEvent CrmCalendarEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmCalendarEvent"
    ADD CONSTRAINT "CrmCalendarEvent_pkey" PRIMARY KEY (id);


--
-- Name: CrmContact CrmContact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmContact"
    ADD CONSTRAINT "CrmContact_pkey" PRIMARY KEY (id);


--
-- Name: CrmDealServiceInterest CrmDealServiceInterest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDealServiceInterest"
    ADD CONSTRAINT "CrmDealServiceInterest_pkey" PRIMARY KEY (id);


--
-- Name: CrmDealStageHistory CrmDealStageHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDealStageHistory"
    ADD CONSTRAINT "CrmDealStageHistory_pkey" PRIMARY KEY (id);


--
-- Name: CrmDeal CrmDeal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDeal"
    ADD CONSTRAINT "CrmDeal_pkey" PRIMARY KEY (id);


--
-- Name: CrmLead CrmLead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmLead"
    ADD CONSTRAINT "CrmLead_pkey" PRIMARY KEY (id);


--
-- Name: CrmPipelineStage CrmPipelineStage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmPipelineStage"
    ADD CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY (id);


--
-- Name: CrmPipeline CrmPipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmPipeline"
    ADD CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY (id);


--
-- Name: CrmQuoteItem CrmQuoteItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuoteItem"
    ADD CONSTRAINT "CrmQuoteItem_pkey" PRIMARY KEY (id);


--
-- Name: CrmQuoteRequest CrmQuoteRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuoteRequest"
    ADD CONSTRAINT "CrmQuoteRequest_pkey" PRIMARY KEY ("quoteId", "requestId");


--
-- Name: CrmQuote CrmQuote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuote"
    ADD CONSTRAINT "CrmQuote_pkey" PRIMARY KEY (id);


--
-- Name: CrmRequest CrmRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmRequest"
    ADD CONSTRAINT "CrmRequest_pkey" PRIMARY KEY (id);


--
-- Name: CrmTask CrmTask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmTask"
    ADD CONSTRAINT "CrmTask_pkey" PRIMARY KEY (id);


--
-- Name: DisciplinaryAction DisciplinaryAction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisciplinaryAction"
    ADD CONSTRAINT "DisciplinaryAction_pkey" PRIMARY KEY (id);


--
-- Name: DisciplinaryAttachment DisciplinaryAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisciplinaryAttachment"
    ADD CONSTRAINT "DisciplinaryAttachment_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeBranchAssignment EmployeeBranchAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeBranchAssignment"
    ADD CONSTRAINT "EmployeeBranchAssignment_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeCompensation EmployeeCompensation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeCompensation"
    ADD CONSTRAINT "EmployeeCompensation_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeDocumentVersion EmployeeDocumentVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocumentVersion"
    ADD CONSTRAINT "EmployeeDocumentVersion_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeDocument EmployeeDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeEngagement EmployeeEngagement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEngagement"
    ADD CONSTRAINT "EmployeeEngagement_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeEvaluation EmployeeEvaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEvaluation"
    ADD CONSTRAINT "EmployeeEvaluation_pkey" PRIMARY KEY (id);


--
-- Name: EmployeePositionAssignment EmployeePositionAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeePositionAssignment"
    ADD CONSTRAINT "EmployeePositionAssignment_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeShiftAssignment EmployeeShiftAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeShiftAssignment"
    ADD CONSTRAINT "EmployeeShiftAssignment_pkey" PRIMARY KEY (id);


--
-- Name: EvaluationForm EvaluationForm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationForm"
    ADD CONSTRAINT "EvaluationForm_pkey" PRIMARY KEY (id);


--
-- Name: EvaluationQuestion EvaluationQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationQuestion"
    ADD CONSTRAINT "EvaluationQuestion_pkey" PRIMARY KEY (id);


--
-- Name: FileAsset FileAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FileAsset"
    ADD CONSTRAINT "FileAsset_pkey" PRIMARY KEY (id);


--
-- Name: FinanceAttachment FinanceAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceAttachment"
    ADD CONSTRAINT "FinanceAttachment_pkey" PRIMARY KEY (id);


--
-- Name: FinanceCategory FinanceCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceCategory"
    ADD CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY (id);


--
-- Name: FinanceSubcategory FinanceSubcategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceSubcategory"
    ADD CONSTRAINT "FinanceSubcategory_pkey" PRIMARY KEY (id);


--
-- Name: FinancialAccount FinancialAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinancialAccount"
    ADD CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY (id);


--
-- Name: FinancialTransaction FinancialTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinancialTransaction"
    ADD CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY (id);


--
-- Name: HrAttendanceEvent HrAttendanceEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrAttendanceEvent"
    ADD CONSTRAINT "HrAttendanceEvent_pkey" PRIMARY KEY (id);


--
-- Name: HrCompensationHistory HrCompensationHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrCompensationHistory"
    ADD CONSTRAINT "HrCompensationHistory_pkey" PRIMARY KEY (id);


--
-- Name: HrDepartment HrDepartment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrDepartment"
    ADD CONSTRAINT "HrDepartment_pkey" PRIMARY KEY (id);


--
-- Name: HrEmployeeWarning HrEmployeeWarning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrEmployeeWarning"
    ADD CONSTRAINT "HrEmployeeWarning_pkey" PRIMARY KEY (id);


--
-- Name: HrEmployee HrEmployee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrEmployee"
    ADD CONSTRAINT "HrEmployee_pkey" PRIMARY KEY (id);


--
-- Name: HrPayrollLine HrPayrollLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrPayrollLine"
    ADD CONSTRAINT "HrPayrollLine_pkey" PRIMARY KEY (id);


--
-- Name: HrPayrollRun HrPayrollRun_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrPayrollRun"
    ADD CONSTRAINT "HrPayrollRun_pkey" PRIMARY KEY (id);


--
-- Name: HrPosition HrPosition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrPosition"
    ADD CONSTRAINT "HrPosition_pkey" PRIMARY KEY (id);


--
-- Name: HrSettings HrSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrSettings"
    ADD CONSTRAINT "HrSettings_pkey" PRIMARY KEY (id);


--
-- Name: HrWarningAttachment HrWarningAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrWarningAttachment"
    ADD CONSTRAINT "HrWarningAttachment_pkey" PRIMARY KEY (id);


--
-- Name: InventoryArea InventoryArea_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryArea"
    ADD CONSTRAINT "InventoryArea_pkey" PRIMARY KEY (id);


--
-- Name: InventoryEmailScheduleLog InventoryEmailScheduleLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryEmailScheduleLog"
    ADD CONSTRAINT "InventoryEmailScheduleLog_pkey" PRIMARY KEY (id);


--
-- Name: InventoryEmailSchedule InventoryEmailSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryEmailSchedule"
    ADD CONSTRAINT "InventoryEmailSchedule_pkey" PRIMARY KEY (id);


--
-- Name: InventoryEmailSetting InventoryEmailSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryEmailSetting"
    ADD CONSTRAINT "InventoryEmailSetting_pkey" PRIMARY KEY (id);


--
-- Name: InventoryMarginPolicy InventoryMarginPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMarginPolicy"
    ADD CONSTRAINT "InventoryMarginPolicy_pkey" PRIMARY KEY (id);


--
-- Name: InventoryMovement InventoryMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY (id);


--
-- Name: InventoryReportLog InventoryReportLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryReportLog"
    ADD CONSTRAINT "InventoryReportLog_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceConfig InvoiceConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceConfig"
    ADD CONSTRAINT "InvoiceConfig_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceSeries InvoiceSeries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceSeries"
    ADD CONSTRAINT "InvoiceSeries_pkey" PRIMARY KEY (id);


--
-- Name: JournalEntryLine JournalEntryLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalEntryLine"
    ADD CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY (id);


--
-- Name: JournalEntry JournalEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalEntry"
    ADD CONSTRAINT "JournalEntry_pkey" PRIMARY KEY (id);


--
-- Name: LabIntegrationConfig LabIntegrationConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabIntegrationConfig"
    ADD CONSTRAINT "LabIntegrationConfig_pkey" PRIMARY KEY (id);


--
-- Name: LeaveBalance LeaveBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY (id);


--
-- Name: LeavePolicy LeavePolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeavePolicy"
    ADD CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY (id);


--
-- Name: LeaveRequest LeaveRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY (id);


--
-- Name: LegalEntity LegalEntity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LegalEntity"
    ADD CONSTRAINT "LegalEntity_pkey" PRIMARY KEY (id);


--
-- Name: MailGlobalConfig MailGlobalConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MailGlobalConfig"
    ADD CONSTRAINT "MailGlobalConfig_pkey" PRIMARY KEY (id);


--
-- Name: MailModuleAccount MailModuleAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MailModuleAccount"
    ADD CONSTRAINT "MailModuleAccount_pkey" PRIMARY KEY (id);


--
-- Name: MembershipBenefit MembershipBenefit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_pkey" PRIMARY KEY (id);


--
-- Name: MembershipConfig MembershipConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipConfig"
    ADD CONSTRAINT "MembershipConfig_pkey" PRIMARY KEY (id);


--
-- Name: MembershipContract MembershipContract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipContract"
    ADD CONSTRAINT "MembershipContract_pkey" PRIMARY KEY (id);


--
-- Name: MembershipDependent MembershipDependent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipDependent"
    ADD CONSTRAINT "MembershipDependent_pkey" PRIMARY KEY (id);


--
-- Name: MembershipException MembershipException_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipException"
    ADD CONSTRAINT "MembershipException_pkey" PRIMARY KEY (id);


--
-- Name: MembershipPayment MembershipPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipPayment"
    ADD CONSTRAINT "MembershipPayment_pkey" PRIMARY KEY (id);


--
-- Name: MembershipPlan MembershipPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipPlan"
    ADD CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY (id);


--
-- Name: MembershipUsage MembershipUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipUsage"
    ADD CONSTRAINT "MembershipUsage_pkey" PRIMARY KEY (id);


--
-- Name: NotificationOutbox NotificationOutbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationOutbox"
    ADD CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OvertimeRequest OvertimeRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY (id);


--
-- Name: Party Party_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Party"
    ADD CONSTRAINT "Party_pkey" PRIMARY KEY (id);


--
-- Name: Payable Payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payable"
    ADD CONSTRAINT "Payable_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PayrollConcept PayrollConcept_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollConcept"
    ADD CONSTRAINT "PayrollConcept_pkey" PRIMARY KEY (id);


--
-- Name: PayrollEmployeeConcept PayrollEmployeeConcept_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployeeConcept"
    ADD CONSTRAINT "PayrollEmployeeConcept_pkey" PRIMARY KEY (id);


--
-- Name: PayrollEmployee PayrollEmployee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployee"
    ADD CONSTRAINT "PayrollEmployee_pkey" PRIMARY KEY (id);


--
-- Name: PayrollFinanceRecord PayrollFinanceRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollFinanceRecord"
    ADD CONSTRAINT "PayrollFinanceRecord_pkey" PRIMARY KEY (id);


--
-- Name: PayrollRunEntry PayrollRunEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRunEntry"
    ADD CONSTRAINT "PayrollRunEntry_pkey" PRIMARY KEY (id);


--
-- Name: PayrollRun PayrollRun_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRun"
    ADD CONSTRAINT "PayrollRun_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: PipelineConfig PipelineConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineConfig"
    ADD CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY (id);


--
-- Name: PipelineRuleSet PipelineRuleSet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineRuleSet"
    ADD CONSTRAINT "PipelineRuleSet_pkey" PRIMARY KEY (id);


--
-- Name: PipelineRule PipelineRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineRule"
    ADD CONSTRAINT "PipelineRule_pkey" PRIMARY KEY (id);


--
-- Name: PipelineStage PipelineStage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineStage"
    ADD CONSTRAINT "PipelineStage_pkey" PRIMARY KEY (id);


--
-- Name: PipelineTransition PipelineTransition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineTransition"
    ADD CONSTRAINT "PipelineTransition_pkey" PRIMARY KEY (id);


--
-- Name: PriceListItem PriceListItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceListItem"
    ADD CONSTRAINT "PriceListItem_pkey" PRIMARY KEY (id);


--
-- Name: PriceList PriceList_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceList"
    ADD CONSTRAINT "PriceList_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY (id);


--
-- Name: ProductStock ProductStock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStock"
    ADD CONSTRAINT "ProductStock_pkey" PRIMARY KEY (id);


--
-- Name: ProductSubcategory ProductSubcategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSubcategory"
    ADD CONSTRAINT "ProductSubcategory_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: ProfessionalLicense ProfessionalLicense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfessionalLicense"
    ADD CONSTRAINT "ProfessionalLicense_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseOrderItem PurchaseOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseOrder PurchaseOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseRequestItem PurchaseRequestItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseRequestItem"
    ADD CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseRequest PurchaseRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseRequest"
    ADD CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY (id);


--
-- Name: QuoteDelivery QuoteDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteDelivery"
    ADD CONSTRAINT "QuoteDelivery_pkey" PRIMARY KEY (id);


--
-- Name: QuoteItem QuoteItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteItem"
    ADD CONSTRAINT "QuoteItem_pkey" PRIMARY KEY (id);


--
-- Name: QuoteRequest QuoteRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteRequest"
    ADD CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY (id);


--
-- Name: QuoteSettings QuoteSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteSettings"
    ADD CONSTRAINT "QuoteSettings_pkey" PRIMARY KEY (id);


--
-- Name: QuoteTemplate QuoteTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteTemplate"
    ADD CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Quote Quote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Quote"
    ADD CONSTRAINT "Quote_pkey" PRIMARY KEY (id);


--
-- Name: Receivable Receivable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receivable"
    ADD CONSTRAINT "Receivable_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Room Room_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_pkey" PRIMARY KEY (id);


--
-- Name: RuleEvaluationLog RuleEvaluationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RuleEvaluationLog"
    ADD CONSTRAINT "RuleEvaluationLog_pkey" PRIMARY KEY (id);


--
-- Name: SequenceCounter SequenceCounter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequenceCounter"
    ADD CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCategory ServiceCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceCategory"
    ADD CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY (id);


--
-- Name: ServiceSubcategory ServiceSubcategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceSubcategory"
    ADD CONSTRAINT "ServiceSubcategory_pkey" PRIMARY KEY (id);


--
-- Name: Service Service_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_pkey" PRIMARY KEY (id);


--
-- Name: ShiftTemplate ShiftTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftTemplate"
    ADD CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY (id);


--
-- Name: TimeClockDevice TimeClockDevice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockDevice"
    ADD CONSTRAINT "TimeClockDevice_pkey" PRIMARY KEY (id);


--
-- Name: TimeClockLog TimeClockLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockLog"
    ADD CONSTRAINT "TimeClockLog_pkey" PRIMARY KEY (id);


--
-- Name: UserPermission UserPermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPermission"
    ADD CONSTRAINT "UserPermission_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkSchedule WorkSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkSchedule"
    ADD CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_code_key" ON public."Account" USING btree (code);


--
-- Name: ApiIntegrationConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ApiIntegrationConfig_key_key" ON public."ApiIntegrationConfig" USING btree (key);


--
-- Name: AttendanceComputed_employeeId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceComputed_employeeId_date_key" ON public."AttendanceComputed" USING btree ("employeeId", date);


--
-- Name: AttendanceComputed_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceComputed_status_idx" ON public."AttendanceComputed" USING btree (status);


--
-- Name: AttendanceDay_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceDay_branchId_idx" ON public."AttendanceDay" USING btree ("branchId");


--
-- Name: AttendanceDay_employeeId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceDay_employeeId_date_key" ON public."AttendanceDay" USING btree ("employeeId", date);


--
-- Name: AttendanceDay_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceDay_legalEntityId_idx" ON public."AttendanceDay" USING btree ("legalEntityId");


--
-- Name: AttendanceDay_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceDay_status_idx" ON public."AttendanceDay" USING btree (status);


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_actorUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_actorUserId_idx" ON public."AuditLog" USING btree ("actorUserId");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_timestamp_idx" ON public."AuditLog" USING btree ("timestamp");


--
-- Name: B2BProposalDoc_dealId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "B2BProposalDoc_dealId_createdAt_idx" ON public."B2BProposalDoc" USING btree ("dealId", "createdAt");


--
-- Name: B2BProposalDoc_sequenceYear_sequenceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "B2BProposalDoc_sequenceYear_sequenceNumber_key" ON public."B2BProposalDoc" USING btree ("sequenceYear", "sequenceNumber");


--
-- Name: B2BProposalDoc_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "B2BProposalDoc_status_idx" ON public."B2BProposalDoc" USING btree (status);


--
-- Name: Branch_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Branch_code_key" ON public."Branch" USING btree (code);


--
-- Name: Branch_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Branch_name_key" ON public."Branch" USING btree (name);


--
-- Name: ClientProfile_dpi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClientProfile_dpi_key" ON public."ClientProfile" USING btree (dpi);


--
-- Name: ClientProfile_email_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClientProfile_email_phone_idx" ON public."ClientProfile" USING btree (email, phone);


--
-- Name: ClientProfile_nit_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClientProfile_nit_key" ON public."ClientProfile" USING btree (nit);


--
-- Name: ComboProduct_comboId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ComboProduct_comboId_productId_key" ON public."ComboProduct" USING btree ("comboId", "productId");


--
-- Name: ComboService_comboId_serviceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ComboService_comboId_serviceId_key" ON public."ComboService" USING btree ("comboId", "serviceId");


--
-- Name: CompensationBonus_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompensationBonus_employeeId_idx" ON public."CompensationBonus" USING btree ("employeeId");


--
-- Name: CompensationBonus_engagementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompensationBonus_engagementId_idx" ON public."CompensationBonus" USING btree ("engagementId");


--
-- Name: CrmAccount_nit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmAccount_nit_idx" ON public."CrmAccount" USING btree (nit);


--
-- Name: CrmAccount_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmAccount_ownerId_idx" ON public."CrmAccount" USING btree ("ownerId");


--
-- Name: CrmActivity_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmActivity_accountId_idx" ON public."CrmActivity" USING btree ("accountId");


--
-- Name: CrmActivity_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmActivity_contactId_idx" ON public."CrmActivity" USING btree ("contactId");


--
-- Name: CrmActivity_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmActivity_dealId_idx" ON public."CrmActivity" USING btree ("dealId");


--
-- Name: CrmCalendarEvent_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmCalendarEvent_dealId_idx" ON public."CrmCalendarEvent" USING btree ("dealId");


--
-- Name: CrmCalendarEvent_leadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmCalendarEvent_leadId_idx" ON public."CrmCalendarEvent" USING btree ("leadId");


--
-- Name: CrmCalendarEvent_quoteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmCalendarEvent_quoteId_idx" ON public."CrmCalendarEvent" USING btree ("quoteId");


--
-- Name: CrmCalendarEvent_type_startAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmCalendarEvent_type_startAt_idx" ON public."CrmCalendarEvent" USING btree (type, "startAt");


--
-- Name: CrmContact_email_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmContact_email_phone_idx" ON public."CrmContact" USING btree (email, phone);


--
-- Name: CrmDealServiceInterest_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDealServiceInterest_dealId_idx" ON public."CrmDealServiceInterest" USING btree ("dealId");


--
-- Name: CrmDealServiceInterest_dealId_serviceType_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CrmDealServiceInterest_dealId_serviceType_key" ON public."CrmDealServiceInterest" USING btree ("dealId", "serviceType");


--
-- Name: CrmDealStageHistory_dealId_changedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDealStageHistory_dealId_changedAt_idx" ON public."CrmDealStageHistory" USING btree ("dealId", "changedAt");


--
-- Name: CrmDeal_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDeal_accountId_idx" ON public."CrmDeal" USING btree ("accountId");


--
-- Name: CrmDeal_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDeal_branchId_idx" ON public."CrmDeal" USING btree ("branchId");


--
-- Name: CrmDeal_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDeal_contactId_idx" ON public."CrmDeal" USING btree ("contactId");


--
-- Name: CrmDeal_ownerUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDeal_ownerUserId_idx" ON public."CrmDeal" USING btree ("ownerUserId");


--
-- Name: CrmDeal_pipelineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDeal_pipelineId_idx" ON public."CrmDeal" USING btree ("pipelineId");


--
-- Name: CrmDeal_pipelineType_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmDeal_pipelineType_stage_idx" ON public."CrmDeal" USING btree ("pipelineType", stage);


--
-- Name: CrmLead_leadType_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmLead_leadType_status_idx" ON public."CrmLead" USING btree ("leadType", status);


--
-- Name: CrmLead_nit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmLead_nit_idx" ON public."CrmLead" USING btree (nit);


--
-- Name: CrmLead_personDpi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmLead_personDpi_idx" ON public."CrmLead" USING btree ("personDpi");


--
-- Name: CrmPipelineStage_pipelineId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmPipelineStage_pipelineId_order_idx" ON public."CrmPipelineStage" USING btree ("pipelineId", "order");


--
-- Name: CrmPipelineStage_pipelineId_stage_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CrmPipelineStage_pipelineId_stage_key" ON public."CrmPipelineStage" USING btree ("pipelineId", stage);


--
-- Name: CrmPipeline_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmPipeline_type_idx" ON public."CrmPipeline" USING btree (type);


--
-- Name: CrmQuoteItem_quoteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmQuoteItem_quoteId_idx" ON public."CrmQuoteItem" USING btree ("quoteId");


--
-- Name: CrmQuote_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmQuote_dealId_idx" ON public."CrmQuote" USING btree ("dealId");


--
-- Name: CrmQuote_dealId_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CrmQuote_dealId_sequence_key" ON public."CrmQuote" USING btree ("dealId", sequence);


--
-- Name: CrmQuote_leadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmQuote_leadId_idx" ON public."CrmQuote" USING btree ("leadId");


--
-- Name: CrmQuote_quoteNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CrmQuote_quoteNumber_key" ON public."CrmQuote" USING btree ("quoteNumber");


--
-- Name: CrmRequest_dealId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmRequest_dealId_status_idx" ON public."CrmRequest" USING btree ("dealId", status);


--
-- Name: CrmTask_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmTask_dealId_idx" ON public."CrmTask" USING btree ("dealId");


--
-- Name: CrmTask_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CrmTask_ownerId_idx" ON public."CrmTask" USING btree ("ownerId");


--
-- Name: DisciplinaryAction_employeeId_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DisciplinaryAction_employeeId_issuedAt_idx" ON public."DisciplinaryAction" USING btree ("employeeId", "issuedAt");


--
-- Name: DisciplinaryAction_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DisciplinaryAction_status_idx" ON public."DisciplinaryAction" USING btree (status);


--
-- Name: DisciplinaryAttachment_disciplinaryActionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DisciplinaryAttachment_disciplinaryActionId_idx" ON public."DisciplinaryAttachment" USING btree ("disciplinaryActionId");


--
-- Name: EmployeeBranchAssignment_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeBranchAssignment_branchId_idx" ON public."EmployeeBranchAssignment" USING btree ("branchId");


--
-- Name: EmployeeBranchAssignment_employeeId_branchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeBranchAssignment_employeeId_branchId_key" ON public."EmployeeBranchAssignment" USING btree ("employeeId", "branchId");


--
-- Name: EmployeeBranchAssignment_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeBranchAssignment_employeeId_idx" ON public."EmployeeBranchAssignment" USING btree ("employeeId");


--
-- Name: EmployeeCompensation_engagementId_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeCompensation_engagementId_effectiveFrom_idx" ON public."EmployeeCompensation" USING btree ("engagementId", "effectiveFrom");


--
-- Name: EmployeeDocumentVersion_documentId_versionNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeDocumentVersion_documentId_versionNumber_key" ON public."EmployeeDocumentVersion" USING btree ("documentId", "versionNumber");


--
-- Name: EmployeeDocumentVersion_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocumentVersion_expiresAt_idx" ON public."EmployeeDocumentVersion" USING btree ("expiresAt");


--
-- Name: EmployeeDocument_currentVersionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeDocument_currentVersionId_key" ON public."EmployeeDocument" USING btree ("currentVersionId");


--
-- Name: EmployeeDocument_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_employeeId_idx" ON public."EmployeeDocument" USING btree ("employeeId");


--
-- Name: EmployeeEngagement_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeEngagement_employeeId_idx" ON public."EmployeeEngagement" USING btree ("employeeId");


--
-- Name: EmployeeEngagement_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeEngagement_legalEntityId_idx" ON public."EmployeeEngagement" USING btree ("legalEntityId");


--
-- Name: EmployeeEngagement_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeEngagement_status_idx" ON public."EmployeeEngagement" USING btree (status);


--
-- Name: EmployeeEvaluation_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeEvaluation_employeeId_idx" ON public."EmployeeEvaluation" USING btree ("employeeId");


--
-- Name: EmployeeEvaluation_formId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeEvaluation_formId_idx" ON public."EmployeeEvaluation" USING btree ("formId");


--
-- Name: EmployeePositionAssignment_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeePositionAssignment_employeeId_idx" ON public."EmployeePositionAssignment" USING btree ("employeeId");


--
-- Name: EmployeePositionAssignment_positionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeePositionAssignment_positionId_idx" ON public."EmployeePositionAssignment" USING btree ("positionId");


--
-- Name: EmployeeShiftAssignment_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeShiftAssignment_employeeId_idx" ON public."EmployeeShiftAssignment" USING btree ("employeeId");


--
-- Name: EmployeeShiftAssignment_shiftTemplateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeShiftAssignment_shiftTemplateId_idx" ON public."EmployeeShiftAssignment" USING btree ("shiftTemplateId");


--
-- Name: EvaluationQuestion_formId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EvaluationQuestion_formId_idx" ON public."EvaluationQuestion" USING btree ("formId");


--
-- Name: FileAsset_storageKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON public."FileAsset" USING btree ("storageKey");


--
-- Name: FinanceCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FinanceCategory_slug_key" ON public."FinanceCategory" USING btree (slug);


--
-- Name: FinanceSubcategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FinanceSubcategory_slug_key" ON public."FinanceSubcategory" USING btree (slug);


--
-- Name: FinancialAccount_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FinancialAccount_legalEntityId_idx" ON public."FinancialAccount" USING btree ("legalEntityId");


--
-- Name: HrAttendanceEvent_employeeId_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrAttendanceEvent_employeeId_occurredAt_idx" ON public."HrAttendanceEvent" USING btree ("employeeId", "occurredAt");


--
-- Name: HrAttendanceEvent_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrAttendanceEvent_occurredAt_idx" ON public."HrAttendanceEvent" USING btree ("occurredAt");


--
-- Name: HrCompensationHistory_employeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrCompensationHistory_employeeId_createdAt_idx" ON public."HrCompensationHistory" USING btree ("employeeId", "createdAt");


--
-- Name: HrDepartment_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HrDepartment_name_key" ON public."HrDepartment" USING btree (name);


--
-- Name: HrEmployeeWarning_employeeId_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrEmployeeWarning_employeeId_issuedAt_idx" ON public."HrEmployeeWarning" USING btree ("employeeId", "issuedAt");


--
-- Name: HrEmployee_dpi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrEmployee_dpi_idx" ON public."HrEmployee" USING btree (dpi);


--
-- Name: HrEmployee_dpi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HrEmployee_dpi_key" ON public."HrEmployee" USING btree (dpi);


--
-- Name: HrEmployee_employeeCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrEmployee_employeeCode_idx" ON public."HrEmployee" USING btree ("employeeCode");


--
-- Name: HrEmployee_employeeCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HrEmployee_employeeCode_key" ON public."HrEmployee" USING btree ("employeeCode");


--
-- Name: HrEmployee_primaryLegalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrEmployee_primaryLegalEntityId_idx" ON public."HrEmployee" USING btree ("primaryLegalEntityId");


--
-- Name: HrEmployee_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HrEmployee_userId_key" ON public."HrEmployee" USING btree ("userId");


--
-- Name: HrPayrollLine_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrPayrollLine_employeeId_idx" ON public."HrPayrollLine" USING btree ("employeeId");


--
-- Name: HrPayrollLine_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrPayrollLine_payrollRunId_idx" ON public."HrPayrollLine" USING btree ("payrollRunId");


--
-- Name: HrPosition_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HrPosition_name_key" ON public."HrPosition" USING btree (name);


--
-- Name: HrWarningAttachment_warningId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HrWarningAttachment_warningId_idx" ON public."HrWarningAttachment" USING btree ("warningId");


--
-- Name: InventoryArea_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryArea_slug_key" ON public."InventoryArea" USING btree (slug);


--
-- Name: InventoryReportLog_settingId_periodFrom_periodTo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryReportLog_settingId_periodFrom_periodTo_key" ON public."InventoryReportLog" USING btree ("settingId", "periodFrom", "periodTo");


--
-- Name: InvoiceSeries_invoiceConfigId_code_branchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InvoiceSeries_invoiceConfigId_code_branchId_key" ON public."InvoiceSeries" USING btree ("invoiceConfigId", code, "branchId");


--
-- Name: LeaveBalance_employeeId_policyId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LeaveBalance_employeeId_policyId_key" ON public."LeaveBalance" USING btree ("employeeId", "policyId");


--
-- Name: LeaveRequest_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaveRequest_employeeId_idx" ON public."LeaveRequest" USING btree ("employeeId");


--
-- Name: LeaveRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaveRequest_status_idx" ON public."LeaveRequest" USING btree (status);


--
-- Name: MailModuleAccount_moduleKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MailModuleAccount_moduleKey_key" ON public."MailModuleAccount" USING btree ("moduleKey");


--
-- Name: MembershipBenefit_kind_targetType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipBenefit_kind_targetType_idx" ON public."MembershipBenefit" USING btree (kind, "targetType");


--
-- Name: MembershipBenefit_planId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipBenefit_planId_idx" ON public."MembershipBenefit" USING btree ("planId");


--
-- Name: MembershipContract_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MembershipContract_code_key" ON public."MembershipContract" USING btree (code);


--
-- Name: MembershipContract_nextRenewAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipContract_nextRenewAt_idx" ON public."MembershipContract" USING btree ("nextRenewAt");


--
-- Name: MembershipContract_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipContract_ownerId_idx" ON public."MembershipContract" USING btree ("ownerId");


--
-- Name: MembershipContract_planId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipContract_planId_idx" ON public."MembershipContract" USING btree ("planId");


--
-- Name: MembershipContract_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipContract_status_idx" ON public."MembershipContract" USING btree (status);


--
-- Name: MembershipDependent_contractId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipDependent_contractId_idx" ON public."MembershipDependent" USING btree ("contractId");


--
-- Name: MembershipDependent_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipDependent_personId_idx" ON public."MembershipDependent" USING btree ("personId");


--
-- Name: MembershipException_contractId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipException_contractId_idx" ON public."MembershipException" USING btree ("contractId");


--
-- Name: MembershipException_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipException_createdByUserId_idx" ON public."MembershipException" USING btree ("createdByUserId");


--
-- Name: MembershipException_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipException_expiresAt_idx" ON public."MembershipException" USING btree ("expiresAt");


--
-- Name: MembershipPayment_contractId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipPayment_contractId_idx" ON public."MembershipPayment" USING btree ("contractId");


--
-- Name: MembershipPayment_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipPayment_kind_idx" ON public."MembershipPayment" USING btree (kind);


--
-- Name: MembershipPayment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipPayment_status_idx" ON public."MembershipPayment" USING btree (status);


--
-- Name: MembershipPlan_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MembershipPlan_slug_key" ON public."MembershipPlan" USING btree (slug);


--
-- Name: MembershipPlan_type_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipPlan_type_active_idx" ON public."MembershipPlan" USING btree (type, active);


--
-- Name: MembershipUsage_benefitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipUsage_benefitId_idx" ON public."MembershipUsage" USING btree ("benefitId");


--
-- Name: MembershipUsage_contractId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipUsage_contractId_idx" ON public."MembershipUsage" USING btree ("contractId");


--
-- Name: MembershipUsage_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipUsage_module_idx" ON public."MembershipUsage" USING btree (module);


--
-- Name: MembershipUsage_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MembershipUsage_occurredAt_idx" ON public."MembershipUsage" USING btree ("occurredAt");


--
-- Name: NotificationOutbox_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationOutbox_entityType_entityId_idx" ON public."NotificationOutbox" USING btree ("entityType", "entityId");


--
-- Name: NotificationOutbox_status_scheduledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationOutbox_status_scheduledAt_idx" ON public."NotificationOutbox" USING btree (status, "scheduledAt");


--
-- Name: Notification_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_employeeId_idx" ON public."Notification" USING btree ("employeeId");


--
-- Name: Notification_type_dueAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_type_dueAt_idx" ON public."Notification" USING btree (type, "dueAt");


--
-- Name: OvertimeRequest_attendanceDayId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OvertimeRequest_attendanceDayId_key" ON public."OvertimeRequest" USING btree ("attendanceDayId");


--
-- Name: OvertimeRequest_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OvertimeRequest_employeeId_idx" ON public."OvertimeRequest" USING btree ("employeeId");


--
-- Name: OvertimeRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OvertimeRequest_status_idx" ON public."OvertimeRequest" USING btree (status);


--
-- Name: Payable_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payable_legalEntityId_idx" ON public."Payable" USING btree ("legalEntityId");


--
-- Name: Payable_partyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payable_partyId_idx" ON public."Payable" USING btree ("partyId");


--
-- Name: PayrollConcept_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PayrollConcept_code_key" ON public."PayrollConcept" USING btree (code);


--
-- Name: PayrollEmployeeConcept_conceptId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollEmployeeConcept_conceptId_idx" ON public."PayrollEmployeeConcept" USING btree ("conceptId");


--
-- Name: PayrollEmployeeConcept_payrollEmployeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollEmployeeConcept_payrollEmployeeId_idx" ON public."PayrollEmployeeConcept" USING btree ("payrollEmployeeId");


--
-- Name: PayrollEmployee_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollEmployee_employeeId_idx" ON public."PayrollEmployee" USING btree ("employeeId");


--
-- Name: PayrollEmployee_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollEmployee_payrollRunId_idx" ON public."PayrollEmployee" USING btree ("payrollRunId");


--
-- Name: PayrollFinanceRecord_payableId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollFinanceRecord_payableId_idx" ON public."PayrollFinanceRecord" USING btree ("payableId");


--
-- Name: PayrollFinanceRecord_payrollEmployeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollFinanceRecord_payrollEmployeeId_idx" ON public."PayrollFinanceRecord" USING btree ("payrollEmployeeId");


--
-- Name: PayrollFinanceRecord_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollFinanceRecord_payrollRunId_idx" ON public."PayrollFinanceRecord" USING btree ("payrollRunId");


--
-- Name: PayrollRunEntry_engagementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollRunEntry_engagementId_idx" ON public."PayrollRunEntry" USING btree ("engagementId");


--
-- Name: PayrollRunEntry_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollRunEntry_payrollRunId_idx" ON public."PayrollRunEntry" USING btree ("payrollRunId");


--
-- Name: PayrollRun_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PayrollRun_code_key" ON public."PayrollRun" USING btree (code);


--
-- Name: PayrollRun_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollRun_legalEntityId_idx" ON public."PayrollRun" USING btree ("legalEntityId");


--
-- Name: PayrollRun_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollRun_status_idx" ON public."PayrollRun" USING btree (status);


--
-- Name: Permission_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_key_key" ON public."Permission" USING btree (key);


--
-- Name: Permission_module_area_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_module_area_action_idx" ON public."Permission" USING btree (module, area, action);


--
-- Name: PipelineConfig_name_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PipelineConfig_name_type_key" ON public."PipelineConfig" USING btree (name, type);


--
-- Name: PipelineRuleSet_pipelineId_scope_fromStageKey_toStageKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PipelineRuleSet_pipelineId_scope_fromStageKey_toStageKey_idx" ON public."PipelineRuleSet" USING btree ("pipelineId", scope, "fromStageKey", "toStageKey");


--
-- Name: PipelineRuleSet_pipelineId_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PipelineRuleSet_pipelineId_scope_idx" ON public."PipelineRuleSet" USING btree ("pipelineId", scope);


--
-- Name: PipelineRuleSet_pipelineId_scope_stageKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PipelineRuleSet_pipelineId_scope_stageKey_idx" ON public."PipelineRuleSet" USING btree ("pipelineId", scope, "stageKey");


--
-- Name: PipelineRule_ruleSetId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PipelineRule_ruleSetId_order_idx" ON public."PipelineRule" USING btree ("ruleSetId", "order");


--
-- Name: PipelineStage_pipelineId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PipelineStage_pipelineId_key_key" ON public."PipelineStage" USING btree ("pipelineId", key);


--
-- Name: PipelineStage_pipelineId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PipelineStage_pipelineId_order_idx" ON public."PipelineStage" USING btree ("pipelineId", "order");


--
-- Name: PipelineTransition_pipelineId_fromStageKey_toStageKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PipelineTransition_pipelineId_fromStageKey_toStageKey_idx" ON public."PipelineTransition" USING btree ("pipelineId", "fromStageKey", "toStageKey");


--
-- Name: ProductCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductCategory_slug_key" ON public."ProductCategory" USING btree (slug);


--
-- Name: ProductStock_productId_branchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductStock_productId_branchId_key" ON public."ProductStock" USING btree ("productId", "branchId");


--
-- Name: ProductSubcategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductSubcategory_slug_key" ON public."ProductSubcategory" USING btree (slug);


--
-- Name: Product_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Product_code_key" ON public."Product" USING btree (code);


--
-- Name: ProfessionalLicense_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfessionalLicense_employeeId_key" ON public."ProfessionalLicense" USING btree ("employeeId");


--
-- Name: PurchaseOrder_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON public."PurchaseOrder" USING btree (code);


--
-- Name: PurchaseRequest_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PurchaseRequest_code_key" ON public."PurchaseRequest" USING btree (code);


--
-- Name: QuoteDelivery_providerMessageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuoteDelivery_providerMessageId_idx" ON public."QuoteDelivery" USING btree ("providerMessageId");


--
-- Name: QuoteDelivery_quoteId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuoteDelivery_quoteId_createdAt_idx" ON public."QuoteDelivery" USING btree ("quoteId", "createdAt");


--
-- Name: QuoteDelivery_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuoteDelivery_status_idx" ON public."QuoteDelivery" USING btree (status);


--
-- Name: QuoteItem_quoteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuoteItem_quoteId_idx" ON public."QuoteItem" USING btree ("quoteId");


--
-- Name: QuoteRequest_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuoteRequest_dealId_idx" ON public."QuoteRequest" USING btree ("dealId");


--
-- Name: QuoteRequest_quoteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuoteRequest_quoteId_idx" ON public."QuoteRequest" USING btree ("quoteId");


--
-- Name: Quote_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Quote_dealId_idx" ON public."Quote" USING btree ("dealId");


--
-- Name: Quote_dealId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Quote_dealId_isActive_idx" ON public."Quote" USING btree ("dealId", "isActive");


--
-- Name: Quote_dealId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Quote_dealId_status_idx" ON public."Quote" USING btree ("dealId", status);


--
-- Name: Quote_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Quote_number_key" ON public."Quote" USING btree (number);


--
-- Name: Receivable_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Receivable_legalEntityId_idx" ON public."Receivable" USING btree ("legalEntityId");


--
-- Name: Receivable_partyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Receivable_partyId_idx" ON public."Receivable" USING btree ("partyId");


--
-- Name: RolePermission_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON public."RolePermission" USING btree ("roleId", "permissionId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: RuleEvaluationLog_dealId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RuleEvaluationLog_dealId_createdAt_idx" ON public."RuleEvaluationLog" USING btree ("dealId", "createdAt");


--
-- Name: SequenceCounter_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SequenceCounter_key_key" ON public."SequenceCounter" USING btree (key);


--
-- Name: ServiceCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON public."ServiceCategory" USING btree (slug);


--
-- Name: ServiceSubcategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ServiceSubcategory_slug_key" ON public."ServiceSubcategory" USING btree (slug);


--
-- Name: Service_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Service_code_key" ON public."Service" USING btree (code);


--
-- Name: TimeClockDevice_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockDevice_branchId_idx" ON public."TimeClockDevice" USING btree ("branchId");


--
-- Name: TimeClockDevice_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockDevice_legalEntityId_idx" ON public."TimeClockDevice" USING btree ("legalEntityId");


--
-- Name: TimeClockLog_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockLog_branchId_idx" ON public."TimeClockLog" USING btree ("branchId");


--
-- Name: TimeClockLog_deviceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockLog_deviceId_idx" ON public."TimeClockLog" USING btree ("deviceId");


--
-- Name: TimeClockLog_employeeId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockLog_employeeId_timestamp_idx" ON public."TimeClockLog" USING btree ("employeeId", "timestamp");


--
-- Name: TimeClockLog_legalEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockLog_legalEntityId_idx" ON public."TimeClockLog" USING btree ("legalEntityId");


--
-- Name: TimeClockLog_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeClockLog_source_idx" ON public."TimeClockLog" USING btree (source);


--
-- Name: UserPermission_userId_permissionId_legalEntityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserPermission_userId_permissionId_legalEntityId_key" ON public."UserPermission" USING btree ("userId", "permissionId", "legalEntityId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Account Account_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointment Appointment_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointment Appointment_typeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES public."AppointmentType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceComputed AttendanceComputed_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceComputed"
    ADD CONSTRAINT "AttendanceComputed_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceDay AttendanceDay_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceDay AttendanceDay_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceDay AttendanceDay_closedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceDay AttendanceDay_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceDay AttendanceDay_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceDay AttendanceDay_shiftTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES public."ShiftTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: B2BProposalDoc B2BProposalDoc_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."B2BProposalDoc"
    ADD CONSTRAINT "B2BProposalDoc_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: B2BProposalDoc B2BProposalDoc_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."B2BProposalDoc"
    ADD CONSTRAINT "B2BProposalDoc_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: B2BProposalDoc B2BProposalDoc_lastPdfFileAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."B2BProposalDoc"
    ADD CONSTRAINT "B2BProposalDoc_lastPdfFileAssetId_fkey" FOREIGN KEY ("lastPdfFileAssetId") REFERENCES public."FileAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: B2BProposalDoc B2BProposalDoc_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."B2BProposalDoc"
    ADD CONSTRAINT "B2BProposalDoc_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ComboProduct ComboProduct_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComboProduct"
    ADD CONSTRAINT "ComboProduct_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public."Combo"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComboProduct ComboProduct_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComboProduct"
    ADD CONSTRAINT "ComboProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComboService ComboService_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComboService"
    ADD CONSTRAINT "ComboService_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public."Combo"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComboService ComboService_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComboService"
    ADD CONSTRAINT "ComboService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompensationBonus CompensationBonus_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompensationBonus"
    ADD CONSTRAINT "CompensationBonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompensationBonus CompensationBonus_engagementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompensationBonus"
    ADD CONSTRAINT "CompensationBonus_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES public."EmployeeEngagement"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmAccount CrmAccount_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmAccount"
    ADD CONSTRAINT "CrmAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."ClientProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmActivity CrmActivity_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmActivity"
    ADD CONSTRAINT "CrmActivity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."CrmAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmActivity CrmActivity_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmActivity"
    ADD CONSTRAINT "CrmActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."CrmContact"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmActivity CrmActivity_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmActivity"
    ADD CONSTRAINT "CrmActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmCalendarEvent CrmCalendarEvent_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmCalendarEvent"
    ADD CONSTRAINT "CrmCalendarEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmCalendarEvent CrmCalendarEvent_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmCalendarEvent"
    ADD CONSTRAINT "CrmCalendarEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."CrmLead"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmCalendarEvent CrmCalendarEvent_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmCalendarEvent"
    ADD CONSTRAINT "CrmCalendarEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."CrmQuote"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmContact CrmContact_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmContact"
    ADD CONSTRAINT "CrmContact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."CrmAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmContact CrmContact_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmContact"
    ADD CONSTRAINT "CrmContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."ClientProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmDealServiceInterest CrmDealServiceInterest_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDealServiceInterest"
    ADD CONSTRAINT "CrmDealServiceInterest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmDealStageHistory CrmDealStageHistory_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDealStageHistory"
    ADD CONSTRAINT "CrmDealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmDeal CrmDeal_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDeal"
    ADD CONSTRAINT "CrmDeal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."CrmAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmDeal CrmDeal_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDeal"
    ADD CONSTRAINT "CrmDeal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."CrmContact"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmDeal CrmDeal_ownerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDeal"
    ADD CONSTRAINT "CrmDeal_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmDeal CrmDeal_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmDeal"
    ADD CONSTRAINT "CrmDeal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."CrmPipeline"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmLead CrmLead_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmLead"
    ADD CONSTRAINT "CrmLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."ClientProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmPipelineStage CrmPipelineStage_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmPipelineStage"
    ADD CONSTRAINT "CrmPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."CrmPipeline"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmQuoteItem CrmQuoteItem_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuoteItem"
    ADD CONSTRAINT "CrmQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."CrmQuote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmQuoteRequest CrmQuoteRequest_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuoteRequest"
    ADD CONSTRAINT "CrmQuoteRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."CrmQuote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmQuoteRequest CrmQuoteRequest_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuoteRequest"
    ADD CONSTRAINT "CrmQuoteRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."CrmRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmQuote CrmQuote_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuote"
    ADD CONSTRAINT "CrmQuote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmQuote CrmQuote_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmQuote"
    ADD CONSTRAINT "CrmQuote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."CrmLead"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CrmRequest CrmRequest_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmRequest"
    ADD CONSTRAINT "CrmRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrmTask CrmTask_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CrmTask"
    ADD CONSTRAINT "CrmTask_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DisciplinaryAction DisciplinaryAction_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisciplinaryAction"
    ADD CONSTRAINT "DisciplinaryAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DisciplinaryAction DisciplinaryAction_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisciplinaryAction"
    ADD CONSTRAINT "DisciplinaryAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DisciplinaryAction DisciplinaryAction_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisciplinaryAction"
    ADD CONSTRAINT "DisciplinaryAction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DisciplinaryAttachment DisciplinaryAttachment_disciplinaryActionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisciplinaryAttachment"
    ADD CONSTRAINT "DisciplinaryAttachment_disciplinaryActionId_fkey" FOREIGN KEY ("disciplinaryActionId") REFERENCES public."DisciplinaryAction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeBranchAssignment EmployeeBranchAssignment_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeBranchAssignment"
    ADD CONSTRAINT "EmployeeBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeBranchAssignment EmployeeBranchAssignment_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeBranchAssignment"
    ADD CONSTRAINT "EmployeeBranchAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeCompensation EmployeeCompensation_engagementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeCompensation"
    ADD CONSTRAINT "EmployeeCompensation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES public."EmployeeEngagement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeDocumentVersion EmployeeDocumentVersion_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocumentVersion"
    ADD CONSTRAINT "EmployeeDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."EmployeeDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeDocumentVersion EmployeeDocumentVersion_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocumentVersion"
    ADD CONSTRAINT "EmployeeDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeDocument EmployeeDocument_currentVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES public."EmployeeDocumentVersion"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeDocument EmployeeDocument_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeEngagement EmployeeEngagement_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEngagement"
    ADD CONSTRAINT "EmployeeEngagement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeEngagement EmployeeEngagement_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEngagement"
    ADD CONSTRAINT "EmployeeEngagement_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeEvaluation EmployeeEvaluation_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEvaluation"
    ADD CONSTRAINT "EmployeeEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeEvaluation EmployeeEvaluation_evaluatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEvaluation"
    ADD CONSTRAINT "EmployeeEvaluation_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeEvaluation EmployeeEvaluation_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeEvaluation"
    ADD CONSTRAINT "EmployeeEvaluation_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."EvaluationForm"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeePositionAssignment EmployeePositionAssignment_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeePositionAssignment"
    ADD CONSTRAINT "EmployeePositionAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."HrDepartment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeePositionAssignment EmployeePositionAssignment_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeePositionAssignment"
    ADD CONSTRAINT "EmployeePositionAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeePositionAssignment EmployeePositionAssignment_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeePositionAssignment"
    ADD CONSTRAINT "EmployeePositionAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."HrPosition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeShiftAssignment EmployeeShiftAssignment_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeShiftAssignment"
    ADD CONSTRAINT "EmployeeShiftAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeShiftAssignment EmployeeShiftAssignment_shiftTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeShiftAssignment"
    ADD CONSTRAINT "EmployeeShiftAssignment_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES public."ShiftTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EvaluationQuestion EvaluationQuestion_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationQuestion"
    ADD CONSTRAINT "EvaluationQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."EvaluationForm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FileAsset FileAsset_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FileAsset"
    ADD CONSTRAINT "FileAsset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FileAsset FileAsset_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FileAsset"
    ADD CONSTRAINT "FileAsset_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FinanceAttachment FinanceAttachment_payableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceAttachment"
    ADD CONSTRAINT "FinanceAttachment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES public."Payable"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FinanceAttachment FinanceAttachment_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceAttachment"
    ADD CONSTRAINT "FinanceAttachment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FinanceAttachment FinanceAttachment_receivableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceAttachment"
    ADD CONSTRAINT "FinanceAttachment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES public."Receivable"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FinanceSubcategory FinanceSubcategory_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinanceSubcategory"
    ADD CONSTRAINT "FinanceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."FinanceCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FinancialAccount FinancialAccount_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinancialAccount"
    ADD CONSTRAINT "FinancialAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FinancialTransaction FinancialTransaction_financialAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinancialTransaction"
    ADD CONSTRAINT "FinancialTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES public."FinancialAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HrAttendanceEvent HrAttendanceEvent_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrAttendanceEvent"
    ADD CONSTRAINT "HrAttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HrCompensationHistory HrCompensationHistory_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrCompensationHistory"
    ADD CONSTRAINT "HrCompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HrEmployeeWarning HrEmployeeWarning_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrEmployeeWarning"
    ADD CONSTRAINT "HrEmployeeWarning_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HrEmployeeWarning HrEmployeeWarning_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrEmployeeWarning"
    ADD CONSTRAINT "HrEmployeeWarning_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HrEmployee HrEmployee_primaryLegalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrEmployee"
    ADD CONSTRAINT "HrEmployee_primaryLegalEntityId_fkey" FOREIGN KEY ("primaryLegalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HrEmployee HrEmployee_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrEmployee"
    ADD CONSTRAINT "HrEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HrPayrollLine HrPayrollLine_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrPayrollLine"
    ADD CONSTRAINT "HrPayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HrPayrollLine HrPayrollLine_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrPayrollLine"
    ADD CONSTRAINT "HrPayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public."HrPayrollRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HrWarningAttachment HrWarningAttachment_warningId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HrWarningAttachment"
    ADD CONSTRAINT "HrWarningAttachment_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES public."HrEmployeeWarning"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryEmailScheduleLog InventoryEmailScheduleLog_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryEmailScheduleLog"
    ADD CONSTRAINT "InventoryEmailScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."InventoryEmailSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryMovement InventoryMovement_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryReportLog InventoryReportLog_settingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryReportLog"
    ADD CONSTRAINT "InventoryReportLog_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES public."InventoryEmailSetting"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceSeries InvoiceSeries_invoiceConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceSeries"
    ADD CONSTRAINT "InvoiceSeries_invoiceConfigId_fkey" FOREIGN KEY ("invoiceConfigId") REFERENCES public."InvoiceConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JournalEntryLine JournalEntryLine_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalEntryLine"
    ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JournalEntryLine JournalEntryLine_entryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalEntryLine"
    ADD CONSTRAINT "JournalEntryLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES public."JournalEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JournalEntry JournalEntry_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalEntry"
    ADD CONSTRAINT "JournalEntry_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeaveBalance LeaveBalance_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LeaveBalance LeaveBalance_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public."LeavePolicy"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveRequest LeaveRequest_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeaveRequest LeaveRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LeaveRequest LeaveRequest_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public."LeavePolicy"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipBenefit MembershipBenefit_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."MembershipPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembershipContract MembershipContract_assignedBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipContract"
    ADD CONSTRAINT "MembershipContract_assignedBranchId_fkey" FOREIGN KEY ("assignedBranchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipContract MembershipContract_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipContract"
    ADD CONSTRAINT "MembershipContract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."ClientProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipContract MembershipContract_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipContract"
    ADD CONSTRAINT "MembershipContract_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."MembershipPlan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MembershipDependent MembershipDependent_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipDependent"
    ADD CONSTRAINT "MembershipDependent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."MembershipContract"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembershipDependent MembershipDependent_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipDependent"
    ADD CONSTRAINT "MembershipDependent_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."ClientProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipException MembershipException_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipException"
    ADD CONSTRAINT "MembershipException_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."MembershipContract"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembershipException MembershipException_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipException"
    ADD CONSTRAINT "MembershipException_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipPayment MembershipPayment_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipPayment"
    ADD CONSTRAINT "MembershipPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."MembershipContract"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembershipUsage MembershipUsage_benefitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipUsage"
    ADD CONSTRAINT "MembershipUsage_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES public."MembershipBenefit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipUsage MembershipUsage_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipUsage"
    ADD CONSTRAINT "MembershipUsage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MembershipUsage MembershipUsage_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipUsage"
    ADD CONSTRAINT "MembershipUsage_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."MembershipContract"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OvertimeRequest OvertimeRequest_attendanceDayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES public."AttendanceDay"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OvertimeRequest OvertimeRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OvertimeRequest OvertimeRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payable Payable_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payable"
    ADD CONSTRAINT "Payable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."FinanceCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payable Payable_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payable"
    ADD CONSTRAINT "Payable_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payable Payable_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payable"
    ADD CONSTRAINT "Payable_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."Party"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payable Payable_subcategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payable"
    ADD CONSTRAINT "Payable_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES public."FinanceSubcategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_financialAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES public."FinancialAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_payableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES public."Payable"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_receivableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES public."Receivable"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PayrollEmployeeConcept PayrollEmployeeConcept_conceptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployeeConcept"
    ADD CONSTRAINT "PayrollEmployeeConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES public."PayrollConcept"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PayrollEmployeeConcept PayrollEmployeeConcept_payrollEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployeeConcept"
    ADD CONSTRAINT "PayrollEmployeeConcept_payrollEmployeeId_fkey" FOREIGN KEY ("payrollEmployeeId") REFERENCES public."PayrollEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollEmployee PayrollEmployee_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployee"
    ADD CONSTRAINT "PayrollEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollEmployee PayrollEmployee_engagementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployee"
    ADD CONSTRAINT "PayrollEmployee_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES public."EmployeeEngagement"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PayrollEmployee PayrollEmployee_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollEmployee"
    ADD CONSTRAINT "PayrollEmployee_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public."PayrollRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollFinanceRecord PayrollFinanceRecord_payableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollFinanceRecord"
    ADD CONSTRAINT "PayrollFinanceRecord_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES public."Payable"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PayrollFinanceRecord PayrollFinanceRecord_payrollEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollFinanceRecord"
    ADD CONSTRAINT "PayrollFinanceRecord_payrollEmployeeId_fkey" FOREIGN KEY ("payrollEmployeeId") REFERENCES public."PayrollEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollFinanceRecord PayrollFinanceRecord_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollFinanceRecord"
    ADD CONSTRAINT "PayrollFinanceRecord_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public."PayrollRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollRunEntry PayrollRunEntry_engagementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRunEntry"
    ADD CONSTRAINT "PayrollRunEntry_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES public."EmployeeEngagement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PayrollRunEntry PayrollRunEntry_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRunEntry"
    ADD CONSTRAINT "PayrollRunEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public."PayrollRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollRun PayrollRun_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRun"
    ADD CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PayrollRun PayrollRun_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRun"
    ADD CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PayrollRun PayrollRun_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRun"
    ADD CONSTRAINT "PayrollRun_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PipelineRuleSet PipelineRuleSet_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineRuleSet"
    ADD CONSTRAINT "PipelineRuleSet_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."PipelineConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PipelineRule PipelineRule_ruleSetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineRule"
    ADD CONSTRAINT "PipelineRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES public."PipelineRuleSet"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PipelineStage PipelineStage_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineStage"
    ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."PipelineConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PipelineTransition PipelineTransition_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PipelineTransition"
    ADD CONSTRAINT "PipelineTransition_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."PipelineConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PriceListItem PriceListItem_priceListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceListItem"
    ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES public."PriceList"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductStock ProductStock_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStock"
    ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductSubcategory ProductSubcategory_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSubcategory"
    ADD CONSTRAINT "ProductSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProductCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProductCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_inventoryAreaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_inventoryAreaId_fkey" FOREIGN KEY ("inventoryAreaId") REFERENCES public."InventoryArea"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_subcategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES public."ProductSubcategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProfessionalLicense ProfessionalLicense_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfessionalLicense"
    ADD CONSTRAINT "ProfessionalLicense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseOrderItem PurchaseOrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseOrderItem PurchaseOrderItem_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseOrder PurchaseOrder_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PurchaseRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PurchaseRequestItem PurchaseRequestItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseRequestItem"
    ADD CONSTRAINT "PurchaseRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseRequestItem PurchaseRequestItem_purchaseRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseRequestItem"
    ADD CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES public."PurchaseRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuoteDelivery QuoteDelivery_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteDelivery"
    ADD CONSTRAINT "QuoteDelivery_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuoteDelivery QuoteDelivery_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteDelivery"
    ADD CONSTRAINT "QuoteDelivery_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuoteDelivery QuoteDelivery_fileAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteDelivery"
    ADD CONSTRAINT "QuoteDelivery_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES public."FileAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuoteDelivery QuoteDelivery_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteDelivery"
    ADD CONSTRAINT "QuoteDelivery_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuoteItem QuoteItem_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteItem"
    ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuoteRequest QuoteRequest_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteRequest"
    ADD CONSTRAINT "QuoteRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuoteRequest QuoteRequest_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteRequest"
    ADD CONSTRAINT "QuoteRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuoteSettings QuoteSettings_defaultTemplateB2BId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteSettings"
    ADD CONSTRAINT "QuoteSettings_defaultTemplateB2BId_fkey" FOREIGN KEY ("defaultTemplateB2BId") REFERENCES public."QuoteTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuoteSettings QuoteSettings_defaultTemplateB2CId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuoteSettings"
    ADD CONSTRAINT "QuoteSettings_defaultTemplateB2CId_fkey" FOREIGN KEY ("defaultTemplateB2CId") REFERENCES public."QuoteTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Quote Quote_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Quote"
    ADD CONSTRAINT "Quote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."CrmDeal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Quote Quote_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Quote"
    ADD CONSTRAINT "Quote_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."QuoteTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Receivable Receivable_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receivable"
    ADD CONSTRAINT "Receivable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."FinanceCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Receivable Receivable_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receivable"
    ADD CONSTRAINT "Receivable_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Receivable Receivable_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receivable"
    ADD CONSTRAINT "Receivable_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."Party"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Receivable Receivable_subcategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receivable"
    ADD CONSTRAINT "Receivable_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES public."FinanceSubcategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Role Role_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RuleEvaluationLog RuleEvaluationLog_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RuleEvaluationLog"
    ADD CONSTRAINT "RuleEvaluationLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RuleEvaluationLog RuleEvaluationLog_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RuleEvaluationLog"
    ADD CONSTRAINT "RuleEvaluationLog_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."PipelineConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceSubcategory ServiceSubcategory_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceSubcategory"
    ADD CONSTRAINT "ServiceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Service Service_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Service Service_subcategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES public."ServiceSubcategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimeClockDevice TimeClockDevice_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockDevice"
    ADD CONSTRAINT "TimeClockDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimeClockDevice TimeClockDevice_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockDevice"
    ADD CONSTRAINT "TimeClockDevice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimeClockLog TimeClockLog_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockLog"
    ADD CONSTRAINT "TimeClockLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimeClockLog TimeClockLog_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockLog"
    ADD CONSTRAINT "TimeClockLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public."TimeClockDevice"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimeClockLog TimeClockLog_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockLog"
    ADD CONSTRAINT "TimeClockLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."HrEmployee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimeClockLog TimeClockLog_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeClockLog"
    ADD CONSTRAINT "TimeClockLog_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserPermission UserPermission_legalEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPermission"
    ADD CONSTRAINT "UserPermission_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES public."LegalEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserPermission UserPermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPermission"
    ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserPermission UserPermission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPermission"
    ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE "Account"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Account" TO anon;
GRANT ALL ON TABLE public."Account" TO authenticated;
GRANT ALL ON TABLE public."Account" TO service_role;


--
-- Name: TABLE "ApiIntegrationConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ApiIntegrationConfig" TO anon;
GRANT ALL ON TABLE public."ApiIntegrationConfig" TO authenticated;
GRANT ALL ON TABLE public."ApiIntegrationConfig" TO service_role;


--
-- Name: TABLE "AppConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."AppConfig" TO anon;
GRANT ALL ON TABLE public."AppConfig" TO authenticated;
GRANT ALL ON TABLE public."AppConfig" TO service_role;


--
-- Name: TABLE "Appointment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Appointment" TO anon;
GRANT ALL ON TABLE public."Appointment" TO authenticated;
GRANT ALL ON TABLE public."Appointment" TO service_role;


--
-- Name: TABLE "AppointmentType"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."AppointmentType" TO anon;
GRANT ALL ON TABLE public."AppointmentType" TO authenticated;
GRANT ALL ON TABLE public."AppointmentType" TO service_role;


--
-- Name: TABLE "AttendanceComputed"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."AttendanceComputed" TO anon;
GRANT ALL ON TABLE public."AttendanceComputed" TO authenticated;
GRANT ALL ON TABLE public."AttendanceComputed" TO service_role;


--
-- Name: TABLE "AttendanceDay"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."AttendanceDay" TO anon;
GRANT ALL ON TABLE public."AttendanceDay" TO authenticated;
GRANT ALL ON TABLE public."AttendanceDay" TO service_role;


--
-- Name: TABLE "AttendanceIntegrationConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."AttendanceIntegrationConfig" TO anon;
GRANT ALL ON TABLE public."AttendanceIntegrationConfig" TO authenticated;
GRANT ALL ON TABLE public."AttendanceIntegrationConfig" TO service_role;


--
-- Name: TABLE "AuditLog"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."AuditLog" TO anon;
GRANT ALL ON TABLE public."AuditLog" TO authenticated;
GRANT ALL ON TABLE public."AuditLog" TO service_role;


--
-- Name: TABLE "B2BProposalDoc"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."B2BProposalDoc" TO anon;
GRANT ALL ON TABLE public."B2BProposalDoc" TO authenticated;
GRANT ALL ON TABLE public."B2BProposalDoc" TO service_role;


--
-- Name: TABLE "Branch"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Branch" TO anon;
GRANT ALL ON TABLE public."Branch" TO authenticated;
GRANT ALL ON TABLE public."Branch" TO service_role;


--
-- Name: TABLE "ClientProfile"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ClientProfile" TO anon;
GRANT ALL ON TABLE public."ClientProfile" TO authenticated;
GRANT ALL ON TABLE public."ClientProfile" TO service_role;


--
-- Name: TABLE "Combo"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Combo" TO anon;
GRANT ALL ON TABLE public."Combo" TO authenticated;
GRANT ALL ON TABLE public."Combo" TO service_role;


--
-- Name: TABLE "ComboProduct"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ComboProduct" TO anon;
GRANT ALL ON TABLE public."ComboProduct" TO authenticated;
GRANT ALL ON TABLE public."ComboProduct" TO service_role;


--
-- Name: TABLE "ComboService"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ComboService" TO anon;
GRANT ALL ON TABLE public."ComboService" TO authenticated;
GRANT ALL ON TABLE public."ComboService" TO service_role;


--
-- Name: TABLE "CompensationBonus"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CompensationBonus" TO anon;
GRANT ALL ON TABLE public."CompensationBonus" TO authenticated;
GRANT ALL ON TABLE public."CompensationBonus" TO service_role;


--
-- Name: TABLE "CrmAccount"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmAccount" TO anon;
GRANT ALL ON TABLE public."CrmAccount" TO authenticated;
GRANT ALL ON TABLE public."CrmAccount" TO service_role;


--
-- Name: TABLE "CrmActivity"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmActivity" TO anon;
GRANT ALL ON TABLE public."CrmActivity" TO authenticated;
GRANT ALL ON TABLE public."CrmActivity" TO service_role;


--
-- Name: TABLE "CrmCalendarEvent"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmCalendarEvent" TO anon;
GRANT ALL ON TABLE public."CrmCalendarEvent" TO authenticated;
GRANT ALL ON TABLE public."CrmCalendarEvent" TO service_role;


--
-- Name: TABLE "CrmContact"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmContact" TO anon;
GRANT ALL ON TABLE public."CrmContact" TO authenticated;
GRANT ALL ON TABLE public."CrmContact" TO service_role;


--
-- Name: TABLE "CrmDeal"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmDeal" TO anon;
GRANT ALL ON TABLE public."CrmDeal" TO authenticated;
GRANT ALL ON TABLE public."CrmDeal" TO service_role;


--
-- Name: TABLE "CrmDealServiceInterest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmDealServiceInterest" TO anon;
GRANT ALL ON TABLE public."CrmDealServiceInterest" TO authenticated;
GRANT ALL ON TABLE public."CrmDealServiceInterest" TO service_role;


--
-- Name: TABLE "CrmDealStageHistory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmDealStageHistory" TO anon;
GRANT ALL ON TABLE public."CrmDealStageHistory" TO authenticated;
GRANT ALL ON TABLE public."CrmDealStageHistory" TO service_role;


--
-- Name: TABLE "CrmLead"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmLead" TO anon;
GRANT ALL ON TABLE public."CrmLead" TO authenticated;
GRANT ALL ON TABLE public."CrmLead" TO service_role;


--
-- Name: TABLE "CrmPipeline"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmPipeline" TO anon;
GRANT ALL ON TABLE public."CrmPipeline" TO authenticated;
GRANT ALL ON TABLE public."CrmPipeline" TO service_role;


--
-- Name: TABLE "CrmPipelineStage"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmPipelineStage" TO anon;
GRANT ALL ON TABLE public."CrmPipelineStage" TO authenticated;
GRANT ALL ON TABLE public."CrmPipelineStage" TO service_role;


--
-- Name: TABLE "CrmQuote"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmQuote" TO anon;
GRANT ALL ON TABLE public."CrmQuote" TO authenticated;
GRANT ALL ON TABLE public."CrmQuote" TO service_role;


--
-- Name: TABLE "CrmQuoteItem"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmQuoteItem" TO anon;
GRANT ALL ON TABLE public."CrmQuoteItem" TO authenticated;
GRANT ALL ON TABLE public."CrmQuoteItem" TO service_role;


--
-- Name: TABLE "CrmQuoteRequest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmQuoteRequest" TO anon;
GRANT ALL ON TABLE public."CrmQuoteRequest" TO authenticated;
GRANT ALL ON TABLE public."CrmQuoteRequest" TO service_role;


--
-- Name: TABLE "CrmRequest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmRequest" TO anon;
GRANT ALL ON TABLE public."CrmRequest" TO authenticated;
GRANT ALL ON TABLE public."CrmRequest" TO service_role;


--
-- Name: TABLE "CrmTask"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."CrmTask" TO anon;
GRANT ALL ON TABLE public."CrmTask" TO authenticated;
GRANT ALL ON TABLE public."CrmTask" TO service_role;


--
-- Name: TABLE "DisciplinaryAction"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."DisciplinaryAction" TO anon;
GRANT ALL ON TABLE public."DisciplinaryAction" TO authenticated;
GRANT ALL ON TABLE public."DisciplinaryAction" TO service_role;


--
-- Name: TABLE "DisciplinaryAttachment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."DisciplinaryAttachment" TO anon;
GRANT ALL ON TABLE public."DisciplinaryAttachment" TO authenticated;
GRANT ALL ON TABLE public."DisciplinaryAttachment" TO service_role;


--
-- Name: TABLE "EmployeeBranchAssignment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeBranchAssignment" TO anon;
GRANT ALL ON TABLE public."EmployeeBranchAssignment" TO authenticated;
GRANT ALL ON TABLE public."EmployeeBranchAssignment" TO service_role;


--
-- Name: TABLE "EmployeeCompensation"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeCompensation" TO anon;
GRANT ALL ON TABLE public."EmployeeCompensation" TO authenticated;
GRANT ALL ON TABLE public."EmployeeCompensation" TO service_role;


--
-- Name: TABLE "EmployeeDocument"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeDocument" TO anon;
GRANT ALL ON TABLE public."EmployeeDocument" TO authenticated;
GRANT ALL ON TABLE public."EmployeeDocument" TO service_role;


--
-- Name: TABLE "EmployeeDocumentVersion"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeDocumentVersion" TO anon;
GRANT ALL ON TABLE public."EmployeeDocumentVersion" TO authenticated;
GRANT ALL ON TABLE public."EmployeeDocumentVersion" TO service_role;


--
-- Name: TABLE "EmployeeEngagement"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeEngagement" TO anon;
GRANT ALL ON TABLE public."EmployeeEngagement" TO authenticated;
GRANT ALL ON TABLE public."EmployeeEngagement" TO service_role;


--
-- Name: TABLE "EmployeeEvaluation"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeEvaluation" TO anon;
GRANT ALL ON TABLE public."EmployeeEvaluation" TO authenticated;
GRANT ALL ON TABLE public."EmployeeEvaluation" TO service_role;


--
-- Name: TABLE "EmployeePositionAssignment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeePositionAssignment" TO anon;
GRANT ALL ON TABLE public."EmployeePositionAssignment" TO authenticated;
GRANT ALL ON TABLE public."EmployeePositionAssignment" TO service_role;


--
-- Name: TABLE "EmployeeShiftAssignment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EmployeeShiftAssignment" TO anon;
GRANT ALL ON TABLE public."EmployeeShiftAssignment" TO authenticated;
GRANT ALL ON TABLE public."EmployeeShiftAssignment" TO service_role;


--
-- Name: TABLE "EvaluationForm"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EvaluationForm" TO anon;
GRANT ALL ON TABLE public."EvaluationForm" TO authenticated;
GRANT ALL ON TABLE public."EvaluationForm" TO service_role;


--
-- Name: TABLE "EvaluationQuestion"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."EvaluationQuestion" TO anon;
GRANT ALL ON TABLE public."EvaluationQuestion" TO authenticated;
GRANT ALL ON TABLE public."EvaluationQuestion" TO service_role;


--
-- Name: TABLE "FileAsset"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."FileAsset" TO anon;
GRANT ALL ON TABLE public."FileAsset" TO authenticated;
GRANT ALL ON TABLE public."FileAsset" TO service_role;


--
-- Name: TABLE "FinanceAttachment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."FinanceAttachment" TO anon;
GRANT ALL ON TABLE public."FinanceAttachment" TO authenticated;
GRANT ALL ON TABLE public."FinanceAttachment" TO service_role;


--
-- Name: TABLE "FinanceCategory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."FinanceCategory" TO anon;
GRANT ALL ON TABLE public."FinanceCategory" TO authenticated;
GRANT ALL ON TABLE public."FinanceCategory" TO service_role;


--
-- Name: TABLE "FinanceSubcategory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."FinanceSubcategory" TO anon;
GRANT ALL ON TABLE public."FinanceSubcategory" TO authenticated;
GRANT ALL ON TABLE public."FinanceSubcategory" TO service_role;


--
-- Name: TABLE "FinancialAccount"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."FinancialAccount" TO anon;
GRANT ALL ON TABLE public."FinancialAccount" TO authenticated;
GRANT ALL ON TABLE public."FinancialAccount" TO service_role;


--
-- Name: TABLE "FinancialTransaction"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."FinancialTransaction" TO anon;
GRANT ALL ON TABLE public."FinancialTransaction" TO authenticated;
GRANT ALL ON TABLE public."FinancialTransaction" TO service_role;


--
-- Name: TABLE "HrAttendanceEvent"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrAttendanceEvent" TO anon;
GRANT ALL ON TABLE public."HrAttendanceEvent" TO authenticated;
GRANT ALL ON TABLE public."HrAttendanceEvent" TO service_role;


--
-- Name: TABLE "HrCompensationHistory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrCompensationHistory" TO anon;
GRANT ALL ON TABLE public."HrCompensationHistory" TO authenticated;
GRANT ALL ON TABLE public."HrCompensationHistory" TO service_role;


--
-- Name: TABLE "HrDepartment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrDepartment" TO anon;
GRANT ALL ON TABLE public."HrDepartment" TO authenticated;
GRANT ALL ON TABLE public."HrDepartment" TO service_role;


--
-- Name: TABLE "HrEmployee"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrEmployee" TO anon;
GRANT ALL ON TABLE public."HrEmployee" TO authenticated;
GRANT ALL ON TABLE public."HrEmployee" TO service_role;


--
-- Name: TABLE "HrEmployeeWarning"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrEmployeeWarning" TO anon;
GRANT ALL ON TABLE public."HrEmployeeWarning" TO authenticated;
GRANT ALL ON TABLE public."HrEmployeeWarning" TO service_role;


--
-- Name: TABLE "HrPayrollLine"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrPayrollLine" TO anon;
GRANT ALL ON TABLE public."HrPayrollLine" TO authenticated;
GRANT ALL ON TABLE public."HrPayrollLine" TO service_role;


--
-- Name: TABLE "HrPayrollRun"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrPayrollRun" TO anon;
GRANT ALL ON TABLE public."HrPayrollRun" TO authenticated;
GRANT ALL ON TABLE public."HrPayrollRun" TO service_role;


--
-- Name: TABLE "HrPosition"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrPosition" TO anon;
GRANT ALL ON TABLE public."HrPosition" TO authenticated;
GRANT ALL ON TABLE public."HrPosition" TO service_role;


--
-- Name: TABLE "HrSettings"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrSettings" TO anon;
GRANT ALL ON TABLE public."HrSettings" TO authenticated;
GRANT ALL ON TABLE public."HrSettings" TO service_role;


--
-- Name: TABLE "HrWarningAttachment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."HrWarningAttachment" TO anon;
GRANT ALL ON TABLE public."HrWarningAttachment" TO authenticated;
GRANT ALL ON TABLE public."HrWarningAttachment" TO service_role;


--
-- Name: TABLE "InventoryArea"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryArea" TO anon;
GRANT ALL ON TABLE public."InventoryArea" TO authenticated;
GRANT ALL ON TABLE public."InventoryArea" TO service_role;


--
-- Name: TABLE "InventoryEmailSchedule"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryEmailSchedule" TO anon;
GRANT ALL ON TABLE public."InventoryEmailSchedule" TO authenticated;
GRANT ALL ON TABLE public."InventoryEmailSchedule" TO service_role;


--
-- Name: TABLE "InventoryEmailScheduleLog"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryEmailScheduleLog" TO anon;
GRANT ALL ON TABLE public."InventoryEmailScheduleLog" TO authenticated;
GRANT ALL ON TABLE public."InventoryEmailScheduleLog" TO service_role;


--
-- Name: TABLE "InventoryEmailSetting"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryEmailSetting" TO anon;
GRANT ALL ON TABLE public."InventoryEmailSetting" TO authenticated;
GRANT ALL ON TABLE public."InventoryEmailSetting" TO service_role;


--
-- Name: TABLE "InventoryMarginPolicy"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryMarginPolicy" TO anon;
GRANT ALL ON TABLE public."InventoryMarginPolicy" TO authenticated;
GRANT ALL ON TABLE public."InventoryMarginPolicy" TO service_role;


--
-- Name: TABLE "InventoryMovement"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryMovement" TO anon;
GRANT ALL ON TABLE public."InventoryMovement" TO authenticated;
GRANT ALL ON TABLE public."InventoryMovement" TO service_role;


--
-- Name: TABLE "InventoryReportLog"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InventoryReportLog" TO anon;
GRANT ALL ON TABLE public."InventoryReportLog" TO authenticated;
GRANT ALL ON TABLE public."InventoryReportLog" TO service_role;


--
-- Name: TABLE "InvoiceConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InvoiceConfig" TO anon;
GRANT ALL ON TABLE public."InvoiceConfig" TO authenticated;
GRANT ALL ON TABLE public."InvoiceConfig" TO service_role;


--
-- Name: TABLE "InvoiceSeries"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."InvoiceSeries" TO anon;
GRANT ALL ON TABLE public."InvoiceSeries" TO authenticated;
GRANT ALL ON TABLE public."InvoiceSeries" TO service_role;


--
-- Name: TABLE "JournalEntry"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."JournalEntry" TO anon;
GRANT ALL ON TABLE public."JournalEntry" TO authenticated;
GRANT ALL ON TABLE public."JournalEntry" TO service_role;


--
-- Name: TABLE "JournalEntryLine"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."JournalEntryLine" TO anon;
GRANT ALL ON TABLE public."JournalEntryLine" TO authenticated;
GRANT ALL ON TABLE public."JournalEntryLine" TO service_role;


--
-- Name: TABLE "LabIntegrationConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."LabIntegrationConfig" TO anon;
GRANT ALL ON TABLE public."LabIntegrationConfig" TO authenticated;
GRANT ALL ON TABLE public."LabIntegrationConfig" TO service_role;


--
-- Name: TABLE "LeaveBalance"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."LeaveBalance" TO anon;
GRANT ALL ON TABLE public."LeaveBalance" TO authenticated;
GRANT ALL ON TABLE public."LeaveBalance" TO service_role;


--
-- Name: TABLE "LeavePolicy"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."LeavePolicy" TO anon;
GRANT ALL ON TABLE public."LeavePolicy" TO authenticated;
GRANT ALL ON TABLE public."LeavePolicy" TO service_role;


--
-- Name: TABLE "LeaveRequest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."LeaveRequest" TO anon;
GRANT ALL ON TABLE public."LeaveRequest" TO authenticated;
GRANT ALL ON TABLE public."LeaveRequest" TO service_role;


--
-- Name: TABLE "LegalEntity"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."LegalEntity" TO anon;
GRANT ALL ON TABLE public."LegalEntity" TO authenticated;
GRANT ALL ON TABLE public."LegalEntity" TO service_role;


--
-- Name: TABLE "MailGlobalConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MailGlobalConfig" TO anon;
GRANT ALL ON TABLE public."MailGlobalConfig" TO authenticated;
GRANT ALL ON TABLE public."MailGlobalConfig" TO service_role;


--
-- Name: TABLE "MailModuleAccount"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MailModuleAccount" TO anon;
GRANT ALL ON TABLE public."MailModuleAccount" TO authenticated;
GRANT ALL ON TABLE public."MailModuleAccount" TO service_role;


--
-- Name: TABLE "MembershipBenefit"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipBenefit" TO anon;
GRANT ALL ON TABLE public."MembershipBenefit" TO authenticated;
GRANT ALL ON TABLE public."MembershipBenefit" TO service_role;


--
-- Name: TABLE "MembershipConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipConfig" TO anon;
GRANT ALL ON TABLE public."MembershipConfig" TO authenticated;
GRANT ALL ON TABLE public."MembershipConfig" TO service_role;


--
-- Name: SEQUENCE membership_contract_code_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.membership_contract_code_seq TO anon;
GRANT ALL ON SEQUENCE public.membership_contract_code_seq TO authenticated;
GRANT ALL ON SEQUENCE public.membership_contract_code_seq TO service_role;


--
-- Name: TABLE "MembershipContract"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipContract" TO anon;
GRANT ALL ON TABLE public."MembershipContract" TO authenticated;
GRANT ALL ON TABLE public."MembershipContract" TO service_role;


--
-- Name: TABLE "MembershipDependent"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipDependent" TO anon;
GRANT ALL ON TABLE public."MembershipDependent" TO authenticated;
GRANT ALL ON TABLE public."MembershipDependent" TO service_role;


--
-- Name: TABLE "MembershipException"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipException" TO anon;
GRANT ALL ON TABLE public."MembershipException" TO authenticated;
GRANT ALL ON TABLE public."MembershipException" TO service_role;


--
-- Name: TABLE "MembershipPayment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipPayment" TO anon;
GRANT ALL ON TABLE public."MembershipPayment" TO authenticated;
GRANT ALL ON TABLE public."MembershipPayment" TO service_role;


--
-- Name: TABLE "MembershipPlan"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipPlan" TO anon;
GRANT ALL ON TABLE public."MembershipPlan" TO authenticated;
GRANT ALL ON TABLE public."MembershipPlan" TO service_role;


--
-- Name: TABLE "MembershipUsage"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."MembershipUsage" TO anon;
GRANT ALL ON TABLE public."MembershipUsage" TO authenticated;
GRANT ALL ON TABLE public."MembershipUsage" TO service_role;


--
-- Name: TABLE "Notification"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Notification" TO anon;
GRANT ALL ON TABLE public."Notification" TO authenticated;
GRANT ALL ON TABLE public."Notification" TO service_role;


--
-- Name: TABLE "NotificationOutbox"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."NotificationOutbox" TO anon;
GRANT ALL ON TABLE public."NotificationOutbox" TO authenticated;
GRANT ALL ON TABLE public."NotificationOutbox" TO service_role;


--
-- Name: TABLE "OvertimeRequest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."OvertimeRequest" TO anon;
GRANT ALL ON TABLE public."OvertimeRequest" TO authenticated;
GRANT ALL ON TABLE public."OvertimeRequest" TO service_role;


--
-- Name: TABLE "Party"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Party" TO anon;
GRANT ALL ON TABLE public."Party" TO authenticated;
GRANT ALL ON TABLE public."Party" TO service_role;


--
-- Name: TABLE "Payable"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Payable" TO anon;
GRANT ALL ON TABLE public."Payable" TO authenticated;
GRANT ALL ON TABLE public."Payable" TO service_role;


--
-- Name: TABLE "Payment"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Payment" TO anon;
GRANT ALL ON TABLE public."Payment" TO authenticated;
GRANT ALL ON TABLE public."Payment" TO service_role;


--
-- Name: TABLE "PayrollConcept"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PayrollConcept" TO anon;
GRANT ALL ON TABLE public."PayrollConcept" TO authenticated;
GRANT ALL ON TABLE public."PayrollConcept" TO service_role;


--
-- Name: TABLE "PayrollEmployee"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PayrollEmployee" TO anon;
GRANT ALL ON TABLE public."PayrollEmployee" TO authenticated;
GRANT ALL ON TABLE public."PayrollEmployee" TO service_role;


--
-- Name: TABLE "PayrollEmployeeConcept"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PayrollEmployeeConcept" TO anon;
GRANT ALL ON TABLE public."PayrollEmployeeConcept" TO authenticated;
GRANT ALL ON TABLE public."PayrollEmployeeConcept" TO service_role;


--
-- Name: TABLE "PayrollFinanceRecord"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PayrollFinanceRecord" TO anon;
GRANT ALL ON TABLE public."PayrollFinanceRecord" TO authenticated;
GRANT ALL ON TABLE public."PayrollFinanceRecord" TO service_role;


--
-- Name: TABLE "PayrollRun"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PayrollRun" TO anon;
GRANT ALL ON TABLE public."PayrollRun" TO authenticated;
GRANT ALL ON TABLE public."PayrollRun" TO service_role;


--
-- Name: TABLE "PayrollRunEntry"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PayrollRunEntry" TO anon;
GRANT ALL ON TABLE public."PayrollRunEntry" TO authenticated;
GRANT ALL ON TABLE public."PayrollRunEntry" TO service_role;


--
-- Name: TABLE "Permission"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Permission" TO anon;
GRANT ALL ON TABLE public."Permission" TO authenticated;
GRANT ALL ON TABLE public."Permission" TO service_role;


--
-- Name: TABLE "PipelineConfig"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PipelineConfig" TO anon;
GRANT ALL ON TABLE public."PipelineConfig" TO authenticated;
GRANT ALL ON TABLE public."PipelineConfig" TO service_role;


--
-- Name: TABLE "PipelineRule"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PipelineRule" TO anon;
GRANT ALL ON TABLE public."PipelineRule" TO authenticated;
GRANT ALL ON TABLE public."PipelineRule" TO service_role;


--
-- Name: TABLE "PipelineRuleSet"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PipelineRuleSet" TO anon;
GRANT ALL ON TABLE public."PipelineRuleSet" TO authenticated;
GRANT ALL ON TABLE public."PipelineRuleSet" TO service_role;


--
-- Name: TABLE "PipelineStage"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PipelineStage" TO anon;
GRANT ALL ON TABLE public."PipelineStage" TO authenticated;
GRANT ALL ON TABLE public."PipelineStage" TO service_role;


--
-- Name: TABLE "PipelineTransition"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PipelineTransition" TO anon;
GRANT ALL ON TABLE public."PipelineTransition" TO authenticated;
GRANT ALL ON TABLE public."PipelineTransition" TO service_role;


--
-- Name: TABLE "PriceList"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PriceList" TO anon;
GRANT ALL ON TABLE public."PriceList" TO authenticated;
GRANT ALL ON TABLE public."PriceList" TO service_role;


--
-- Name: TABLE "PriceListItem"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PriceListItem" TO anon;
GRANT ALL ON TABLE public."PriceListItem" TO authenticated;
GRANT ALL ON TABLE public."PriceListItem" TO service_role;


--
-- Name: TABLE "Product"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Product" TO anon;
GRANT ALL ON TABLE public."Product" TO authenticated;
GRANT ALL ON TABLE public."Product" TO service_role;


--
-- Name: TABLE "ProductCategory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ProductCategory" TO anon;
GRANT ALL ON TABLE public."ProductCategory" TO authenticated;
GRANT ALL ON TABLE public."ProductCategory" TO service_role;


--
-- Name: TABLE "ProductStock"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ProductStock" TO anon;
GRANT ALL ON TABLE public."ProductStock" TO authenticated;
GRANT ALL ON TABLE public."ProductStock" TO service_role;


--
-- Name: TABLE "ProductSubcategory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ProductSubcategory" TO anon;
GRANT ALL ON TABLE public."ProductSubcategory" TO authenticated;
GRANT ALL ON TABLE public."ProductSubcategory" TO service_role;


--
-- Name: TABLE "ProfessionalLicense"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ProfessionalLicense" TO anon;
GRANT ALL ON TABLE public."ProfessionalLicense" TO authenticated;
GRANT ALL ON TABLE public."ProfessionalLicense" TO service_role;


--
-- Name: TABLE "PurchaseOrder"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PurchaseOrder" TO anon;
GRANT ALL ON TABLE public."PurchaseOrder" TO authenticated;
GRANT ALL ON TABLE public."PurchaseOrder" TO service_role;


--
-- Name: TABLE "PurchaseOrderItem"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PurchaseOrderItem" TO anon;
GRANT ALL ON TABLE public."PurchaseOrderItem" TO authenticated;
GRANT ALL ON TABLE public."PurchaseOrderItem" TO service_role;


--
-- Name: TABLE "PurchaseRequest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PurchaseRequest" TO anon;
GRANT ALL ON TABLE public."PurchaseRequest" TO authenticated;
GRANT ALL ON TABLE public."PurchaseRequest" TO service_role;


--
-- Name: TABLE "PurchaseRequestItem"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."PurchaseRequestItem" TO anon;
GRANT ALL ON TABLE public."PurchaseRequestItem" TO authenticated;
GRANT ALL ON TABLE public."PurchaseRequestItem" TO service_role;


--
-- Name: TABLE "Quote"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Quote" TO anon;
GRANT ALL ON TABLE public."Quote" TO authenticated;
GRANT ALL ON TABLE public."Quote" TO service_role;


--
-- Name: TABLE "QuoteDelivery"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."QuoteDelivery" TO anon;
GRANT ALL ON TABLE public."QuoteDelivery" TO authenticated;
GRANT ALL ON TABLE public."QuoteDelivery" TO service_role;


--
-- Name: TABLE "QuoteItem"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."QuoteItem" TO anon;
GRANT ALL ON TABLE public."QuoteItem" TO authenticated;
GRANT ALL ON TABLE public."QuoteItem" TO service_role;


--
-- Name: TABLE "QuoteRequest"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."QuoteRequest" TO anon;
GRANT ALL ON TABLE public."QuoteRequest" TO authenticated;
GRANT ALL ON TABLE public."QuoteRequest" TO service_role;


--
-- Name: TABLE "QuoteSettings"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."QuoteSettings" TO anon;
GRANT ALL ON TABLE public."QuoteSettings" TO authenticated;
GRANT ALL ON TABLE public."QuoteSettings" TO service_role;


--
-- Name: TABLE "QuoteTemplate"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."QuoteTemplate" TO anon;
GRANT ALL ON TABLE public."QuoteTemplate" TO authenticated;
GRANT ALL ON TABLE public."QuoteTemplate" TO service_role;


--
-- Name: TABLE "Receivable"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Receivable" TO anon;
GRANT ALL ON TABLE public."Receivable" TO authenticated;
GRANT ALL ON TABLE public."Receivable" TO service_role;


--
-- Name: TABLE "Role"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Role" TO anon;
GRANT ALL ON TABLE public."Role" TO authenticated;
GRANT ALL ON TABLE public."Role" TO service_role;


--
-- Name: TABLE "RolePermission"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."RolePermission" TO anon;
GRANT ALL ON TABLE public."RolePermission" TO authenticated;
GRANT ALL ON TABLE public."RolePermission" TO service_role;


--
-- Name: TABLE "Room"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Room" TO anon;
GRANT ALL ON TABLE public."Room" TO authenticated;
GRANT ALL ON TABLE public."Room" TO service_role;


--
-- Name: TABLE "RuleEvaluationLog"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."RuleEvaluationLog" TO anon;
GRANT ALL ON TABLE public."RuleEvaluationLog" TO authenticated;
GRANT ALL ON TABLE public."RuleEvaluationLog" TO service_role;


--
-- Name: TABLE "SequenceCounter"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."SequenceCounter" TO anon;
GRANT ALL ON TABLE public."SequenceCounter" TO authenticated;
GRANT ALL ON TABLE public."SequenceCounter" TO service_role;


--
-- Name: TABLE "Service"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."Service" TO anon;
GRANT ALL ON TABLE public."Service" TO authenticated;
GRANT ALL ON TABLE public."Service" TO service_role;


--
-- Name: TABLE "ServiceCategory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ServiceCategory" TO anon;
GRANT ALL ON TABLE public."ServiceCategory" TO authenticated;
GRANT ALL ON TABLE public."ServiceCategory" TO service_role;


--
-- Name: TABLE "ServiceSubcategory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ServiceSubcategory" TO anon;
GRANT ALL ON TABLE public."ServiceSubcategory" TO authenticated;
GRANT ALL ON TABLE public."ServiceSubcategory" TO service_role;


--
-- Name: TABLE "ShiftTemplate"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."ShiftTemplate" TO anon;
GRANT ALL ON TABLE public."ShiftTemplate" TO authenticated;
GRANT ALL ON TABLE public."ShiftTemplate" TO service_role;


--
-- Name: TABLE "TimeClockDevice"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."TimeClockDevice" TO anon;
GRANT ALL ON TABLE public."TimeClockDevice" TO authenticated;
GRANT ALL ON TABLE public."TimeClockDevice" TO service_role;


--
-- Name: TABLE "TimeClockLog"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."TimeClockLog" TO anon;
GRANT ALL ON TABLE public."TimeClockLog" TO authenticated;
GRANT ALL ON TABLE public."TimeClockLog" TO service_role;


--
-- Name: TABLE "User"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."User" TO anon;
GRANT ALL ON TABLE public."User" TO authenticated;
GRANT ALL ON TABLE public."User" TO service_role;


--
-- Name: TABLE "UserPermission"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."UserPermission" TO anon;
GRANT ALL ON TABLE public."UserPermission" TO authenticated;
GRANT ALL ON TABLE public."UserPermission" TO service_role;


--
-- Name: TABLE "UserRole"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."UserRole" TO anon;
GRANT ALL ON TABLE public."UserRole" TO authenticated;
GRANT ALL ON TABLE public."UserRole" TO service_role;


--
-- Name: TABLE "WorkSchedule"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public."WorkSchedule" TO anon;
GRANT ALL ON TABLE public."WorkSchedule" TO authenticated;
GRANT ALL ON TABLE public."WorkSchedule" TO service_role;


--
-- Name: TABLE _prisma_migrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public._prisma_migrations TO anon;
GRANT ALL ON TABLE public._prisma_migrations TO authenticated;
GRANT ALL ON TABLE public._prisma_migrations TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict bKz9eVB1WRAQlu7TB0wv1dv8sVT4BRq9bzinB2ABfJgOy9aUkpURTVB0JyraSIL

