-- CreateEnum
CREATE TYPE "UserPermissionEffect" AS ENUM ('GRANT', 'DENY');

-- CreateEnum
CREATE TYPE "DiagnosticOrderStatus" AS ENUM ('DRAFT', 'PAID', 'IN_PROGRESS', 'READY', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiagnosticOrderSourceType" AS ENUM ('WALK_IN', 'CONSULTA');

-- CreateEnum
CREATE TYPE "DiagnosticItemKind" AS ENUM ('LAB', 'IMAGING');

-- CreateEnum
CREATE TYPE "DiagnosticItemStatus" AS ENUM ('ORDERED', 'COLLECTED', 'IN_ANALYSIS', 'PENDING_VALIDATION', 'VALIDATED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('XR', 'US', 'CT', 'MR');

-- CreateEnum
CREATE TYPE "LabResultFlag" AS ENUM ('NORMAL', 'HIGH', 'LOW', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SIGNED', 'RELEASED');

-- Sequences required by default expressions
CREATE SEQUENCE IF NOT EXISTS membership_contract_code_seq START WITH 1 INCREMENT BY 1 MINVALUE 1;

-- CreateEnum
CREATE TYPE "IntegrationInboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'EN_SALA', 'ATENDIDA', 'NO_SHOW', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PAGADO', 'FACTURADO');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CLIENT', 'PROVIDER', 'PROFESSIONAL', 'INSURER', 'OTHER');

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED_PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED_PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "InventoryReportType" AS ENUM ('KARDEX', 'MOVIMIENTOS', 'CIERRE_SAT');

-- CreateEnum
CREATE TYPE "MailModuleKey" AS ENUM ('INVENTARIO', 'AGENDA', 'FACTURACION', 'CONTABILIDAD', 'COMPRAS', 'ADMIN', 'SOPORTE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'POS');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CreditTerm" AS ENUM ('CASH', 'DAYS_15', 'DAYS_30', 'DAYS_45', 'DAYS_60', 'DAYS_90', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceEntityType" AS ENUM ('CLIENT', 'PROVIDER', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('AR', 'AP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "CrmPipelineType" AS ENUM ('B2B', 'B2C');

-- CreateEnum
CREATE TYPE "CrmSlaStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "CrmDealStage" AS ENUM ('NUEVO', 'CONTACTADO', 'DIAGNOSTICO', 'COTIZACION', 'NEGOCIACION', 'GANADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'NOTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CrmPreferredChannel" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'VIDEO');

-- CreateEnum
CREATE TYPE "CrmServiceType" AS ENUM ('BOTIQUINES', 'EXTINTORES', 'CAPACITACIONES', 'CLINICAS_EMPRESARIALES', 'SSO', 'SERVICIOS_MEDICOS', 'CONSULTAS', 'LABORATORIO', 'RAYOS_X', 'ULTRASONIDO', 'MEMBRESIAS');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrmTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuoteType" AS ENUM ('B2B', 'B2C');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "B2BProposalStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrmQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'WON');

-- CreateEnum
CREATE TYPE "CrmQuoteItemType" AS ENUM ('PRODUCT', 'SERVICE', 'COMBO', 'MANUAL');

-- CreateEnum
CREATE TYPE "CrmLeadType" AS ENUM ('COMPANY', 'PATIENT');

-- CreateEnum
CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'QUOTED', 'FOLLOW_UP', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CrmCalendarEventType" AS ENUM ('VISITA', 'REUNION_VIRTUAL', 'LLAMADA', 'SEGUIMIENTO');

-- CreateEnum
CREATE TYPE "CrmRequestStatus" AS ENUM ('PENDIENTE', 'COTIZADA');

-- CreateEnum
CREATE TYPE "ClientProfileType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "ApiIntegrationKey" AS ENUM ('WHATSAPP', 'SMS', 'LABORATORIO', 'ASISTENCIA', 'SAT_FACTURACION', 'GOOGLE_DRIVE', 'OPENAI', 'WEBHOOKS', 'OTRO');

-- CreateEnum
CREATE TYPE "PipelineRuleScope" AS ENUM ('PIPELINE', 'STAGE', 'TRANSITION');

-- CreateEnum
CREATE TYPE "PipelineRuleType" AS ENUM ('REQUIRED_FIELDS', 'REQUIRED_NEXT_ACTION', 'REQUIRE_QUOTE_STATUS', 'DISALLOW_STAGE_FOR_PIPELINE', 'REQUIRE_CONTRACT_OR_COLLECTION_PLAN', 'REQUIRE_REASON_ON_LOST', 'AMOUNT_APPROVAL_THRESHOLD');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('BLOCK', 'WARN');

-- CreateEnum
CREATE TYPE "QuoteDeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "QuoteDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'PENDING_PROVIDER');

-- CreateEnum
CREATE TYPE "HrEmploymentType" AS ENUM ('DEPENDENCIA', 'HONORARIOS', 'OUTSOURCING', 'TEMPORAL', 'PRACTICAS');

-- CreateEnum
CREATE TYPE "HrEmployeeStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTIVE');

-- CreateEnum
CREATE TYPE "HrEmployeeDocumentType" AS ENUM ('DPI', 'RTU', 'CV', 'RENAS', 'POLICIACOS', 'RECIBO_SERVICIO', 'CONTRATO', 'SANCION', 'PERMISO', 'OTRO');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_EXPIRY', 'LICENSE_EXPIRY', 'CONTRACT_EXPIRY');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PayrollRunType" AS ENUM ('REGULAR', 'EXTRA');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('PENDING', 'PAID', 'SIGNED');

-- CreateEnum
CREATE TYPE "PayrollConceptType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT', 'COST_UPDATE', 'PRICE_UPDATE');

-- CreateEnum
CREATE TYPE "AttendanceColor" AS ENUM ('GREEN', 'ORANGE', 'RED');

-- CreateEnum
CREATE TYPE "AttendanceCloseStatus" AS ENUM ('OPEN', 'READY_TO_CLOSE', 'CLOSED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NORMAL', 'TARDY', 'ABSENT');

-- CreateEnum
CREATE TYPE "AttendanceProcessedStatus" AS ENUM ('OK', 'MISSING_PUNCH', 'OUT_OF_ZONE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AttendanceRawEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN');

-- CreateEnum
CREATE TYPE "AttendanceRawEventSource" AS ENUM ('SELFIE_WEB', 'BIOMETRIC', 'MANUAL_IMPORT', 'KIOSK', 'API');

-- CreateEnum
CREATE TYPE "AttendanceRawEventStatus" AS ENUM ('NEW', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceRecordSource" AS ENUM ('MANUAL', 'KIOSK', 'IMPORT', 'AI');

-- CreateEnum
CREATE TYPE "AttendanceNotificationType" AS ENUM ('EMPLOYEE_CONFIRMATION', 'ADMIN_ALERT');

-- CreateEnum
CREATE TYPE "AttendanceNotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceNotificationProvider" AS ENUM ('SMTP', 'RESEND', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceZoneStatus" AS ENUM ('IN_ZONE', 'OUT_OF_ZONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttendanceFaceStatus" AS ENUM ('VERIFIED', 'MISMATCH', 'NO_REFERENCE', 'LOW_CONFIDENCE');

-- CreateEnum
CREATE TYPE "AttendanceIncidentType" AS ENUM ('MISSING_PUNCH', 'OUT_OF_ZONE', 'FACE_MISMATCH', 'SEQUENCE_ERROR', 'MANUAL_REVIEW', 'LATE', 'OVERTIME_UNAUTHORIZED');

-- CreateEnum
CREATE TYPE "AttendanceIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AttendanceLivenessLevel" AS ENUM ('OFF', 'BASIC', 'PROVIDER');

-- CreateEnum
CREATE TYPE "OvertimeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisciplinaryActionType" AS ENUM ('LLAMADA_ATENCION', 'AMONESTACION', 'SUSPENSION', 'TERMINACION_RECOMENDADA', 'TERMINACION');

-- CreateEnum
CREATE TYPE "DisciplinaryActionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluationQuestionType" AS ENUM ('TEXT', 'MULTIPLE', 'SCALE');

-- CreateEnum
CREATE TYPE "HrDocumentVisibility" AS ENUM ('PERSONAL', 'EMPRESA', 'RESTRINGIDO');

-- CreateEnum
CREATE TYPE "HrPaymentScheme" AS ENUM ('MONTHLY', 'DAILY', 'PER_SERVICE', 'HOURLY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('VACACIONES', 'INCAPACIDAD', 'PERMISO');

-- CreateEnum
CREATE TYPE "MembershipActionOnExceed" AS ENUM ('PREFERENTIAL_PRICE');

-- CreateEnum
CREATE TYPE "MembershipBenefitFrequency" AS ENUM ('ONCE', 'MONTH', 'YEAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MembershipBenefitKind" AS ENUM ('DISCOUNT', 'SERVICE', 'PRODUCT', 'COMBO', 'CATEGORY');

-- CreateEnum
CREATE TYPE "MembershipBenefitTargetType" AS ENUM ('CONSULTA', 'LAB', 'IMAGEN', 'FARMACIA', 'OTRO');

-- CreateEnum
CREATE TYPE "MembershipBillingFrequency" AS ENUM ('MONTHLY', 'ANNUAL', 'SEMIANNUAL', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "MembershipBranchScope" AS ENUM ('ALL', 'SOME', 'AUTHORIZED');

-- CreateEnum
CREATE TYPE "MembershipOwnerType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "MembershipPaymentKind" AS ENUM ('INITIAL', 'RENEWAL', 'EXTRA');

-- CreateEnum
CREATE TYPE "MembershipPaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD');

-- CreateEnum
CREATE TYPE "MembershipPaymentStatus" AS ENUM ('PAID', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "MembershipPlanType" AS ENUM ('INDIVIDUAL', 'FAMILIAR', 'EMPRESARIAL');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVO', 'PENDIENTE', 'SUSPENDIDO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MembershipUsageModule" AS ENUM ('CONSULTA', 'LAB', 'IMAGEN', 'FARMACIA', 'CAJA');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "TimeClockLogSource" AS ENUM ('BIOMETRIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "TimeClockLogType" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "dpi" TEXT,
    "jobRoleId" TEXT,
    "departmentId" TEXT,
    "municipalityId" TEXT,
    "housingSector" TEXT,
    "addressLine" TEXT,
    "addressReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "availability" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "weekdays" TEXT[],
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',

    CONSTRAINT "ProductSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',

    CONSTRAINT "ServiceSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isExternal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InventoryArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "roomId" TEXT,
    "typeId" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "companyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "inventoryAreaId" TEXT,
    "unit" TEXT,
    "cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "price" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avgCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "baseSalePrice" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "marginPct" DOUBLE PRECISION,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "marginPct" DOUBLE PRECISION,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER,
    "unitCost" DECIMAL(12,4),
    "salePrice" DECIMAL(12,4),
    "reference" TEXT,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitId" TEXT,
    "supplierId" TEXT,
    "notes" TEXT,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "requestId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2),
    "receivedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceFinal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "costProductsTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "costCalculated" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboService" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ComboService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboProduct" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,4),

    CONSTRAINT "ComboProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEmailSetting" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "InventoryReportFrequency" NOT NULL,
    "branchId" TEXT,
    "recipients" TEXT NOT NULL,
    "includeAllProducts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "reportType" "InventoryReportType" NOT NULL DEFAULT 'KARDEX',
    "biweeklyMode" TEXT DEFAULT 'FIXED_DAYS',
    "fixedDays" TEXT,
    "monthlyDay" INTEGER,
    "recipientsJson" TEXT NOT NULL DEFAULT '[]',
    "scheduleType" TEXT NOT NULL DEFAULT 'BIWEEKLY',
    "sendTime" TEXT NOT NULL DEFAULT '23:30',
    "startDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "useLastDay" BOOLEAN DEFAULT true,
    "oneTimeDate" TIMESTAMP(3),
    "oneTimeTime" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "InventoryEmailSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEmailSchedule" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportType" "InventoryReportType" NOT NULL DEFAULT 'KARDEX',
    "branchId" TEXT,
    "scheduleType" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "sendTime" TEXT NOT NULL DEFAULT '23:30',
    "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "oneTimeDate" TIMESTAMP(3),
    "monthlyDay" INTEGER,
    "useLastDay" BOOLEAN DEFAULT true,
    "biweeklyMode" TEXT DEFAULT 'FIXED_DAYS',
    "fixedDays" TEXT,
    "startDate" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryEmailSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEmailScheduleLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "reportType" "InventoryReportType" NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "error" TEXT,

    CONSTRAINT "InventoryEmailScheduleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailGlobalConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailGlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailModuleAccount" (
    "id" TEXT NOT NULL,
    "moduleKey" "MailModuleKey" NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestAt" TIMESTAMP(3),
    "lastTestError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailModuleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyNit" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brandColor" TEXT,
    "openingHours" JSONB,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceConfig" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "fiscalAddress" TEXT,
    "defaultTaxRate" INTEGER NOT NULL DEFAULT 12,
    "invoiceFooterText" TEXT,
    "pdfTemplateConfig" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSeries" (
    "id" TEXT NOT NULL,
    "invoiceConfigId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialNumber" INTEGER NOT NULL DEFAULT 1,
    "currentNumber" INTEGER NOT NULL DEFAULT 1,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "legalEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'GENERAL',
    "area" TEXT NOT NULL DEFAULT 'CORE',
    "action" TEXT NOT NULL DEFAULT 'READ',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "effect" "UserPermissionEffect" NOT NULL,
    "reason" TEXT,
    "legalEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceIntegrationConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiUrl" TEXT,
    "apiKeyEnc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestAt" TIMESTAMP(3),
    "lastTestError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceIntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabIntegrationConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiUrl" TEXT,
    "apiKeyEnc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestAt" TIMESTAMP(3),
    "lastTestError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabIntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIntegrationConfig" (
    "id" TEXT NOT NULL,
    "key" "ApiIntegrationKey" NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT,
    "apiKeyEnc" TEXT,
    "apiSecretEnc" TEXT,
    "tokenEnc" TEXT,
    "extraJson" TEXT,
    "lastTestAt" TIMESTAMP(3),
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comercialName" TEXT,
    "nit" TEXT,
    "fiscalAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "flowType" "FlowType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAttachment" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "receivableId" TEXT,
    "payableId" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "FinanceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "branchId" TEXT,
    "createdById" TEXT NOT NULL,
    "totalDebit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalEntityId" TEXT,
    "sourceId" TEXT,
    "sourceType" TEXT,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "memo" TEXT,
    "entityType" "FinanceEntityType",
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "legalEntityId" TEXT NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,
    "creditTerm" "CreditTerm" NOT NULL DEFAULT 'CASH',
    "legalEntityId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payable" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "receivableId" TEXT,
    "payableId" TEXT,
    "financialAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legalEntityId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMarginPolicy" (
    "id" TEXT NOT NULL,
    "marginProductsPct" DOUBLE PRECISION,
    "marginServicesPct" DOUBLE PRECISION,
    "roundingMode" TEXT NOT NULL DEFAULT 'NONE',
    "autoApplyOnCreate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMarginPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReportLog" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "reportType" "InventoryReportType" NOT NULL,

    CONSTRAINT "InventoryReportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "clientId" TEXT,
    "companyName" TEXT,
    "leadType" "CrmLeadType" NOT NULL,
    "nextActionAt" TIMESTAMP(3),
    "nit" TEXT,
    "ownerId" TEXT,
    "personDpi" TEXT,
    "personName" TEXT,
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "type" "ClientProfileType" NOT NULL,
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "nit" TEXT,
    "dpi" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "address" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "creditTerm" TEXT,
    "nit" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "CrmAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "position" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERSON',
    "phonesJson" JSONB,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPipeline" (
    "id" TEXT NOT NULL,
    "type" "CrmPipelineType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CrmPipelineType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "slaDays" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineTransition" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "fromStageKey" TEXT NOT NULL,
    "toStageKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRuleSet" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "scope" "PipelineRuleScope" NOT NULL,
    "stageKey" TEXT,
    "fromStageKey" TEXT,
    "toStageKey" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "type" "PipelineRuleType" NOT NULL,
    "severity" "RuleSeverity" NOT NULL DEFAULT 'BLOCK',
    "message" TEXT NOT NULL,
    "params" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEvaluationLog" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStageKey" TEXT,
    "toStageKey" TEXT,
    "allowed" BOOLEAN NOT NULL,
    "errors" JSONB,
    "warnings" JSONB,
    "evaluatedRules" JSONB,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleEvaluationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "stage" "CrmDealStage" NOT NULL,
    "probabilityPct" INTEGER NOT NULL,
    "slaDays" INTEGER NOT NULL,
    "expectedActions" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDeal" (
    "id" TEXT NOT NULL,
    "pipelineType" "CrmPipelineType" NOT NULL,
    "ownerId" TEXT,
    "accountId" TEXT,
    "contactId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amountEstimated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "lostReason" TEXT,
    "probabilityPct" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "stage" "CrmDealStage" NOT NULL DEFAULT 'NUEVO',
    "competitor" TEXT,
    "nextAction" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "pipelineId" TEXT,
    "slaStatus" "CrmSlaStatus" NOT NULL DEFAULT 'GREEN',
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedById" TEXT NOT NULL DEFAULT 'Ventas',
    "preferredAt" TIMESTAMP(3),
    "preferredChannel" "CrmPreferredChannel",
    "servicesOtherNote" TEXT,
    "branchId" TEXT,
    "ownerUserId" TEXT,

    CONSTRAINT "CrmDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDealStageHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" "CrmDealStage",
    "toStage" "CrmDealStage" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "comment" TEXT,

    CONSTRAINT "CrmDealStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDealServiceInterest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "serviceType" "CrmServiceType" NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "CrmDealServiceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "accountId" TEXT,
    "contactId" TEXT,
    "type" "CrmActivityType" NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nextStepDateTime" TIMESTAMP(3),
    "summary" TEXT,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTask" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "dealId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CrmTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "quoteNumber" INTEGER NOT NULL,
    "status" "CrmQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "internalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "internalMargin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "versionLabel" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedReason" TEXT,

    CONSTRAINT "CrmQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "itemType" "CrmQuoteItemType" NOT NULL,
    "itemId" TEXT,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "costTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountPct" INTEGER,
    "manualDescription" TEXT,
    "manualUnitPrice" DECIMAL(12,2),

    CONSTRAINT "CrmQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "services" "CrmServiceType"[],
    "description" TEXT NOT NULL,
    "status" "CrmRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuoteRequest" (
    "quoteId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "CrmQuoteRequest_pkey" PRIMARY KEY ("quoteId","requestId")
);

-- CreateTable
CREATE TABLE "CrmCalendarEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "quoteId" TEXT,
    "type" "CrmCalendarEventType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealId" TEXT,

    CONSTRAINT "CrmCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BProposalDoc" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "sequenceYear" INTEGER NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "sequenceLabel" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "B2BProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "contentJson" JSONB,
    "contentText" TEXT,
    "totalDeclared" DECIMAL(14,2),
    "lastPdfFileAssetId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BProposalDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "QuoteType" NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "sentAt" TIMESTAMP(3),
    "approvalRequestedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "templateId" TEXT,
    "notes" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chequePayableTo" TEXT,
    "deliveryNote" TEXT,
    "deliveryTime" TEXT,
    "paymentTerms" TEXT,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "refCode" TEXT,
    "description" TEXT,
    "qty" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "enlace" TEXT,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "QuoteType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sectionsJson" JSONB,
    "headerJson" JSONB,
    "coverImageUrl" TEXT,
    "introLetterHtml" TEXT,
    "experienceLogosJson" JSONB,
    "termsHtml" TEXT,
    "bankAccountsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultTemplateB2BId" TEXT,
    "defaultTemplateB2CId" TEXT,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "defaultIntroLetterHtml" TEXT,
    "defaultTermsB2BHtml" TEXT,
    "defaultTermsB2CHtml" TEXT,
    "defaultFooterJson" JSONB,
    "defaultBankAccountsJson" JSONB,
    "defaultChequePayableTo" TEXT,
    "defaultPaymentTerms" TEXT,
    "defaultDeliveryTime" TEXT,
    "defaultDeliveryNote" TEXT,
    "showTaxIncludedText" BOOLEAN NOT NULL DEFAULT true,
    "showBankBlock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "services" "CrmServiceType"[],
    "description" TEXT NOT NULL,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "quoteId" TEXT,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "originalName" TEXT,
    "dealId" TEXT,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteDelivery" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "dealId" TEXT,
    "channel" "QuoteDeliveryChannel" NOT NULL,
    "to" JSONB NOT NULL,
    "cc" JSONB,
    "bcc" JSONB,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "pdfVersion" INTEGER NOT NULL DEFAULT 1,
    "fileAssetId" TEXT,
    "status" "QuoteDeliveryStatus" NOT NULL DEFAULT 'SENDING',
    "provider" TEXT NOT NULL DEFAULT 'SMTP',
    "providerMessageId" TEXT,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "code" TEXT,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "currencyCode" TEXT NOT NULL DEFAULT 'GTQ',
    "warningWindowDays" INTEGER,
    "warningThreshold" INTEGER,
    "logoUrl" TEXT,
    "logoFileKey" TEXT,
    "attendanceEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attendanceAdminRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoSafetyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "openaiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "openaiApiKeyEnc" TEXT,
    "defaultTimezone" TEXT DEFAULT 'America/Guatemala',
    "attendanceStartTime" TEXT DEFAULT '08:00',
    "attendanceLateToleranceMinutes" INTEGER DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrEmployee" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "dpi" TEXT,
    "nit" TEXT,
    "email" TEXT,
    "biometricId" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "status" "HrEmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dpiPhotoUrl" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "homePhone" TEXT,
    "personalEmail" TEXT,
    "photoUrl" TEXT,
    "primaryLegalEntityId" TEXT,
    "residenceProofUrl" TEXT,
    "rtuFileUrl" TEXT,
    "userId" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "HrEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationBonus" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "engagementId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompensationBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEngagement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "employmentType" "HrEmploymentType" NOT NULL,
    "status" "HrEmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPayrollEligible" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "compensationAmount" DECIMAL(12,2),
    "compensationCurrency" TEXT NOT NULL DEFAULT 'GTQ',
    "compensationFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "compensationNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baseSalary" DECIMAL(12,2),
    "baseAllowance" DECIMAL(12,2),
    "paymentScheme" "HrPaymentScheme" NOT NULL DEFAULT 'MONTHLY',

    CONSTRAINT "EmployeeEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrCompensationHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevSalary" DECIMAL(12,2),
    "newSalary" DECIMAL(12,2),
    "prevAllowance" DECIMAL(12,2),
    "newAllowance" DECIMAL(12,2),
    "prevPayScheme" "HrPaymentScheme",
    "newPayScheme" "HrPaymentScheme",
    "comments" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrCompensationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCompensation" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "baseSalary" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "payFrequency" "PayFrequency" NOT NULL,
    "allowances" JSONB,
    "deductions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentScheme" "HrPaymentScheme" NOT NULL DEFAULT 'MONTHLY',

    CONSTRAINT "EmployeeCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBranchAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT,

    CONSTRAINT "EmployeeBranchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePositionAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePositionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "HrEmployeeDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "retentionUntil" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visibility" "HrDocumentVisibility" NOT NULL DEFAULT 'PERSONAL',

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canEmployeeView" BOOLEAN NOT NULL DEFAULT false,
    "viewGrantedUntil" TIMESTAMP(3),

    CONSTRAINT "EmployeeDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalLicense" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "applies" BOOLEAN NOT NULL DEFAULT false,
    "number" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "issuingEntity" TEXT,
    "fileUrl" TEXT,
    "reminderDays" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "employeeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "branchId" TEXT,
    "runType" "PayrollRunType" NOT NULL DEFAULT 'REGULAR',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "totalGross" DECIMAL(14,2),
    "totalDeductions" DECIMAL(14,2),
    "totalNet" DECIMAL(14,2),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunEntry" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "compensationSnapshot" JSONB,
    "grossAmount" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRunEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEmployee" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "engagementId" TEXT,
    "employmentType" "HrEmploymentType" NOT NULL,
    "baseSalary" DECIMAL(14,2),
    "workedDays" INTEGER,
    "workedHours" DECIMAL(8,2),
    "overtimeHours" DECIMAL(8,2),
    "grossAmount" DECIMAL(14,2),
    "totalDeductions" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunEmployee" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "paymentStatus" "PayrollPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedByUserId" TEXT,
    "signatureFileKey" TEXT,
    "computedJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRunEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollConcept" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PayrollConceptType" NOT NULL,
    "description" TEXT NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "isEditable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEmployeeConcept" (
    "id" TEXT NOT NULL,
    "payrollEmployeeId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollEmployeeConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollFinanceRecord" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "payrollEmployeeId" TEXT,
    "payableId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollFinanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceComputed" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalHours" DECIMAL(6,2),
    "status" "AttendanceStatus" NOT NULL,
    "color" "AttendanceColor" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceComputed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDay" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftTemplateId" TEXT,
    "branchId" TEXT,
    "legalEntityId" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "totalHours" DECIMAL(6,2),
    "regularHours" DECIMAL(6,2),
    "overtimeHours" DECIMAL(6,2),
    "tardyMinutes" INTEGER,
    "status" "AttendanceStatus" NOT NULL,
    "color" "AttendanceColor" NOT NULL,
    "notes" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "closeStatus" "AttendanceCloseStatus" NOT NULL DEFAULT 'OPEN',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "issues" JSONB,
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceProcessedDay" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "firstIn" TIMESTAMP(3),
    "lastOut" TIMESTAMP(3),
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lunchMinutes" INTEGER NOT NULL DEFAULT 0,
    "effectiveMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceProcessedStatus" NOT NULL,
    "needsApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shiftId" TEXT,

    CONSTRAINT "AttendanceProcessedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDayId" TEXT NOT NULL,
    "calculatedHours" DECIMAL(6,2) NOT NULL,
    "requestedHours" DECIMAL(6,2) NOT NULL,
    "status" "OvertimeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryAction" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "DisciplinaryActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "comments" TEXT,
    "status" "DisciplinaryActionStatus" NOT NULL DEFAULT 'DRAFT',
    "documentUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "cooldownDays" INTEGER,
    "createdById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrEmployeeWarning" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "HrEmployeeWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRawEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "branchId" TEXT,
    "siteId" TEXT,
    "customerId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "deviceTime" TIMESTAMP(3),
    "type" "AttendanceRawEventType" NOT NULL,
    "source" "AttendanceRawEventSource" NOT NULL,
    "biometricId" TEXT,
    "status" "AttendanceRawEventStatus" NOT NULL DEFAULT 'NEW',
    "errorMessage" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "zoneStatus" "AttendanceZoneStatus",
    "photoUrl" TEXT,
    "photoHash" TEXT,
    "faceStatus" "AttendanceFaceStatus",
    "faceScore" DOUBLE PRECISION,
    "rawPayload" JSONB,
    "payloadJson" JSONB,
    "importBatchId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceIncident" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AttendanceIncidentType" NOT NULL,
    "severity" "AttendanceIncidentSeverity" NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "rawEventId" TEXT,
    "processedDayId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSiteConfig" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "customerId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "allowOutOfZone" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "requireLiveness" "AttendanceLivenessLevel" NOT NULL DEFAULT 'OFF',
    "windowBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "windowAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "antiPassback" BOOLEAN NOT NULL DEFAULT false,
    "allowedSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceShift" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "toleranceMinutes" INTEGER NOT NULL,
    "lunchMinutes" INTEGER,
    "lunchPaid" BOOLEAN NOT NULL DEFAULT false,
    "overtimeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefaultForSite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AttendanceShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSiteAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSiteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePunchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "employeeId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunchToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "source" "AttendanceRecordSource" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceNotificationLog" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "type" "AttendanceNotificationType" NOT NULL,
    "status" "AttendanceNotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" "AttendanceNotificationProvider" NOT NULL DEFAULT 'SMTP',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrAttendanceEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrAttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayrollRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayrollLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrWarningAttachment" (
    "id" TEXT NOT NULL,
    "warningId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrWarningAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryAttachment" (
    "id" TEXT NOT NULL,
    "disciplinaryActionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisciplinaryAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEvaluation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "comments" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "evaluatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShiftAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftTemplateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationQuestion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "type" "EvaluationQuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "availableDays" DECIMAL(6,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysPerYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "policyId" TEXT,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DECIMAL(6,2) NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipBenefit" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "kind" "MembershipBenefitKind" NOT NULL,
    "targetType" "MembershipBenefitTargetType" NOT NULL,
    "targetId" TEXT,
    "categoryId" TEXT,
    "discountPercent" DECIMAL(5,2),
    "includedQty" DECIMAL(12,2),
    "frequency" "MembershipBenefitFrequency" NOT NULL DEFAULT 'ONCE',
    "resetEveryDays" INTEGER,
    "branchScope" "MembershipBranchScope" NOT NULL DEFAULT 'ALL',
    "branchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionOnExceed" "MembershipActionOnExceed" NOT NULL DEFAULT 'PREFERENTIAL_PRICE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "reminderDays" INTEGER NOT NULL DEFAULT 30,
    "graceDays" INTEGER NOT NULL DEFAULT 7,
    "inactiveAfterDays" INTEGER NOT NULL DEFAULT 90,
    "autoRenewWithPayment" BOOLEAN NOT NULL DEFAULT true,
    "prorateOnMidmonth" BOOLEAN NOT NULL DEFAULT true,
    "blockIfBalanceDue" BOOLEAN NOT NULL DEFAULT true,
    "requireInitialPayment" BOOLEAN NOT NULL DEFAULT true,
    "cashTransferMinMonths" INTEGER NOT NULL DEFAULT 2,
    "retryPolicy" JSONB,
    "priceChangeNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipContract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT concat('MBR-', lpad((nextval('membership_contract_code_seq'::regclass))::text, 6, '0'::text)),
    "ownerType" "MembershipOwnerType" NOT NULL,
    "ownerId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDIENTE',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "nextRenewAt" TIMESTAMP(3),
    "billingFrequency" "MembershipBillingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "priceLockedMonthly" DECIMAL(12,2),
    "priceLockedAnnual" DECIMAL(12,2),
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "channel" TEXT,
    "assignedBranchId" TEXT,
    "allowDependents" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipDependent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "personId" TEXT,
    "relationType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipDependent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipException" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "allowBenefits" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "MembershipPaymentMethod" NOT NULL,
    "kind" "MembershipPaymentKind" NOT NULL,
    "status" "MembershipPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refNo" TEXT,
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MembershipPlanType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "priceMonthly" DECIMAL(12,2) NOT NULL,
    "priceAnnual" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "maxDependents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipUsage" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "benefitId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "module" "MembershipUsageModule" NOT NULL,
    "referenceId" TEXT,
    "qty" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "amountDiscounted" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountCharged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exceeded" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "entityId" TEXT,
    "entityType" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" TEXT NOT NULL,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "crossesMidnight" BOOLEAN NOT NULL DEFAULT false,
    "weeklyPattern" JSONB,
    "toleranceMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxDailyHours" DECIMAL(6,2),
    "maxWeeklyHours" DECIMAL(6,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeClockDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "location" TEXT,
    "branchId" TEXT,
    "legalEntityId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeClockDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeClockLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT,
    "branchId" TEXT,
    "legalEntityId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" "TimeClockLogType" NOT NULL,
    "source" "TimeClockLogSource" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeClockLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "sourceType" "DiagnosticOrderSourceType" NOT NULL DEFAULT 'WALK_IN',
    "sourceRefId" TEXT,
    "status" "DiagnosticOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "DiagnosticItemKind" NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "status" "DiagnosticItemStatus" NOT NULL DEFAULT 'ORDERED',
    "priority" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCatalogItem" (
    "id" TEXT NOT NULL,
    "kind" "DiagnosticItemKind" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "modality" "ImagingModality",
    "unit" TEXT,
    "refLow" DECIMAL(12,4),
    "refHigh" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSpecimen" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "specimenCode" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "collectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabSpecimen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "testCode" TEXT,
    "valueText" TEXT,
    "valueNumber" DECIMAL(14,4),
    "unit" TEXT,
    "refLow" DECIMAL(12,4),
    "refHigh" DECIMAL(12,4),
    "flag" "LabResultFlag",
    "resultAt" TIMESTAMP(3),
    "enteredByUserId" TEXT,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingStudy" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "orthancStudyId" TEXT,
    "studyInstanceUID" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingReport" (
    "id" TEXT NOT NULL,
    "imagingStudyId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "findings" TEXT,
    "impression" TEXT,
    "createdByUserId" TEXT,
    "signedByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationInbox" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "patientExternalId" TEXT,
    "status" "IntegrationInboxStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextDoc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "serviceKey" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextDocVersion" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "TextDocVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_departmentId_name_key" ON "Municipality"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_jobRoleId_idx" ON "UserProfile"("jobRoleId");

-- CreateIndex
CREATE INDEX "UserProfile_departmentId_idx" ON "UserProfile"("departmentId");

-- CreateIndex
CREATE INDEX "UserProfile_municipalityId_idx" ON "UserProfile"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_name_key" ON "JobRole"("name");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubcategory_slug_key" ON "ProductSubcategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSubcategory_slug_key" ON "ServiceSubcategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryArea_slug_key" ON "InventoryArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStock_productId_branchId_key" ON "ProductStock"("productId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_code_key" ON "PurchaseRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ComboService_comboId_serviceId_key" ON "ComboService"("comboId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboProduct_comboId_productId_key" ON "ComboProduct"("comboId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "MailModuleAccount_moduleKey_key" ON "MailModuleAccount"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSeries_invoiceConfigId_code_branchId_key" ON "InvoiceSeries"("invoiceConfigId", "code", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_module_area_action_idx" ON "Permission"("module", "area", "action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_legalEntityId_key" ON "UserPermission"("userId", "permissionId", "legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegrationConfig_key_key" ON "ApiIntegrationConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_slug_key" ON "FinanceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSubcategory_slug_key" ON "FinanceSubcategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "Account"("code");

-- CreateIndex
CREATE INDEX "FinancialAccount_legalEntityId_idx" ON "FinancialAccount"("legalEntityId");

-- CreateIndex
CREATE INDEX "Receivable_legalEntityId_idx" ON "Receivable"("legalEntityId");

-- CreateIndex
CREATE INDEX "Receivable_partyId_idx" ON "Receivable"("partyId");

-- CreateIndex
CREATE INDEX "Payable_legalEntityId_idx" ON "Payable"("legalEntityId");

-- CreateIndex
CREATE INDEX "Payable_partyId_idx" ON "Payable"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReportLog_settingId_periodFrom_periodTo_key" ON "InventoryReportLog"("settingId", "periodFrom", "periodTo");

-- CreateIndex
CREATE INDEX "CrmLead_leadType_status_idx" ON "CrmLead"("leadType", "status");

-- CreateIndex
CREATE INDEX "CrmLead_nit_idx" ON "CrmLead"("nit");

-- CreateIndex
CREATE INDEX "CrmLead_personDpi_idx" ON "CrmLead"("personDpi");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_nit_key" ON "ClientProfile"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_dpi_key" ON "ClientProfile"("dpi");

-- CreateIndex
CREATE INDEX "ClientProfile_email_phone_idx" ON "ClientProfile"("email", "phone");

-- CreateIndex
CREATE INDEX "CrmAccount_nit_idx" ON "CrmAccount"("nit");

-- CreateIndex
CREATE INDEX "CrmAccount_ownerId_idx" ON "CrmAccount"("ownerId");

-- CreateIndex
CREATE INDEX "CrmContact_email_phone_idx" ON "CrmContact"("email", "phone");

-- CreateIndex
CREATE INDEX "CrmPipeline_type_idx" ON "CrmPipeline"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineConfig_name_type_key" ON "PipelineConfig"("name", "type");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_order_idx" ON "PipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_key_key" ON "PipelineStage"("pipelineId", "key");

-- CreateIndex
CREATE INDEX "PipelineTransition_pipelineId_fromStageKey_toStageKey_idx" ON "PipelineTransition"("pipelineId", "fromStageKey", "toStageKey");

-- CreateIndex
CREATE INDEX "PipelineRuleSet_pipelineId_scope_idx" ON "PipelineRuleSet"("pipelineId", "scope");

-- CreateIndex
CREATE INDEX "PipelineRuleSet_pipelineId_scope_stageKey_idx" ON "PipelineRuleSet"("pipelineId", "scope", "stageKey");

-- CreateIndex
CREATE INDEX "PipelineRuleSet_pipelineId_scope_fromStageKey_toStageKey_idx" ON "PipelineRuleSet"("pipelineId", "scope", "fromStageKey", "toStageKey");

-- CreateIndex
CREATE INDEX "PipelineRule_ruleSetId_order_idx" ON "PipelineRule"("ruleSetId", "order");

-- CreateIndex
CREATE INDEX "RuleEvaluationLog_dealId_createdAt_idx" ON "RuleEvaluationLog"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmPipelineStage_pipelineId_order_idx" ON "CrmPipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPipelineStage_pipelineId_stage_key" ON "CrmPipelineStage"("pipelineId", "stage");

-- CreateIndex
CREATE INDEX "CrmDeal_pipelineType_stage_idx" ON "CrmDeal"("pipelineType", "stage");

-- CreateIndex
CREATE INDEX "CrmDeal_pipelineId_idx" ON "CrmDeal"("pipelineId");

-- CreateIndex
CREATE INDEX "CrmDeal_accountId_idx" ON "CrmDeal"("accountId");

-- CreateIndex
CREATE INDEX "CrmDeal_contactId_idx" ON "CrmDeal"("contactId");

-- CreateIndex
CREATE INDEX "CrmDeal_ownerUserId_idx" ON "CrmDeal"("ownerUserId");

-- CreateIndex
CREATE INDEX "CrmDeal_branchId_idx" ON "CrmDeal"("branchId");

-- CreateIndex
CREATE INDEX "CrmDealStageHistory_dealId_changedAt_idx" ON "CrmDealStageHistory"("dealId", "changedAt");

-- CreateIndex
CREATE INDEX "CrmDealServiceInterest_dealId_idx" ON "CrmDealServiceInterest"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmDealServiceInterest_dealId_serviceType_key" ON "CrmDealServiceInterest"("dealId", "serviceType");

-- CreateIndex
CREATE INDEX "CrmActivity_dealId_idx" ON "CrmActivity"("dealId");

-- CreateIndex
CREATE INDEX "CrmActivity_accountId_idx" ON "CrmActivity"("accountId");

-- CreateIndex
CREATE INDEX "CrmActivity_contactId_idx" ON "CrmActivity"("contactId");

-- CreateIndex
CREATE INDEX "CrmTask_dealId_idx" ON "CrmTask"("dealId");

-- CreateIndex
CREATE INDEX "CrmTask_ownerId_idx" ON "CrmTask"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmQuote_quoteNumber_key" ON "CrmQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "CrmQuote_dealId_idx" ON "CrmQuote"("dealId");

-- CreateIndex
CREATE INDEX "CrmQuote_leadId_idx" ON "CrmQuote"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmQuote_dealId_sequence_key" ON "CrmQuote"("dealId", "sequence");

-- CreateIndex
CREATE INDEX "CrmQuoteItem_quoteId_idx" ON "CrmQuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "CrmRequest_dealId_status_idx" ON "CrmRequest"("dealId", "status");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_dealId_idx" ON "CrmCalendarEvent"("dealId");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_leadId_idx" ON "CrmCalendarEvent"("leadId");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_quoteId_idx" ON "CrmCalendarEvent"("quoteId");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_type_startAt_idx" ON "CrmCalendarEvent"("type", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceCounter_key_key" ON "SequenceCounter"("key");

-- CreateIndex
CREATE INDEX "B2BProposalDoc_dealId_createdAt_idx" ON "B2BProposalDoc"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "B2BProposalDoc_status_idx" ON "B2BProposalDoc"("status");

-- CreateIndex
CREATE UNIQUE INDEX "B2BProposalDoc_sequenceYear_sequenceNumber_key" ON "B2BProposalDoc"("sequenceYear", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "Quote_dealId_idx" ON "Quote"("dealId");

-- CreateIndex
CREATE INDEX "Quote_dealId_status_idx" ON "Quote"("dealId", "status");

-- CreateIndex
CREATE INDEX "Quote_dealId_isActive_idx" ON "Quote"("dealId", "isActive");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteRequest_dealId_idx" ON "QuoteRequest"("dealId");

-- CreateIndex
CREATE INDEX "QuoteRequest_quoteId_idx" ON "QuoteRequest"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "QuoteDelivery_quoteId_createdAt_idx" ON "QuoteDelivery"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteDelivery_status_idx" ON "QuoteDelivery"("status");

-- CreateIndex
CREATE INDEX "QuoteDelivery_providerMessageId_idx" ON "QuoteDelivery"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HrDepartment_name_key" ON "HrDepartment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HrPosition_name_key" ON "HrPosition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_employeeCode_key" ON "HrEmployee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_dpi_key" ON "HrEmployee"("dpi");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_biometricId_key" ON "HrEmployee"("biometricId");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_userId_key" ON "HrEmployee"("userId");

-- CreateIndex
CREATE INDEX "HrEmployee_employeeCode_idx" ON "HrEmployee"("employeeCode");

-- CreateIndex
CREATE INDEX "HrEmployee_dpi_idx" ON "HrEmployee"("dpi");

-- CreateIndex
CREATE INDEX "HrEmployee_primaryLegalEntityId_idx" ON "HrEmployee"("primaryLegalEntityId");

-- CreateIndex
CREATE INDEX "CompensationBonus_employeeId_idx" ON "CompensationBonus"("employeeId");

-- CreateIndex
CREATE INDEX "CompensationBonus_engagementId_idx" ON "CompensationBonus"("engagementId");

-- CreateIndex
CREATE INDEX "EmployeeEngagement_employeeId_idx" ON "EmployeeEngagement"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEngagement_legalEntityId_idx" ON "EmployeeEngagement"("legalEntityId");

-- CreateIndex
CREATE INDEX "EmployeeEngagement_status_idx" ON "EmployeeEngagement"("status");

-- CreateIndex
CREATE INDEX "HrCompensationHistory_employeeId_createdAt_idx" ON "HrCompensationHistory"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeCompensation_engagementId_effectiveFrom_idx" ON "EmployeeCompensation"("engagementId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmployeeBranchAssignment_employeeId_idx" ON "EmployeeBranchAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBranchAssignment_branchId_idx" ON "EmployeeBranchAssignment"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBranchAssignment_employeeId_branchId_key" ON "EmployeeBranchAssignment"("employeeId", "branchId");

-- CreateIndex
CREATE INDEX "EmployeePositionAssignment_employeeId_idx" ON "EmployeePositionAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePositionAssignment_positionId_idx" ON "EmployeePositionAssignment"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_currentVersionId_key" ON "EmployeeDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocumentVersion_expiresAt_idx" ON "EmployeeDocumentVersion"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocumentVersion_documentId_versionNumber_key" ON "EmployeeDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalLicense_employeeId_key" ON "ProfessionalLicense"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_employeeId_idx" ON "Notification"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_type_dueAt_idx" ON "Notification"("type", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_code_key" ON "PayrollRun"("code");

-- CreateIndex
CREATE INDEX "PayrollRun_legalEntityId_idx" ON "PayrollRun"("legalEntityId");

-- CreateIndex
CREATE INDEX "PayrollRun_branchId_idx" ON "PayrollRun"("branchId");

-- CreateIndex
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun"("status");

-- CreateIndex
CREATE INDEX "PayrollRunEntry_payrollRunId_idx" ON "PayrollRunEntry"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollRunEntry_engagementId_idx" ON "PayrollRunEntry"("engagementId");

-- CreateIndex
CREATE INDEX "PayrollEmployee_payrollRunId_idx" ON "PayrollEmployee"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollEmployee_employeeId_idx" ON "PayrollEmployee"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollRunEmployee_payrollRunId_idx" ON "PayrollRunEmployee"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollRunEmployee_employeeId_idx" ON "PayrollRunEmployee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollConcept_code_key" ON "PayrollConcept"("code");

-- CreateIndex
CREATE INDEX "PayrollEmployeeConcept_payrollEmployeeId_idx" ON "PayrollEmployeeConcept"("payrollEmployeeId");

-- CreateIndex
CREATE INDEX "PayrollEmployeeConcept_conceptId_idx" ON "PayrollEmployeeConcept"("conceptId");

-- CreateIndex
CREATE INDEX "PayrollFinanceRecord_payrollRunId_idx" ON "PayrollFinanceRecord"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollFinanceRecord_payrollEmployeeId_idx" ON "PayrollFinanceRecord"("payrollEmployeeId");

-- CreateIndex
CREATE INDEX "PayrollFinanceRecord_payableId_idx" ON "PayrollFinanceRecord"("payableId");

-- CreateIndex
CREATE INDEX "AttendanceComputed_status_idx" ON "AttendanceComputed"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceComputed_employeeId_date_key" ON "AttendanceComputed"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceDay_status_idx" ON "AttendanceDay"("status");

-- CreateIndex
CREATE INDEX "AttendanceDay_branchId_idx" ON "AttendanceDay"("branchId");

-- CreateIndex
CREATE INDEX "AttendanceDay_legalEntityId_idx" ON "AttendanceDay"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDay_employeeId_date_key" ON "AttendanceDay"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceProcessedDay_date_idx" ON "AttendanceProcessedDay"("date");

-- CreateIndex
CREATE INDEX "AttendanceProcessedDay_siteId_idx" ON "AttendanceProcessedDay"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceProcessedDay_customerId_idx" ON "AttendanceProcessedDay"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceProcessedDay_employeeId_date_key" ON "AttendanceProcessedDay"("employeeId", "date");

-- CreateIndex
CREATE INDEX "OvertimeRequest_employeeId_idx" ON "OvertimeRequest"("employeeId");

-- CreateIndex
CREATE INDEX "OvertimeRequest_status_idx" ON "OvertimeRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeRequest_attendanceDayId_key" ON "OvertimeRequest"("attendanceDayId");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_employeeId_issuedAt_idx" ON "DisciplinaryAction"("employeeId", "issuedAt");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_status_idx" ON "DisciplinaryAction"("status");

-- CreateIndex
CREATE INDEX "HrEmployeeWarning_employeeId_issuedAt_idx" ON "HrEmployeeWarning"("employeeId", "issuedAt");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_employeeId_occurredAt_idx" ON "AttendanceRawEvent"("employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_branchId_idx" ON "AttendanceRawEvent"("branchId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_siteId_idx" ON "AttendanceRawEvent"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_customerId_idx" ON "AttendanceRawEvent"("customerId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_biometricId_occurredAt_idx" ON "AttendanceRawEvent"("biometricId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_status_idx" ON "AttendanceRawEvent"("status");

-- CreateIndex
CREATE INDEX "AttendanceIncident_date_idx" ON "AttendanceIncident"("date");

-- CreateIndex
CREATE INDEX "AttendanceIncident_siteId_idx" ON "AttendanceIncident"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceIncident_resolved_idx" ON "AttendanceIncident"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceIncident_employeeId_date_type_key" ON "AttendanceIncident"("employeeId", "date", "type");

-- CreateIndex
CREATE INDEX "AttendanceSiteConfig_customerId_idx" ON "AttendanceSiteConfig"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSiteConfig_siteId_key" ON "AttendanceSiteConfig"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceShift_siteId_idx" ON "AttendanceShift"("siteId");

-- CreateIndex
CREATE INDEX "EmployeeSiteAssignment_employeeId_siteId_startDate_idx" ON "EmployeeSiteAssignment"("employeeId", "siteId", "startDate");

-- CreateIndex
CREATE INDEX "EmployeeSiteAssignment_siteId_shiftId_idx" ON "EmployeeSiteAssignment"("siteId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunchToken_token_key" ON "AttendancePunchToken"("token");

-- CreateIndex
CREATE INDEX "AttendancePunchToken_siteId_idx" ON "AttendancePunchToken"("siteId");

-- CreateIndex
CREATE INDEX "AttendancePunchToken_employeeId_idx" ON "AttendancePunchToken"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_branchId_idx" ON "AttendanceRecord"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceNotificationLog_attendanceRecordId_idx" ON "AttendanceNotificationLog"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "AttendanceNotificationLog_status_idx" ON "AttendanceNotificationLog"("status");

-- CreateIndex
CREATE INDEX "HrAttendanceEvent_employeeId_occurredAt_idx" ON "HrAttendanceEvent"("employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "HrAttendanceEvent_occurredAt_idx" ON "HrAttendanceEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "HrPayrollLine_payrollRunId_idx" ON "HrPayrollLine"("payrollRunId");

-- CreateIndex
CREATE INDEX "HrPayrollLine_employeeId_idx" ON "HrPayrollLine"("employeeId");

-- CreateIndex
CREATE INDEX "HrWarningAttachment_warningId_idx" ON "HrWarningAttachment"("warningId");

-- CreateIndex
CREATE INDEX "DisciplinaryAttachment_disciplinaryActionId_idx" ON "DisciplinaryAttachment"("disciplinaryActionId");

-- CreateIndex
CREATE INDEX "EmployeeEvaluation_employeeId_idx" ON "EmployeeEvaluation"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEvaluation_formId_idx" ON "EmployeeEvaluation"("formId");

-- CreateIndex
CREATE INDEX "EmployeeShiftAssignment_employeeId_idx" ON "EmployeeShiftAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeShiftAssignment_shiftTemplateId_idx" ON "EmployeeShiftAssignment"("shiftTemplateId");

-- CreateIndex
CREATE INDEX "EvaluationQuestion_formId_idx" ON "EvaluationQuestion"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_policyId_key" ON "LeaveBalance"("employeeId", "policyId");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "MembershipBenefit_kind_targetType_idx" ON "MembershipBenefit"("kind", "targetType");

-- CreateIndex
CREATE INDEX "MembershipBenefit_planId_idx" ON "MembershipBenefit"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipContract_code_key" ON "MembershipContract"("code");

-- CreateIndex
CREATE INDEX "MembershipContract_nextRenewAt_idx" ON "MembershipContract"("nextRenewAt");

-- CreateIndex
CREATE INDEX "MembershipContract_ownerId_idx" ON "MembershipContract"("ownerId");

-- CreateIndex
CREATE INDEX "MembershipContract_planId_idx" ON "MembershipContract"("planId");

-- CreateIndex
CREATE INDEX "MembershipContract_status_idx" ON "MembershipContract"("status");

-- CreateIndex
CREATE INDEX "MembershipDependent_contractId_idx" ON "MembershipDependent"("contractId");

-- CreateIndex
CREATE INDEX "MembershipDependent_personId_idx" ON "MembershipDependent"("personId");

-- CreateIndex
CREATE INDEX "MembershipException_contractId_idx" ON "MembershipException"("contractId");

-- CreateIndex
CREATE INDEX "MembershipException_createdByUserId_idx" ON "MembershipException"("createdByUserId");

-- CreateIndex
CREATE INDEX "MembershipException_expiresAt_idx" ON "MembershipException"("expiresAt");

-- CreateIndex
CREATE INDEX "MembershipPayment_contractId_idx" ON "MembershipPayment"("contractId");

-- CreateIndex
CREATE INDEX "MembershipPayment_kind_idx" ON "MembershipPayment"("kind");

-- CreateIndex
CREATE INDEX "MembershipPayment_status_idx" ON "MembershipPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_slug_key" ON "MembershipPlan"("slug");

-- CreateIndex
CREATE INDEX "MembershipPlan_type_active_idx" ON "MembershipPlan"("type", "active");

-- CreateIndex
CREATE INDEX "MembershipUsage_benefitId_idx" ON "MembershipUsage"("benefitId");

-- CreateIndex
CREATE INDEX "MembershipUsage_contractId_idx" ON "MembershipUsage"("contractId");

-- CreateIndex
CREATE INDEX "MembershipUsage_module_idx" ON "MembershipUsage"("module");

-- CreateIndex
CREATE INDEX "MembershipUsage_occurredAt_idx" ON "MembershipUsage"("occurredAt");

-- CreateIndex
CREATE INDEX "NotificationOutbox_entityType_entityId_idx" ON "NotificationOutbox"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_scheduledAt_idx" ON "NotificationOutbox"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Automation_moduleKey_idx" ON "Automation"("moduleKey");

-- CreateIndex
CREATE INDEX "Automation_isEnabled_idx" ON "Automation"("isEnabled");

-- CreateIndex
CREATE INDEX "TimeClockDevice_branchId_idx" ON "TimeClockDevice"("branchId");

-- CreateIndex
CREATE INDEX "TimeClockDevice_legalEntityId_idx" ON "TimeClockDevice"("legalEntityId");

-- CreateIndex
CREATE INDEX "TimeClockLog_deviceId_idx" ON "TimeClockLog"("deviceId");

-- CreateIndex
CREATE INDEX "TimeClockLog_employeeId_timestamp_idx" ON "TimeClockLog"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "TimeClockLog_branchId_idx" ON "TimeClockLog"("branchId");

-- CreateIndex
CREATE INDEX "TimeClockLog_legalEntityId_idx" ON "TimeClockLog"("legalEntityId");

-- CreateIndex
CREATE INDEX "TimeClockLog_source_idx" ON "TimeClockLog"("source");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_status_idx" ON "DiagnosticOrder"("status");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_orderedAt_idx" ON "DiagnosticOrder"("orderedAt");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_branchId_idx" ON "DiagnosticOrder"("branchId");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_patientId_idx" ON "DiagnosticOrder"("patientId");

-- CreateIndex
CREATE INDEX "DiagnosticOrderItem_orderId_idx" ON "DiagnosticOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "DiagnosticOrderItem_status_idx" ON "DiagnosticOrderItem"("status");

-- CreateIndex
CREATE INDEX "DiagnosticOrderItem_kind_idx" ON "DiagnosticOrderItem"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticCatalogItem_code_key" ON "DiagnosticCatalogItem"("code");

-- CreateIndex
CREATE INDEX "DiagnosticCatalogItem_kind_idx" ON "DiagnosticCatalogItem"("kind");

-- CreateIndex
CREATE INDEX "DiagnosticCatalogItem_isActive_idx" ON "DiagnosticCatalogItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecimen_orderItemId_key" ON "LabSpecimen"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecimen_specimenCode_key" ON "LabSpecimen"("specimenCode");

-- CreateIndex
CREATE INDEX "LabResult_orderItemId_idx" ON "LabResult"("orderItemId");

-- CreateIndex
CREATE INDEX "LabResult_flag_idx" ON "LabResult"("flag");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingStudy_orderItemId_key" ON "ImagingStudy"("orderItemId");

-- CreateIndex
CREATE INDEX "ImagingStudy_orthancStudyId_idx" ON "ImagingStudy"("orthancStudyId");

-- CreateIndex
CREATE INDEX "ImagingReport_status_idx" ON "ImagingReport"("status");

-- CreateIndex
CREATE INDEX "ImagingReport_imagingStudyId_idx" ON "ImagingReport"("imagingStudyId");

-- CreateIndex
CREATE INDEX "IntegrationInbox_status_idx" ON "IntegrationInbox"("status");

-- CreateIndex
CREATE INDEX "IntegrationInbox_source_idx" ON "IntegrationInbox"("source");

-- CreateIndex
CREATE UNIQUE INDEX "TextDocVersion_docId_versionNo_key" ON "TextDocVersion"("docId", "versionNo");

-- AddForeignKey
ALTER TABLE "Municipality" ADD CONSTRAINT "Municipality_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubcategory" ADD CONSTRAINT "ProductSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSubcategory" ADD CONSTRAINT "ServiceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_inventoryAreaId_fkey" FOREIGN KEY ("inventoryAreaId") REFERENCES "InventoryArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ProductSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ServiceSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboService" ADD CONSTRAINT "ComboService_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboService" ADD CONSTRAINT "ComboService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboProduct" ADD CONSTRAINT "ComboProduct_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboProduct" ADD CONSTRAINT "ComboProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEmailScheduleLog" ADD CONSTRAINT "InventoryEmailScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InventoryEmailSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSeries" ADD CONSTRAINT "InvoiceSeries_invoiceConfigId_fkey" FOREIGN KEY ("invoiceConfigId") REFERENCES "InvoiceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceSubcategory" ADD CONSTRAINT "FinanceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "FinanceSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "FinanceSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReportLog" ADD CONSTRAINT "InventoryReportLog_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "InventoryEmailSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAccount" ADD CONSTRAINT "CrmAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineTransition" ADD CONSTRAINT "PipelineTransition_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRuleSet" ADD CONSTRAINT "PipelineRuleSet_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRule" ADD CONSTRAINT "PipelineRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "PipelineRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvaluationLog" ADD CONSTRAINT "RuleEvaluationLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvaluationLog" ADD CONSTRAINT "RuleEvaluationLog_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealStageHistory" ADD CONSTRAINT "CrmDealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealServiceInterest" ADD CONSTRAINT "CrmDealServiceInterest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuote" ADD CONSTRAINT "CrmQuote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuote" ADD CONSTRAINT "CrmQuote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuoteItem" ADD CONSTRAINT "CrmQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CrmQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmRequest" ADD CONSTRAINT "CrmRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuoteRequest" ADD CONSTRAINT "CrmQuoteRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CrmQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuoteRequest" ADD CONSTRAINT "CrmQuoteRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CrmRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCalendarEvent" ADD CONSTRAINT "CrmCalendarEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCalendarEvent" ADD CONSTRAINT "CrmCalendarEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCalendarEvent" ADD CONSTRAINT "CrmCalendarEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CrmQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_lastPdfFileAssetId_fkey" FOREIGN KEY ("lastPdfFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_defaultTemplateB2BId_fkey" FOREIGN KEY ("defaultTemplateB2BId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_defaultTemplateB2CId_fkey" FOREIGN KEY ("defaultTemplateB2CId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_primaryLegalEntityId_fkey" FOREIGN KEY ("primaryLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationBonus" ADD CONSTRAINT "CompensationBonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationBonus" ADD CONSTRAINT "CompensationBonus_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EmployeeEngagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEngagement" ADD CONSTRAINT "EmployeeEngagement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEngagement" ADD CONSTRAINT "EmployeeEngagement_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCompensationHistory" ADD CONSTRAINT "HrCompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensation" ADD CONSTRAINT "EmployeeCompensation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EmployeeEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchAssignment" ADD CONSTRAINT "EmployeeBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchAssignment" ADD CONSTRAINT "EmployeeBranchAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePositionAssignment" ADD CONSTRAINT "EmployeePositionAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HrDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePositionAssignment" ADD CONSTRAINT "EmployeePositionAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePositionAssignment" ADD CONSTRAINT "EmployeePositionAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "HrPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "EmployeeDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalLicense" ADD CONSTRAINT "ProfessionalLicense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEntry" ADD CONSTRAINT "PayrollRunEntry_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EmployeeEngagement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEntry" ADD CONSTRAINT "PayrollRunEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployee" ADD CONSTRAINT "PayrollEmployee_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployee" ADD CONSTRAINT "PayrollEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployee" ADD CONSTRAINT "PayrollEmployee_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EmployeeEngagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEmployee" ADD CONSTRAINT "PayrollRunEmployee_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEmployee" ADD CONSTRAINT "PayrollRunEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeConcept" ADD CONSTRAINT "PayrollEmployeeConcept_payrollEmployeeId_fkey" FOREIGN KEY ("payrollEmployeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeConcept" ADD CONSTRAINT "PayrollEmployeeConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "PayrollConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollFinanceRecord" ADD CONSTRAINT "PayrollFinanceRecord_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollFinanceRecord" ADD CONSTRAINT "PayrollFinanceRecord_payrollEmployeeId_fkey" FOREIGN KEY ("payrollEmployeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollFinanceRecord" ADD CONSTRAINT "PayrollFinanceRecord_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceComputed" ADD CONSTRAINT "AttendanceComputed_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceProcessedDay" ADD CONSTRAINT "AttendanceProcessedDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceProcessedDay" ADD CONSTRAINT "AttendanceProcessedDay_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "AttendanceShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES "AttendanceDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployeeWarning" ADD CONSTRAINT "HrEmployeeWarning_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployeeWarning" ADD CONSTRAINT "HrEmployeeWarning_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "AttendanceRawEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_processedDayId_fkey" FOREIGN KEY ("processedDayId") REFERENCES "AttendanceProcessedDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSiteAssignment" ADD CONSTRAINT "EmployeeSiteAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSiteAssignment" ADD CONSTRAINT "EmployeeSiteAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "AttendanceShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchToken" ADD CONSTRAINT "AttendancePunchToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchToken" ADD CONSTRAINT "AttendancePunchToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceNotificationLog" ADD CONSTRAINT "AttendanceNotificationLog_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrAttendanceEvent" ADD CONSTRAINT "HrAttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayrollLine" ADD CONSTRAINT "HrPayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "HrPayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayrollLine" ADD CONSTRAINT "HrPayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrWarningAttachment" ADD CONSTRAINT "HrWarningAttachment_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES "HrEmployeeWarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAttachment" ADD CONSTRAINT "DisciplinaryAttachment_disciplinaryActionId_fkey" FOREIGN KEY ("disciplinaryActionId") REFERENCES "DisciplinaryAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEvaluation" ADD CONSTRAINT "EmployeeEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEvaluation" ADD CONSTRAINT "EmployeeEvaluation_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEvaluation" ADD CONSTRAINT "EmployeeEvaluation_formId_fkey" FOREIGN KEY ("formId") REFERENCES "EvaluationForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShiftAssignment" ADD CONSTRAINT "EmployeeShiftAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShiftAssignment" ADD CONSTRAINT "EmployeeShiftAssignment_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "ShiftTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestion" ADD CONSTRAINT "EvaluationQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "EvaluationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefit" ADD CONSTRAINT "MembershipBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipContract" ADD CONSTRAINT "MembershipContract_assignedBranchId_fkey" FOREIGN KEY ("assignedBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipContract" ADD CONSTRAINT "MembershipContract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipContract" ADD CONSTRAINT "MembershipContract_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDependent" ADD CONSTRAINT "MembershipDependent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDependent" ADD CONSTRAINT "MembershipDependent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipException" ADD CONSTRAINT "MembershipException_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipException" ADD CONSTRAINT "MembershipException_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPayment" ADD CONSTRAINT "MembershipPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockDevice" ADD CONSTRAINT "TimeClockDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockDevice" ADD CONSTRAINT "TimeClockDevice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockLog" ADD CONSTRAINT "TimeClockLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TimeClockDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockLog" ADD CONSTRAINT "TimeClockLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockLog" ADD CONSTRAINT "TimeClockLog_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockLog" ADD CONSTRAINT "TimeClockLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrderItem" ADD CONSTRAINT "DiagnosticOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrderItem" ADD CONSTRAINT "DiagnosticOrderItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "DiagnosticCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSpecimen" ADD CONSTRAINT "LabSpecimen_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "DiagnosticOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSpecimen" ADD CONSTRAINT "LabSpecimen_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "DiagnosticOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingStudy" ADD CONSTRAINT "ImagingStudy_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "DiagnosticOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingReport" ADD CONSTRAINT "ImagingReport_imagingStudyId_fkey" FOREIGN KEY ("imagingStudyId") REFERENCES "ImagingStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingReport" ADD CONSTRAINT "ImagingReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingReport" ADD CONSTRAINT "ImagingReport_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextDocVersion" ADD CONSTRAINT "TextDocVersion_docId_fkey" FOREIGN KEY ("docId") REFERENCES "TextDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
