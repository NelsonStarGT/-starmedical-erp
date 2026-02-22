import pkg from "@prisma/client";
import type {
  HrEmployeeStatus as HrEmployeeStatusType,
  DiagnosticItemStatus as DiagnosticItemStatusType,
  DiagnosticOrderStatus as DiagnosticOrderStatusType,
  ImagingModality as ImagingModalityType,
  LabResultFlag as LabResultFlagType,
  ReportStatus as ReportStatusType,
  Prisma as PrismaTypes
} from "@prisma/client";
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_MAP } from "../lib/security/permissionCatalog";
import { CIE10_LOCAL_SEED } from "../lib/medical/cie10Seed";
import { seedGeoCatalogs } from "./seed.geo";
import { seedPhoneCountryCodes } from "./seed.phone";

const {
  Prisma,
  PrismaClient,
  AppointmentStatus,
  PaymentStatus,
  AccountType,
  JournalEntryStatus,
  FinancialAccountType,
  FinancialTransactionType,
  PartyType,
  FlowType,
  CreditTerm,
  DocStatus,
  PaymentType,
  PaymentMethod,
  CrmPipelineType,
  CrmDealStage,
  CrmActivityType,
  CrmTaskStatus,
  CrmTaskPriority,
  CrmServiceType,
  QuoteType,
  ClientProfileType,
  DiagnosticItemKind,
  DiagnosticItemStatus,
  DiagnosticOrderStatus,
  ImagingModality,
  LabResultFlag,
  ReportStatus,
  LabTestPriority,
  LabTestStatus,
  LabArea,
  LabSampleType,
  LabInstrumentStatus,
  LabMessageChannel,
  LabMessageStatus,
  LabTemplateFieldDataType,
  HrEmploymentType,
  HrEmployeeStatus,
  HrEmployeeDocumentType,
  PayFrequency
} = pkg;

const prisma = new PrismaClient();

async function main() {
  console.info("[seed] starting base data seeding (idempotent)");
  await seedGeoCatalogs(prisma);
  await seedPhoneCountryCodes(prisma);
  const jobRoles = [
    "Administrador",
    "Médico",
    "Enfermería",
    "Recepción",
    "Laboratorio",
    "Rayos X",
    "Ultrasonido",
    "Caja / Facturación",
    "SSO - Monitor",
    "SSO - Coordinador"
  ];
  for (const name of jobRoles) {
    await prisma.jobRole.upsert({
      where: { name },
      update: { name, isActive: true },
      create: { name, isActive: true }
    });
  }

  const specialists = [
    { id: "m1", name: "Dr. José Martínez", specialty: "Medicina General" },
    { id: "m2", name: "Dra. Laura Sánchez", specialty: "Radiología" }
  ];

  const branches = [
    { id: "s1", name: "Palín" },
    { id: "s2", name: "Escuintla" }
  ];

  const appointmentTypes = [
    { id: "t1", name: "Consulta general", description: "Atención médica general", durationMin: 30, color: "#007AFF" },
    { id: "t2", name: "Rayos X", description: "Estudios de imagen", durationMin: 20, color: "#34B3E6" },
    { id: "t3", name: "Ultrasonido", description: "USG diagnóstico", durationMin: 25, color: "#F59E0B" }
  ];

  const entities = [
    { id: "le1", name: "StarMedical, S.A.", comercialName: "StarMedical", nit: "123456-7" },
    { id: "le2", name: "StarLabs, S.A.", comercialName: "StarLabs", nit: "987654-3" }
  ];

  const hrDepartments = [
    { name: "Administración", description: "Operaciones y soporte corporativo" },
    { name: "Clínica", description: "Servicios médicos en clínica" },
    { name: "Laboratorio", description: "Procesos y análisis de laboratorio" },
    { name: "Imagenología", description: "Rayos X, US y otros estudios" },
    { name: "Comercial", description: "Ventas y relaciones comerciales" }
  ];

  const hrPositions = [
    { name: "Doctor", description: "Profesional médico" },
    { name: "Enfermería", description: "Cuidados y apoyo clínico" },
    { name: "Recepción", description: "Atención y admisión" },
    { name: "RRHH", description: "Gestión de personal" },
    { name: "Finanzas", description: "Administración financiera" },
    { name: "Técnico RX", description: "Técnico en Rayos X" },
    { name: "Técnico US", description: "Técnico en Ultrasonido" }
  ];

  const hrDemoEmployees = [
    {
      employeeCode: "EMP-0001",
      firstName: "Ana",
      lastName: "Morales",
      dpi: "1234567890101",
      email: "ana.morales@starmedical.test",
      phone: "50255560001",
      homePhone: "50222280001",
      emergencyContactName: "María Morales",
      emergencyContactPhone: "50244445555",
      address: "Palín, Escuintla",
      residenceProofUrl: "/uploads/hr/ana-recibo-agua.pdf",
      dpiPhotoUrl: "/uploads/hr/ana-dpi-foto.jpg",
      rtuFileUrl: "/uploads/hr/ana-rtu.pdf",
      status: HrEmployeeStatus.ACTIVE,
      primaryLegalEntityKey: "le1",
      engagements: [
        {
          id: "hr-eng-ana-le1",
          legalEntityKey: "le1",
          employmentType: HrEmploymentType.DEPENDENCIA,
          status: HrEmployeeStatus.ACTIVE,
          startDate: new Date("2024-02-01"),
          isPrimary: true,
          compensationAmount: new Prisma.Decimal(8000),
          compensationFrequency: PayFrequency.MONTHLY
        }
      ],
      branchAssignments: [{ id: "hr-branch-ana-s1", branchKey: "s1", isPrimary: true, startDate: new Date("2024-02-01") }],
      positionAssignments: [
        {
          id: "hr-pos-ana",
          positionName: "Doctor",
          departmentName: "Clínica",
          isPrimary: true,
          startDate: new Date("2024-02-01")
        }
      ],
      documents: [
        {
          id: "hr-doc-1",
          versionId: "hr-doc-1-v1",
          versionNumber: 1,
          type: HrEmployeeDocumentType.DPI,
          title: "DPI",
          fileUrl: "/uploads/hr/ana-dpi.pdf",
          issuedAt: new Date("2024-01-15"),
          deliveredAt: new Date("2024-01-15")
        },
        {
          id: "hr-doc-2",
          versionId: "hr-doc-2-v1",
          versionNumber: 1,
          type: HrEmployeeDocumentType.CONTRATO,
          title: "Contrato indefinido",
          fileUrl: "/uploads/hr/ana-contrato.pdf",
          issuedAt: new Date("2024-02-01")
        }
      ],
      professionalLicense: {
        applies: true,
        number: "COL-2024-001",
        issuedAt: new Date("2024-01-10"),
        expiresAt: new Date("2026-01-09"),
        fileUrl: "/uploads/hr/ana-licencia.pdf"
      }
    },
    {
      employeeCode: "EMP-0002",
      firstName: "Luis",
      lastName: "Pérez",
      dpi: "1234567890202",
      email: "luis.perez@starmedical.test",
      phone: "50255560002",
      homePhone: "50222280002",
      emergencyContactName: "Carlos Pérez",
      emergencyContactPhone: "50244446666",
      address: "Escuintla, Guatemala",
      residenceProofUrl: "/uploads/hr/luis-recibo-luz.pdf",
      dpiPhotoUrl: "/uploads/hr/luis-dpi.jpg",
      rtuFileUrl: "/uploads/hr/luis-rtu.pdf",
      status: HrEmployeeStatus.SUSPENDED,
      primaryLegalEntityKey: "le2",
      engagements: [
        {
          id: "hr-eng-luis-le2",
          legalEntityKey: "le2",
          employmentType: HrEmploymentType.HONORARIOS,
          status: HrEmployeeStatus.SUSPENDED,
          startDate: new Date("2024-05-15"),
          isPrimary: true,
          compensationAmount: new Prisma.Decimal(12000),
          compensationFrequency: PayFrequency.MONTHLY
        }
      ],
      branchAssignments: [
        { id: "hr-branch-luis-s2", branchKey: "s2", isPrimary: true, startDate: new Date("2024-05-15") },
        { id: "hr-branch-luis-s1", branchKey: "s1", isPrimary: false, startDate: new Date("2024-06-01") }
      ],
      positionAssignments: [
        {
          id: "hr-pos-luis",
          positionName: "RRHH",
          departmentName: "Administración",
          isPrimary: true,
          startDate: new Date("2024-05-15")
        }
      ],
      documents: [
        {
          id: "hr-doc-3",
          versionId: "hr-doc-3-v1",
          versionNumber: 1,
          type: HrEmployeeDocumentType.CV,
          title: "CV actualizado",
          fileUrl: "/uploads/hr/luis-cv.pdf",
          issuedAt: new Date("2024-05-01")
        }
      ],
      professionalLicense: {
        applies: false
      }
    }
  ];

  for (const type of appointmentTypes) {
    await prisma.appointmentType.upsert({
      where: { id: type.id },
      update: {},
      create: { ...type, status: "Activo" }
    });
  }

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name, isActive: true },
      create: { ...branch, isActive: true }
    });
  }

  const rooms = [
    { id: "room1", name: "Consultorio 1", branchId: "s1", resource: "Consultorio" },
    { id: "room2", name: "Sala Rayos X", branchId: "s1", resource: "Rayos X" },
    { id: "room3", name: "Sala USG", branchId: "s2", resource: "Ultrasonido" }
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: {},
      create: { ...room, status: "Activo" }
    });
  }

  const schedules = [
    {
      specialistId: "m1",
      branchId: "s1",
      weekdays: ["Lunes", "Miércoles", "Viernes"],
      blocks: [{ inicio: "08:00", fin: "12:00" }, { inicio: "14:00", fin: "18:00" }]
    },
    {
      specialistId: "m2",
      branchId: "s1",
      weekdays: ["Martes", "Jueves"],
      blocks: [{ inicio: "09:00", fin: "13:00" }, { inicio: "15:00", fin: "17:00" }]
    }
  ];

  for (const ws of schedules) {
    await prisma.workSchedule.create({
      data: {
        specialistId: ws.specialistId,
        branchId: ws.branchId,
        weekdays: ws.weekdays,
        blocks: ws.blocks as any
      }
    });
  }

  await prisma.appointment
    .create({
      data: {
        id: "c1",
        date: new Date("2025-12-09T09:00:00"),
        durationMin: 30,
        patientId: "p1",
        specialistId: "m1",
        branchId: "s1",
        roomId: "room1",
        typeId: "t1",
        status: AppointmentStatus.PROGRAMADA,
        paymentStatus: PaymentStatus.PENDIENTE,
        companyId: null,
        notes: "Consulta general",
        createdById: "admin-1"
      }
    })
    .catch(() => {});

  for (const entity of entities) {
    await prisma.legalEntity.upsert({
      where: { id: entity.id },
      update: { name: entity.name, comercialName: entity.comercialName, nit: entity.nit },
      create: { ...entity }
    });
  }

  const parties = [
    { id: "party-client-1", type: PartyType.CLIENT, name: "Clinica San Pedro", nit: "CF" },
    { id: "party-provider-1", type: PartyType.PROVIDER, name: "Proveedor Insumos", nit: "1293812-2" },
    { id: "party-prof-1", type: PartyType.PROFESSIONAL, name: "Dr. Carlos Pérez", nit: "4587123-1" }
  ];
  for (const party of parties) {
    await prisma.party.upsert({
      where: { id: party.id },
      update: { ...party },
      create: { ...party }
    });
  }

  const categories = [
    {
      flowType: FlowType.INCOME,
      name: "Servicios médicos",
      slug: "servicios-medicos",
      subs: [
        { name: "Consultas", slug: "consultas" },
        { name: "Imágenes", slug: "imagenes" }
      ]
    },
    {
      flowType: FlowType.EXPENSE,
      name: "Operación",
      slug: "operacion",
      subs: [
        { name: "Insumos", slug: "insumos" },
        { name: "Honorarios", slug: "honorarios" }
      ]
    }
  ];
  for (const cat of categories) {
    const saved = await prisma.financeCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, flowType: cat.flowType },
      create: { name: cat.name, slug: cat.slug, flowType: cat.flowType }
    });
    for (const [idx, sub] of cat.subs.entries()) {
      await prisma.financeSubcategory.upsert({
        where: { slug: sub.slug },
        update: { name: sub.name, categoryId: saved.id, order: idx },
        create: { ...sub, categoryId: saved.id, order: idx }
      });
    }
  }

  const anyCategory = await prisma.productCategory.findFirst();
  if (anyCategory) {
    const sub = await prisma.productSubcategory.findFirst({ where: { categoryId: anyCategory.id } });
    const area = await prisma.inventoryArea.findFirst();
    const product = await prisma.product.upsert({
      where: { code: "MED-001" },
      update: {
        name: "Paracetamol 500mg",
        cost: 2.5,
        price: 5,
        baseSalePrice: 5,
        avgCost: 2.5,
        status: "Activo"
      },
      create: {
        name: "Paracetamol 500mg",
        code: "MED-001",
        categoryId: anyCategory.id,
        subcategoryId: sub?.id,
        inventoryAreaId: area?.id,
        unit: "u",
        cost: 2.5,
        price: 5,
        baseSalePrice: 5,
        avgCost: 2.5,
        status: "Activo"
      }
    });
    await prisma.productStock.upsert({
      where: { productId_branchId: { productId: product.id, branchId: "s1" } },
      update: { stock: 50, minStock: 10 },
      create: { productId: product.id, branchId: "s1", stock: 50, minStock: 10 }
    });
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        branchId: "s1",
        type: "ENTRY",
        quantity: 50,
        unitCost: 2.5,
        reference: "Seed inicial",
        createdById: "admin-seed"
      }
    });
  }

  const baseAccounts = [
    { code: "1-01", name: "Caja", type: AccountType.ASSET },
    { code: "1-02", name: "Bancos", type: AccountType.ASSET },
    { code: "1-03", name: "Cuentas por cobrar", type: AccountType.ASSET },
    { code: "2-01", name: "Cuentas por pagar", type: AccountType.LIABILITY },
    { code: "1-04", name: "Inventario", type: AccountType.ASSET },
    { code: "4-01", name: "Ventas", type: AccountType.INCOME },
    { code: "5-01", name: "Costos", type: AccountType.EXPENSE },
    { code: "5-02", name: "Gastos administrativos", type: AccountType.EXPENSE }
  ];

  const accountIds: Record<string, string> = {};
  for (const acc of baseAccounts) {
    const saved = await prisma.account.upsert({
      where: { code: acc.code },
      update: { name: acc.name, type: acc.type, isActive: true },
      create: { ...acc }
    });
    accountIds[acc.code] = saved.id;
  }

  const finAccounts = [
    { name: "Caja Palín", type: FinancialAccountType.CASH, legalEntityId: "le1" },
    { name: "Banco BAC", type: FinancialAccountType.BANK, legalEntityId: "le1" },
    { name: "Caja StarLabs", type: FinancialAccountType.CASH, legalEntityId: "le2" }
  ];
  const finIds: Record<string, string> = {};
  for (const fa of finAccounts) {
    const existing = await prisma.financialAccount.findFirst({ where: { name: fa.name } });
    if (existing) {
      finIds[fa.name] = existing.id;
      await prisma.financialAccount.update({
        where: { id: existing.id },
        data: { type: fa.type, legalEntityId: fa.legalEntityId, isActive: true }
      });
    } else {
      const created = await prisma.financialAccount.create({
        data: { ...fa, currency: "GTQ", isActive: true }
      });
      finIds[fa.name] = created.id;
    }
  }

  // Asientos de ejemplo (POSTED)
  await prisma.journalEntry.create({
    data: {
      date: new Date("2025-01-01"),
      reference: "Apertura",
      description: "Saldo inicial en caja y bancos",
      branchId: "s1",
      legalEntityId: "le1",
      createdById: "admin-seed",
      status: JournalEntryStatus.POSTED,
      totalDebit: new Prisma.Decimal(5000),
      totalCredit: new Prisma.Decimal(5000),
      lines: {
        create: [
          { accountId: accountIds["1-01"], debit: new Prisma.Decimal(2000), credit: new Prisma.Decimal(0), memo: "Caja" },
          { accountId: accountIds["1-02"], debit: new Prisma.Decimal(3000), credit: new Prisma.Decimal(0), memo: "Bancos" },
          { accountId: accountIds["5-02"], debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(5000), memo: "Aportación" }
        ]
      }
    }
  });

  const saleEntry = await prisma.journalEntry.create({
    data: {
      date: new Date("2025-01-05"),
      reference: "VENT-1001",
      description: "Venta al contado",
      branchId: "s1",
      legalEntityId: "le1",
      createdById: "admin-seed",
      status: JournalEntryStatus.POSTED,
      totalDebit: new Prisma.Decimal(1500),
      totalCredit: new Prisma.Decimal(1500),
      lines: {
        create: [
          { accountId: accountIds["1-01"], debit: new Prisma.Decimal(1500), credit: new Prisma.Decimal(0), memo: "Cobro en caja" },
          { accountId: accountIds["4-01"], debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(1500), memo: "Ingreso por ventas" }
        ]
      }
    }
  });

  // Transacciones financieras de ejemplo
  await prisma.financialTransaction.createMany({
    data: [
      {
        financialAccountId: finIds["Caja Palín"],
        date: new Date("2025-01-01"),
        amount: new Prisma.Decimal(2000),
        type: FinancialTransactionType.IN,
        description: "Saldo inicial",
        reference: "Apertura",
        createdById: "admin-seed"
      },
      {
        financialAccountId: finIds["Banco BAC"],
        date: new Date("2025-01-01"),
        amount: new Prisma.Decimal(3000),
        type: FinancialTransactionType.IN,
        description: "Saldo inicial",
        reference: "Apertura",
        createdById: "admin-seed"
      },
      {
        financialAccountId: finIds["Caja Palín"],
        date: new Date("2025-01-05"),
        amount: new Prisma.Decimal(1500),
        type: FinancialTransactionType.IN,
        description: "Venta al contado",
        reference: saleEntry.reference || "VENT-1001",
        createdById: "admin-seed"
      }
    ]
  });

  // CxC / CxP y pagos de ejemplo
  const receivable = await prisma.receivable.create({
    data: {
      legalEntityId: "le1",
      partyId: "party-client-1",
      date: new Date("2025-01-03"),
      dueDate: new Date("2025-02-02"),
      creditTerm: CreditTerm.DAYS_30,
      amount: new Prisma.Decimal(1200),
      paidAmount: new Prisma.Decimal(200),
      status: DocStatus.PARTIAL,
      reference: "FAC-1002",
      categoryId: (await prisma.financeCategory.findFirst({ where: { slug: "servicios-medicos" } }))?.id
    }
  });

  const payable = await prisma.payable.create({
    data: {
      legalEntityId: "le1",
      partyId: "party-provider-1",
      date: new Date("2025-01-04"),
      dueDate: new Date("2025-01-20"),
      amount: new Prisma.Decimal(800),
      paidAmount: new Prisma.Decimal(0),
      status: DocStatus.OPEN,
      reference: "COMP-55",
      categoryId: (await prisma.financeCategory.findFirst({ where: { slug: "operacion" } }))?.id,
      attachments: {
        create: [
          {
            fileUrl: "/uploads/finance/demo-factura.pdf",
            fileName: "Factura demo",
            mimeType: "application/pdf",
            sizeBytes: 1024
          }
        ]
      }
    }
  });

  await prisma.payment.createMany({
    data: [
      {
        legalEntityId: "le1",
        type: PaymentType.AR,
        receivableId: receivable.id,
        financialAccountId: finIds["Caja Palín"],
        method: PaymentMethod.CASH,
        date: new Date("2025-01-06"),
        amount: new Prisma.Decimal(200),
        reference: "Abono cliente",
        createdById: "admin-seed"
      },
      {
        legalEntityId: "le1",
        type: PaymentType.AP,
        payableId: payable.id,
        financialAccountId: finIds["Banco BAC"],
        method: PaymentMethod.TRANSFER,
        date: new Date("2025-01-10"),
        amount: new Prisma.Decimal(300),
        reference: "Pago proveedor",
        createdById: "admin-seed"
      }
    ]
  });

  console.info("[seed] RBAC base (permisos y roles)");
  // RBAC base (permisos y roles)
  for (const key of ALL_PERMISSION_KEYS) {
    const [module = "HR", area = "GENERAL", action = "READ"] = key.split(":");
    await prisma.permission.upsert({
      where: { key },
      update: { module, area, action },
      create: { key, module, area, action }
    });
  }

  const roleIds: Record<string, string> = {};
  for (const roleName of Object.keys(ROLE_PERMISSION_MAP)) {
    const saved = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: roleName },
      create: { name: roleName, description: roleName }
    });
    roleIds[roleName] = saved.id;
    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    const permissions = ROLE_PERMISSION_MAP[roleName] || [];
    if (permissions.length) {
      const permRecords = await prisma.permission.findMany({ where: { key: { in: permissions } }, select: { id: true, key: true } });
      const permMap = new Map(permRecords.map((p) => [p.key, p.id]));
      await prisma.rolePermission.createMany({
        data: permissions
          .map((perm) => permMap.get(perm))
          .filter(Boolean)
          .map((permissionId) => ({ roleId: saved.id, permissionId: permissionId! }))
      });
    }
  }

  const departmentMap: Record<string, string> = {};
  for (const dept of hrDepartments) {
    const saved = await prisma.hrDepartment.upsert({
      where: { name: dept.name },
      update: { description: dept.description, isActive: true },
      create: { ...dept, isActive: true, createdById: "admin-seed" }
    });
    departmentMap[dept.name] = saved.id;
  }

  const positionMap: Record<string, string> = {};
  for (const pos of hrPositions) {
    const saved = await prisma.hrPosition.upsert({
      where: { name: pos.name },
      update: { description: pos.description, isActive: true },
      create: { ...pos, isActive: true, createdById: "admin-seed" }
    });
    positionMap[pos.name] = saved.id;
  }

  const branchMap: Record<string, string> = {};
  for (const b of branches) {
    branchMap[b.id] = b.id;
  }

  const entityMap: Record<string, string> = {};
  for (const ent of entities) {
    entityMap[ent.id] = ent.id;
  }

  for (const emp of hrDemoEmployees) {
    const primaryEngagement = emp.engagements?.find((e) => e.isPrimary) || emp.engagements?.[0];
    const primaryLegalEntityId = primaryEngagement ? entityMap[primaryEngagement.legalEntityKey] || primaryEngagement.legalEntityKey : null;
    const status = emp.status as HrEmployeeStatusType;

    const saved = await prisma.hrEmployee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        dpi: emp.dpi,
        email: emp.email || null,
        phoneMobile: emp.phone || null,
        phoneHome: emp.homePhone || null,
        emergencyContactName: emp.emergencyContactName || null,
        emergencyContactPhone: emp.emergencyContactPhone || null,
        addressHome: emp.address || null,
        residenceProofUrl: emp.residenceProofUrl || null,
        dpiPhotoUrl: emp.dpiPhotoUrl || null,
        rtuFileUrl: emp.rtuFileUrl || null,
        status,
        isActive: status !== HrEmployeeStatus.TERMINATED,
        primaryLegalEntityId
      },
      create: {
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        dpi: emp.dpi,
        email: emp.email || null,
        phoneMobile: emp.phone || null,
        phoneHome: emp.homePhone || null,
        emergencyContactName: emp.emergencyContactName || null,
        emergencyContactPhone: emp.emergencyContactPhone || null,
        addressHome: emp.address || null,
        residenceProofUrl: emp.residenceProofUrl || null,
        dpiPhotoUrl: emp.dpiPhotoUrl || null,
        rtuFileUrl: emp.rtuFileUrl || null,
        status,
        isActive: status !== HrEmployeeStatus.TERMINATED,
        primaryLegalEntityId,
        createdById: "admin-seed"
      }
    });

    for (const engagement of emp.engagements || []) {
      const legalEntityId = entityMap[engagement.legalEntityKey] || engagement.legalEntityKey;
      if (!legalEntityId) {
        throw new Error(`Seed RRHH: entidad legal no encontrada para ${emp.employeeCode}`);
      }
      const endDate = "endDate" in engagement ? (engagement as any).endDate : undefined;
      const compensationAmount = "compensationAmount" in engagement ? (engagement as any).compensationAmount : undefined;
      const compensationCurrency = "compensationCurrency" in engagement ? (engagement as any).compensationCurrency : undefined;
      const compensationFrequency = "compensationFrequency" in engagement ? (engagement as any).compensationFrequency : undefined;
      const compensationNotes = "compensationNotes" in engagement ? (engagement as any).compensationNotes : undefined;
      const isPayrollEligible = "isPayrollEligible" in engagement ? (engagement as any).isPayrollEligible : undefined;
      const eng = await prisma.employeeEngagement.upsert({
        where: { id: engagement.id },
        update: {
          employeeId: saved.id,
          legalEntityId,
          employmentType: engagement.employmentType,
          status: engagement.status,
          startDate: engagement.startDate,
          endDate: endDate || null,
          isPrimary: Boolean(engagement.isPrimary),
          isPayrollEligible: isPayrollEligible ?? true,
          compensationAmount: compensationAmount || null,
          compensationCurrency: compensationCurrency || "GTQ",
          compensationFrequency: compensationFrequency || PayFrequency.MONTHLY,
          compensationNotes: compensationNotes || null
        },
        create: {
          id: engagement.id,
          employeeId: saved.id,
          legalEntityId,
          employmentType: engagement.employmentType,
          status: engagement.status,
          startDate: engagement.startDate,
          endDate: endDate || null,
          isPrimary: Boolean(engagement.isPrimary),
          isPayrollEligible: isPayrollEligible ?? true,
          compensationAmount: compensationAmount || null,
          compensationCurrency: compensationCurrency || "GTQ",
          compensationFrequency: compensationFrequency || PayFrequency.MONTHLY,
          compensationNotes: compensationNotes || null,
          createdById: "admin-seed"
        }
      });

      await prisma.employeeCompensation.upsert({
        where: { id: `${eng.id}-base` },
        update: {
          engagementId: eng.id,
          effectiveFrom: engagement.startDate,
          effectiveTo: null,
          baseSalary: compensationAmount || null,
          currency: compensationCurrency || "GTQ",
          payFrequency: compensationFrequency || PayFrequency.MONTHLY,
          allowances: {},
          deductions: {},
          isActive: true
        },
        create: {
          id: `${eng.id}-base`,
          engagementId: eng.id,
          effectiveFrom: engagement.startDate,
          effectiveTo: null,
          baseSalary: compensationAmount || null,
          currency: compensationCurrency || "GTQ",
          payFrequency: compensationFrequency || PayFrequency.MONTHLY,
          allowances: {},
          deductions: {},
          isActive: true,
          createdById: "admin-seed"
        }
      });
    }

    for (const assign of emp.branchAssignments || []) {
      const branchId = branchMap[assign.branchKey] || assign.branchKey;
      if (!branchId) {
        throw new Error(`Seed RRHH: sucursal no encontrada para ${emp.employeeCode}`);
      }
      const branchEndDate = "endDate" in assign ? (assign as any).endDate : undefined;
      await prisma.employeeBranchAssignment.upsert({
        where: { id: assign.id },
        update: {
          employeeId: saved.id,
          branchId,
          isPrimary: Boolean(assign.isPrimary),
          startDate: assign.startDate || null,
          endDate: branchEndDate || null
        },
        create: {
          id: assign.id,
          employeeId: saved.id,
          branchId,
          isPrimary: Boolean(assign.isPrimary),
          startDate: assign.startDate || null,
          endDate: branchEndDate || null,
          createdById: "admin-seed"
        }
      });
    }

    for (const posAssign of emp.positionAssignments || []) {
      const positionId = positionMap[posAssign.positionName];
      const departmentId = posAssign.departmentName ? departmentMap[posAssign.departmentName] : undefined;
      if (!positionId) {
        throw new Error(`Seed RRHH: puesto no encontrado para ${emp.employeeCode}`);
      }
      const posEndDate = "endDate" in posAssign ? (posAssign as any).endDate : undefined;
      const posNotes = "notes" in posAssign ? (posAssign as any).notes : undefined;
      await prisma.employeePositionAssignment.upsert({
        where: { id: posAssign.id },
        update: {
          employeeId: saved.id,
          positionId,
          departmentId: departmentId || null,
          isPrimary: Boolean(posAssign.isPrimary),
          startDate: posAssign.startDate || null,
          endDate: posEndDate || null,
          notes: posNotes || null
        },
        create: {
          id: posAssign.id,
          employeeId: saved.id,
          positionId,
          departmentId: departmentId || null,
          isPrimary: Boolean(posAssign.isPrimary),
          startDate: posAssign.startDate || null,
          endDate: posEndDate || null,
          notes: posNotes || null,
          createdById: "admin-seed"
        }
      });
    }

    for (const doc of emp.documents || []) {
      const docIssuedAt = "issuedAt" in doc ? (doc as any).issuedAt : undefined;
      const docDeliveredAt = "deliveredAt" in doc ? (doc as any).deliveredAt : undefined;
      const docExpiresAt = "expiresAt" in doc ? (doc as any).expiresAt : undefined;
      const docNotes = "notes" in doc ? (doc as any).notes : undefined;
      const retentionSource = docIssuedAt || new Date();
      const retentionUntil = new Date(retentionSource);
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

      await prisma.employeeDocument.upsert({
        where: { id: doc.id },
        update: {
          employeeId: saved.id,
          type: doc.type,
          title: doc.title,
          notes: docNotes || null,
          retentionUntil,
          isArchived: false
        },
        create: {
          id: doc.id,
          employeeId: saved.id,
          type: doc.type,
          title: doc.title,
          notes: docNotes || null,
          retentionUntil,
          isArchived: false,
          createdById: "admin-seed"
        }
      });

      await prisma.employeeDocumentVersion.upsert({
        where: { id: doc.versionId },
        update: {
          documentId: doc.id,
          versionNumber: doc.versionNumber || 1,
          fileUrl: doc.fileUrl,
          issuedAt: docIssuedAt || null,
          deliveredAt: docDeliveredAt || null,
          expiresAt: docExpiresAt || null,
          notes: docNotes || null,
          uploadedById: null
        },
        create: {
          id: doc.versionId,
          documentId: doc.id,
          versionNumber: doc.versionNumber || 1,
          fileUrl: doc.fileUrl,
          issuedAt: docIssuedAt || null,
          deliveredAt: docDeliveredAt || null,
          expiresAt: docExpiresAt || null,
          notes: docNotes || null,
          uploadedById: null
        }
      });

      await prisma.employeeDocument.update({
        where: { id: doc.id },
        data: { currentVersionId: doc.versionId }
      });
    }

    if (emp.professionalLicense) {
      const lic = emp.professionalLicense as any;
      const licNumber = "number" in lic ? lic.number : null;
      const licIssuedAt = "issuedAt" in lic ? lic.issuedAt : null;
      const licExpiresAt = "expiresAt" in lic ? lic.expiresAt : null;
      const licIssuingEntity = "issuingEntity" in lic ? lic.issuingEntity : null;
      const licFileUrl = "fileUrl" in lic ? lic.fileUrl : null;
      const licReminderDays = "reminderDays" in lic ? lic.reminderDays : null;
      const licNotes = "notes" in lic ? lic.notes : null;
      await prisma.professionalLicense.upsert({
        where: { employeeId: saved.id },
        update: {
          applies: emp.professionalLicense.applies ?? false,
          licenseNumber: licNumber,
          issuedAt: licIssuedAt,
          expiresAt: licExpiresAt,
          issuingEntity: licIssuingEntity,
          fileUrl: licFileUrl,
          reminderDays: licReminderDays,
          notes: licNotes
        },
        create: {
          employeeId: saved.id,
          applies: emp.professionalLicense.applies ?? false,
          licenseNumber: licNumber,
          issuedAt: licIssuedAt,
          expiresAt: licExpiresAt,
          issuingEntity: licIssuingEntity,
          fileUrl: licFileUrl,
          reminderDays: licReminderDays,
          notes: licNotes,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  // CRM seed
  const pipelineB2B = await prisma.crmPipeline.upsert({
    where: { id: "pipeline-b2b" },
    update: {
      name: "Pipeline B2B / SSO",
      description: "Empresas y SSO",
      stages: {
        deleteMany: {},
        create: [
          { stage: CrmDealStage.NUEVO, probabilityPct: 5, slaDays: 1, expectedActions: ["Contactar en 24h"], order: 1 },
          { stage: CrmDealStage.CONTACTADO, probabilityPct: 15, slaDays: 2, expectedActions: ["Validar servicios de interés"], order: 2 },
          { stage: CrmDealStage.DIAGNOSTICO, probabilityPct: 30, slaDays: 5, expectedActions: ["Visita / levantamiento"], order: 3 },
          { stage: CrmDealStage.COTIZACION, probabilityPct: 45, slaDays: 3, expectedActions: ["Enviar cotización"], order: 4 },
          { stage: CrmDealStage.NEGOCIACION, probabilityPct: 65, slaDays: 5, expectedActions: ["Revisión y ajustes"], order: 5 },
          { stage: CrmDealStage.GANADO, probabilityPct: 100, slaDays: 0, expectedActions: ["Implementar"], order: 6 },
          { stage: CrmDealStage.PERDIDO, probabilityPct: 0, slaDays: 0, expectedActions: ["Registrar motivo"], order: 7 }
        ]
      }
    },
    create: {
      id: "pipeline-b2b",
      type: CrmPipelineType.B2B,
      name: "Pipeline B2B / SSO",
      description: "Empresas y SSO",
      stages: {
        create: [
          { stage: CrmDealStage.NUEVO, probabilityPct: 5, slaDays: 1, expectedActions: ["Contactar en 24h"], order: 1 },
          { stage: CrmDealStage.CONTACTADO, probabilityPct: 15, slaDays: 2, expectedActions: ["Validar servicios de interés"], order: 2 },
          { stage: CrmDealStage.DIAGNOSTICO, probabilityPct: 30, slaDays: 5, expectedActions: ["Visita / levantamiento"], order: 3 },
          { stage: CrmDealStage.COTIZACION, probabilityPct: 45, slaDays: 3, expectedActions: ["Enviar cotización"], order: 4 },
          { stage: CrmDealStage.NEGOCIACION, probabilityPct: 65, slaDays: 5, expectedActions: ["Revisión y ajustes"], order: 5 },
          { stage: CrmDealStage.GANADO, probabilityPct: 100, slaDays: 0, expectedActions: ["Implementar"], order: 6 },
          { stage: CrmDealStage.PERDIDO, probabilityPct: 0, slaDays: 0, expectedActions: ["Registrar motivo"], order: 7 }
        ]
      }
    }
  });

  const pipelineB2C = await prisma.crmPipeline.upsert({
    where: { id: "pipeline-b2c" },
    update: {
      name: "Pipeline B2C Pacientes",
      description: "Consultas, laboratorio, membresías",
      stages: {
        deleteMany: {},
        create: [
          { stage: CrmDealStage.NUEVO, probabilityPct: 10, slaDays: 1, expectedActions: ["Llamar en 15 min"], order: 1 },
          { stage: CrmDealStage.CONTACTADO, probabilityPct: 25, slaDays: 1, expectedActions: ["Programar cita"], order: 2 },
          { stage: CrmDealStage.DIAGNOSTICO, probabilityPct: 40, slaDays: 2, expectedActions: ["Evaluación / orden"], order: 3 },
          { stage: CrmDealStage.COTIZACION, probabilityPct: 55, slaDays: 2, expectedActions: ["Enviar precios / orden"], order: 4 },
          { stage: CrmDealStage.NEGOCIACION, probabilityPct: 70, slaDays: 3, expectedActions: ["Confirmar asistencia"], order: 5 },
          { stage: CrmDealStage.GANADO, probabilityPct: 100, slaDays: 0, expectedActions: ["Atender / facturar"], order: 6 },
          { stage: CrmDealStage.PERDIDO, probabilityPct: 0, slaDays: 0, expectedActions: ["Registrar motivo"], order: 7 }
        ]
      }
    },
    create: {
      id: "pipeline-b2c",
      type: CrmPipelineType.B2C,
      name: "Pipeline B2C Pacientes",
      description: "Consultas, laboratorio, membresías",
      stages: {
        create: [
          { stage: CrmDealStage.NUEVO, probabilityPct: 10, slaDays: 1, expectedActions: ["Llamar en 15 min"], order: 1 },
          { stage: CrmDealStage.CONTACTADO, probabilityPct: 25, slaDays: 1, expectedActions: ["Programar cita"], order: 2 },
          { stage: CrmDealStage.DIAGNOSTICO, probabilityPct: 40, slaDays: 2, expectedActions: ["Evaluación / orden"], order: 3 },
          { stage: CrmDealStage.COTIZACION, probabilityPct: 55, slaDays: 2, expectedActions: ["Enviar precios / orden"], order: 4 },
          { stage: CrmDealStage.NEGOCIACION, probabilityPct: 70, slaDays: 3, expectedActions: ["Confirmar asistencia"], order: 5 },
          { stage: CrmDealStage.GANADO, probabilityPct: 100, slaDays: 0, expectedActions: ["Atender / facturar"], order: 6 },
          { stage: CrmDealStage.PERDIDO, probabilityPct: 0, slaDays: 0, expectedActions: ["Registrar motivo"], order: 7 }
        ]
      }
    }
  });

  const lead1 = await prisma.crmLead.create({
    data: {
      leadType: "PATIENT",
      personName: "María Gómez",
      email: "maria@example.com",
      phone: "50255555555",
      source: "Web",
      status: "NEW",
      notes: "Interesada en rayos X",
      createdById: "ventas-1"
    }
  });

  const account1 = await prisma.crmAccount.create({
    data: {
      name: "Clinica San Pedro",
      sector: "Salud",
      address: "Zona 1, Escuintla",
      nit: "CF",
      creditTerm: "30",
      ownerId: "ventas-1",
      createdById: "ventas-1"
    }
  });

  const contact = await prisma.crmContact.create({
    data: {
      accountId: account1.id,
      type: "COMPANY_CONTACT",
      firstName: "Carlos",
      lastName: "Méndez",
      position: "Compras",
      email: "compras@clinicsp.com",
      phone: "50244445555",
      createdById: "ventas-1"
    }
  });

  const deal = await prisma.crmDeal.create({
    data: {
      pipelineType: CrmPipelineType.B2B,
      pipelineId: pipelineB2B.id,
      stage: CrmDealStage.CONTACTADO,
      amount: new Prisma.Decimal(15000),
      amountEstimated: new Prisma.Decimal(15000),
      probabilityPct: 25,
      expectedCloseDate: new Date("2025-02-15"),
      ownerId: "ventas-1",
      accountId: account1.id,
      contactId: contact.id,
      notes: "Paquete de convenios empresariales",
      createdById: "ventas-1",
      services: {
        createMany: {
          data: [
            { serviceType: CrmServiceType.CLINICAS_EMPRESARIALES },
            { serviceType: CrmServiceType.SSO }
          ]
        }
      }
    }
  });

  await prisma.crmActivity.createMany({
    data: [
      {
        dealId: deal.id,
      accountId: account1.id,
      contactId: contact.id,
      type: CrmActivityType.CALL,
      dateTime: new Date(),
      summary: "Llamada inicial",
      notes: "Solicitar info de convenios",
      createdById: "ventas-1"
    },
    {
      dealId: deal.id,
      accountId: account1.id,
      contactId: contact.id,
      type: CrmActivityType.EMAIL,
      dateTime: new Date(),
      summary: "Envío brochure",
      notes: "Enviar propuesta",
      createdById: "ventas-1"
    }
    ]
  });

  await prisma.crmTask.createMany({
    data: [
      {
        ownerId: "ventas-1",
        dealId: deal.id,
        dueDate: new Date("2025-01-10"),
        title: "Agendar demo con Clinica San Pedro",
        status: CrmTaskStatus.OPEN,
        priority: CrmTaskPriority.HIGH,
        createdById: "ventas-1"
      },
      {
        ownerId: "ventas-2",
        dueDate: new Date("2025-01-08"),
        title: "Dar seguimiento a lead web",
        status: CrmTaskStatus.IN_PROGRESS,
        priority: CrmTaskPriority.MEDIUM,
        createdById: "ventas-2"
      }
    ]
  });

  // Quote v2 seed
  const bankAccounts = [
    {
      bank: "BAC",
      accountNumber: "200045612-1",
      accountName: "StarMedical, S.A.",
      currency: "GTQ",
      accountType: "Monetaria"
    },
    {
      bank: "BI",
      accountNumber: "120-554166-2",
      accountName: "StarMedical, S.A.",
      currency: "USD",
      accountType: "Monetaria"
    }
  ];

  const quoteTemplates = [
    {
      id: "quote-template-b2c-simple",
      name: "B2C Simple (Diprolab)",
      type: QuoteType.B2C,
      isDefault: true,
      sectionsJson: {
        sections: [
          { key: "header", label: "Encabezado", enabled: true },
          { key: "client", label: "Datos cliente", enabled: true },
          { key: "items", label: "Productos/Servicios", enabled: true },
          { key: "totals", label: "Totales", enabled: true },
          { key: "notes", label: "Observaciones", enabled: true },
          { key: "banks", label: "Datos bancarios", enabled: true }
        ]
      },
      headerJson: {
        companyName: "StarMedical",
        address: "Ciudad de Guatemala",
        phone: "+502 2456-7890",
        email: "ventas@starmedical.com",
        logoUrl: "/assets/quotes/starmedical-logo.png"
      },
      termsHtml: "<p>Precios incluyen IVA y pueden variar según existencias. Garantía según fabricante.</p>",
      bankAccountsJson: bankAccounts
    },
    {
      id: "quote-template-b2b-propuesta",
      name: "B2B Propuesta",
      type: QuoteType.B2B,
      isDefault: true,
      sectionsJson: {
        sections: [
          { key: "cover", label: "Portada", enabled: true },
          { key: "letter", label: "Carta de presentación", enabled: true },
          { key: "experience", label: "Logos experiencia", enabled: true },
          { key: "quote", label: "Cotización", enabled: true },
          { key: "terms", label: "Términos", enabled: true },
          { key: "banks", label: "Datos bancarios", enabled: true }
        ]
      },
      headerJson: {
        companyName: "StarMedical",
        address: "Ciudad de Guatemala",
        phone: "+502 2456-7890",
        email: "ventas@starmedical.com",
        logoUrl: "/assets/quotes/starmedical-logo.png",
        tagline: "Soluciones médicas y SSO para empresas"
      },
      coverImageUrl: "/assets/quotes/cover-b2b-default.jpg",
      introLetterHtml:
        "<p>Estimado {{clientName}},</p><p>Adjuntamos nuestra propuesta para {{services}} con el detalle comercial y operativo.</p><p>Quedamos atentos a programar una reunión para resolver dudas.</p>",
      experienceLogosJson: [
        { name: "Cliente 1", logoUrl: "/assets/quotes/logos/cliente1.png" },
        { name: "Cliente 2", logoUrl: "/assets/quotes/logos/cliente2.png" }
      ],
      termsHtml:
        "<ul><li>Precios en GTQ, vigencia 15 días.</li><li>Los servicios se calendarizan en coordinación con su equipo.</li><li>Se requiere orden de compra o aprobación escrita.</li></ul>",
      bankAccountsJson: bankAccounts
    }
  ];

  for (const template of quoteTemplates) {
    await prisma.quoteTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        type: template.type,
        isDefault: template.isDefault,
        sectionsJson: template.sectionsJson,
        headerJson: template.headerJson,
        coverImageUrl: template.coverImageUrl,
        introLetterHtml: template.introLetterHtml,
        experienceLogosJson: template.experienceLogosJson,
        termsHtml: template.termsHtml,
        bankAccountsJson: template.bankAccountsJson
      },
      create: template
    });
  }

  const b2cTemplate = quoteTemplates[0];
  const b2bTemplate = quoteTemplates[1];

  await prisma.quoteSettings.upsert({
    where: { id: 1 },
    update: {
      defaultTemplateB2BId: b2bTemplate.id,
      defaultTemplateB2CId: b2cTemplate.id,
      defaultValidityDays: 15,
      defaultIntroLetterHtml: b2bTemplate.introLetterHtml,
      defaultTermsB2BHtml: b2bTemplate.termsHtml,
      defaultTermsB2CHtml: b2cTemplate.termsHtml,
      defaultFooterJson: {
        text: "Gracias por confiar en StarMedical. Nuestro equipo queda atento a tus comentarios."
      },
      defaultBankAccountsJson: bankAccounts,
      defaultChequePayableTo: "StarMedical, S.A.",
      defaultPaymentTerms: "Pago contra entrega o transferencia previa.",
      defaultDeliveryTime: "Entrega en 3-5 días hábiles según disponibilidad.",
      defaultDeliveryNote: "Coordinaremos la entrega con tu equipo una vez recibida la aprobación.",
      showTaxIncludedText: true,
      showBankBlock: true
    },
    create: {
      id: 1,
      defaultTemplateB2BId: b2bTemplate.id,
      defaultTemplateB2CId: b2cTemplate.id,
      defaultValidityDays: 15,
      defaultIntroLetterHtml: b2bTemplate.introLetterHtml,
      defaultTermsB2BHtml: b2bTemplate.termsHtml,
      defaultTermsB2CHtml: b2cTemplate.termsHtml,
      defaultFooterJson: {
        text: "Gracias por confiar en StarMedical. Nuestro equipo queda atento a tus comentarios."
      },
      defaultBankAccountsJson: bankAccounts,
      defaultChequePayableTo: "StarMedical, S.A.",
      defaultPaymentTerms: "Pago contra entrega o transferencia previa.",
      defaultDeliveryTime: "Entrega en 3-5 días hábiles según disponibilidad.",
      defaultDeliveryNote: "Coordinaremos la entrega con tu equipo una vez recibida la aprobación.",
      showTaxIncludedText: true,
      showBankBlock: true
    }
  });

  console.info("[seed] Diagnósticos (catálogo y órdenes demo)");

  const diagnosticPatients = [
    { id: "diag-patient-ana", firstName: "Ana", lastName: "López García", dpi: "100000000001", email: "ana.paciente@starmedical.test", phone: "50255580001" },
    { id: "diag-patient-carlos", firstName: "Carlos", lastName: "Pérez Díaz", dpi: "100000000002", email: "carlos.paciente@starmedical.test", phone: "50255580002" },
    { id: "diag-patient-maria", firstName: "María", lastName: "Ramírez Soto", dpi: "100000000003", email: "maria.paciente@starmedical.test", phone: "50255580003" }
  ];

  for (const patient of diagnosticPatients) {
    await prisma.clientProfile.upsert({
      where: { id: patient.id },
      update: {
        type: ClientProfileType.PERSON,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dpi: patient.dpi,
        email: patient.email,
        phone: patient.phone
      },
      create: {
        id: patient.id,
        type: ClientProfileType.PERSON,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dpi: patient.dpi,
        email: patient.email,
        phone: patient.phone
      }
    });
  }

  const labCatalog = [
    { id: "diag-cat-lab-cbc", code: "LAB-CBC", name: "Hemograma completo", price: 180, kind: DiagnosticItemKind.LAB, unit: "panel", refLow: null, refHigh: null },
    { id: "diag-cat-lab-glu", code: "LAB-GLU", name: "Glucosa en ayuno", price: 60, kind: DiagnosticItemKind.LAB, unit: "mg/dL", refLow: 70, refHigh: 110 },
    { id: "diag-cat-lab-lipid", code: "LAB-LIPID", name: "Perfil lipídico", price: 220, kind: DiagnosticItemKind.LAB, unit: "panel", refLow: null, refHigh: null },
    { id: "diag-cat-lab-urea", code: "LAB-UREA", name: "Urea", price: 70, kind: DiagnosticItemKind.LAB, unit: "mg/dL", refLow: 15, refHigh: 40 },
    { id: "diag-cat-lab-crea", code: "LAB-CREA", name: "Creatinina", price: 75, kind: DiagnosticItemKind.LAB, unit: "mg/dL", refLow: 0.5, refHigh: 1.2 },
    { id: "diag-cat-lab-chol", code: "LAB-CHOL", name: "Colesterol total", price: 90, kind: DiagnosticItemKind.LAB, unit: "mg/dL", refLow: 125, refHigh: 200 },
    { id: "diag-cat-lab-tg", code: "LAB-TG", name: "Triglicéridos", price: 95, kind: DiagnosticItemKind.LAB, unit: "mg/dL", refLow: 0, refHigh: 150 },
    { id: "diag-cat-lab-hba1c", code: "LAB-HBA1C", name: "Hemoglobina glicosilada", price: 210, kind: DiagnosticItemKind.LAB, unit: "%", refLow: 4, refHigh: 6 },
    { id: "diag-cat-lab-ua", code: "LAB-UA", name: "Examen general de orina", price: 80, kind: DiagnosticItemKind.LAB, unit: "panel", refLow: null, refHigh: null },
    { id: "diag-cat-lab-ag", code: "LAB-AG", name: "Antígeno viral", price: 160, kind: DiagnosticItemKind.LAB, unit: null, refLow: null, refHigh: null },
    { id: "diag-cat-lab-psa", code: "LAB-PSA", name: "Antígeno prostático (PSA)", price: 240, kind: DiagnosticItemKind.LAB, unit: "ng/mL", refLow: 0, refHigh: 4 },
    { id: "diag-cat-lab-tsh", code: "LAB-TSH", name: "TSH", price: 200, kind: DiagnosticItemKind.LAB, unit: "uUI/mL", refLow: 0.4, refHigh: 4.5 },
    { id: "diag-cat-lab-t4", code: "LAB-T4", name: "T4 Libre", price: 190, kind: DiagnosticItemKind.LAB, unit: "ng/dL", refLow: 0.8, refHigh: 1.8 },
    { id: "diag-cat-lab-vitd", code: "LAB-VITD", name: "Vitamina D", price: 260, kind: DiagnosticItemKind.LAB, unit: "ng/mL", refLow: 20, refHigh: 60 },
    { id: "diag-cat-lab-fer", code: "LAB-FERR", name: "Ferritina", price: 175, kind: DiagnosticItemKind.LAB, unit: "ng/mL", refLow: 30, refHigh: 400 },
    { id: "diag-cat-lab-fe", code: "LAB-FE", name: "Hierro sérico", price: 130, kind: DiagnosticItemKind.LAB, unit: "ug/dL", refLow: 60, refHigh: 170 },
    { id: "diag-cat-lab-lft", code: "LAB-LFT", name: "Perfil hepático", price: 260, kind: DiagnosticItemKind.LAB, unit: "panel", refLow: null, refHigh: null },
    { id: "diag-cat-lab-elec", code: "LAB-ELEC", name: "Electrolitos (Na/K/Cl)", price: 150, kind: DiagnosticItemKind.LAB, unit: "mmol/L", refLow: null, refHigh: null },
    { id: "diag-cat-lab-dimero", code: "LAB-DD", name: "Dímero D", price: 280, kind: DiagnosticItemKind.LAB, unit: "ng/mL", refLow: 0, refHigh: 500 },
    { id: "diag-cat-lab-crp", code: "LAB-CRP", name: "Proteína C reactiva", price: 140, kind: DiagnosticItemKind.LAB, unit: "mg/L", refLow: 0, refHigh: 5 }
  ];

  const imagingCatalog = [
    { id: "diag-cat-img-chest", code: "IMG-XR-CH", name: "RX Tórax PA/Lateral", price: 350, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.XR },
    { id: "diag-cat-img-hand", code: "IMG-XR-HAND", name: "RX Mano", price: 280, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.XR },
    { id: "diag-cat-img-cspine", code: "IMG-XR-CSPINE", name: "RX Columna cervical", price: 320, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.XR },
    { id: "diag-cat-img-knee", code: "IMG-XR-KNEE", name: "RX Rodilla AP/LAT", price: 300, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.XR },
    { id: "diag-cat-img-ankle", code: "IMG-XR-ANK", name: "RX Tobillo", price: 290, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.XR },
    { id: "diag-cat-img-us-abdo", code: "IMG-US-ABDO", name: "US Abdomen completo", price: 450, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.US },
    { id: "diag-cat-img-us-ob", code: "IMG-US-OB", name: "US Obstétrico 1er trimestre", price: 500, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.US },
    { id: "diag-cat-img-us-renal", code: "IMG-US-RENAL", name: "US Renal y vías urinarias", price: 420, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.US },
    { id: "diag-cat-img-us-pelv", code: "IMG-US-PELV", name: "US Pélvico ginecológico", price: 440, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.US },
    { id: "diag-cat-img-us-thy", code: "IMG-US-THY", name: "US Tiroides", price: 410, kind: DiagnosticItemKind.IMAGING, modality: ImagingModality.US }
  ];

  for (const item of [...labCatalog, ...imagingCatalog]) {
    await prisma.diagnosticCatalogItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        price: new Prisma.Decimal(item.price),
        kind: item.kind,
        modality: "modality" in item ? item.modality || null : null,
        unit: "unit" in item ? item.unit || null : null,
        refLow:
          "refLow" in item && item.refLow !== null && item.refLow !== undefined ? new Prisma.Decimal(item.refLow) : null,
        refHigh:
          "refHigh" in item && item.refHigh !== null && item.refHigh !== undefined ? new Prisma.Decimal(item.refHigh) : null,
        isActive: true
      },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        price: new Prisma.Decimal(item.price),
        kind: item.kind,
        modality: "modality" in item ? item.modality || null : null,
        unit: "unit" in item ? item.unit || null : null,
        refLow:
          "refLow" in item && item.refLow !== null && item.refLow !== undefined ? new Prisma.Decimal(item.refLow) : null,
        refHigh:
          "refHigh" in item && item.refHigh !== null && item.refHigh !== undefined ? new Prisma.Decimal(item.refHigh) : null,
        isActive: true
      }
    });
  }

  const catalogRecords = await prisma.diagnosticCatalogItem.findMany();
  const catalogByCode = new Map(catalogRecords.map((c) => [c.code, c]));

  type SeedOrderItem = {
    id: string;
    code: string;
    status: DiagnosticItemStatusType;
    priority?: string;
    specimen?: { id: string; code: string; collectedAt: Date };
    result?: {
      testCode?: string;
      valueText?: string;
      valueNumber?: number;
      unit?: string;
      refLow?: number;
      refHigh?: number;
      flag?: LabResultFlagType | null;
      resultAt?: Date;
      validatedAt?: Date;
      releasedAt?: Date;
    };
    study?: {
      id: string;
      orthancStudyId: string;
      studyInstanceUID: string;
      modality: ImagingModalityType;
      receivedAt?: Date | null;
    };
    report?: {
      id: string;
      status: ReportStatusType;
      findings?: string | null;
      impression?: string | null;
      signedAt?: Date | null;
      releasedAt?: Date | null;
    };
  };

  type SeedOrder = {
    id: string;
    patientId: string;
    branchId: string;
    status: DiagnosticOrderStatusType;
    orderedAt: Date;
    notes?: string;
    items: SeedOrderItem[];
  };

  const diagnosticOrders: SeedOrder[] = [
    {
      id: "diag-order-1",
      patientId: diagnosticPatients[0].id,
      branchId: "s1",
      status: DiagnosticOrderStatus.DRAFT,
      orderedAt: new Date("2025-01-12T10:00:00Z"),
      notes: "Orden en borrador a la espera de pago",
      items: [
        { id: "diag-item-1", code: "LAB-CBC", status: DiagnosticItemStatus.ORDERED, priority: "Rutina" },
        { id: "diag-item-2", code: "LAB-GLU", status: DiagnosticItemStatus.ORDERED, priority: "Ayuno" }
      ]
    },
    {
      id: "diag-order-2",
      patientId: diagnosticPatients[1].id,
      branchId: "s1",
      status: DiagnosticOrderStatus.IN_PROGRESS,
      orderedAt: new Date("2025-01-10T08:30:00Z"),
      notes: "Bioquímica en proceso",
      items: [
        {
          id: "diag-item-3",
          code: "LAB-CHOL",
          status: DiagnosticItemStatus.PENDING_VALIDATION,
          priority: "Rutina",
          specimen: { id: "diag-spec-1", code: "SP-0001", collectedAt: new Date("2025-01-10T09:00:00Z") },
          result: {
            testCode: "LAB-CHOL",
            valueNumber: 205,
            unit: "mg/dL",
            refLow: 125,
            refHigh: 200,
            flag: LabResultFlag.HIGH,
            resultAt: new Date("2025-01-10T11:00:00Z")
          }
        },
        {
          id: "diag-item-4",
          code: "LAB-HBA1C",
          status: DiagnosticItemStatus.COLLECTED,
          priority: "Control trimestral",
          specimen: { id: "diag-spec-2", code: "SP-0002", collectedAt: new Date("2025-01-10T09:15:00Z") }
        }
      ]
    },
    {
      id: "diag-order-3",
      patientId: diagnosticPatients[2].id,
      branchId: "s2",
      status: DiagnosticOrderStatus.RELEASED,
      orderedAt: new Date("2025-01-08T14:00:00Z"),
      notes: "Estudio de imagen liberado",
      items: [
        {
          id: "diag-item-5",
          code: "IMG-US-ABDO",
          status: DiagnosticItemStatus.RELEASED,
          priority: "Prioridad media",
          study: {
            id: "diag-study-1",
            orthancStudyId: "ORTH-12345",
            studyInstanceUID: "1.2.840.10008.1.2.12345.1",
            modality: ImagingModality.US,
            receivedAt: new Date("2025-01-08T15:00:00Z")
          },
          report: {
            id: "diag-report-1",
            status: ReportStatus.RELEASED,
            findings: "Hígado sin lesiones focales. Vesícula sin litos.",
            impression: "Estudio abdominal dentro de parámetros normales.",
            signedAt: new Date("2025-01-08T16:00:00Z"),
            releasedAt: new Date("2025-01-08T16:15:00Z")
          }
        }
      ]
    }
  ];

  for (const order of diagnosticOrders) {
    await prisma.$transaction(async (tx) => {
      await tx.diagnosticOrder.upsert({
        where: { id: order.id },
        update: {
          patientId: order.patientId,
          branchId: order.branchId,
          status: order.status,
          orderedAt: order.orderedAt,
          notes: order.notes || null
        },
        create: {
          id: order.id,
          patientId: order.patientId,
          branchId: order.branchId,
          status: order.status,
          orderedAt: order.orderedAt,
          notes: order.notes || null,
          totalAmount: new Prisma.Decimal(0)
        }
      });

      await tx.diagnosticOrderItem.deleteMany({ where: { orderId: order.id } });
      let totalAmount = new Prisma.Decimal(0);

      for (const item of order.items) {
        const catalog = catalogByCode.get(item.code);
        if (!catalog) continue;
        const createdItem = await tx.diagnosticOrderItem.create({
          data: {
            id: item.id,
            orderId: order.id,
            kind: catalog.kind,
            catalogItemId: catalog.id,
            status: item.status,
            priority: item.priority || null
          }
        });
        totalAmount = totalAmount.add(catalog.price as PrismaTypes.Decimal);

        if ("specimen" in item && item.specimen) {
          await tx.labSpecimen.create({
            data: {
              id: item.specimen.id,
              orderItemId: createdItem.id,
              specimenCode: item.specimen.code,
              collectedAt: item.specimen.collectedAt,
              collectedByUserId: null
            }
          });
        }

        if ("result" in item && item.result) {
          await tx.labResult.create({
            data: {
              orderItemId: createdItem.id,
              testCode: item.result.testCode || null,
              valueText: item.result.valueText || null,
              valueNumber:
                item.result.valueNumber !== undefined && item.result.valueNumber !== null
                  ? new Prisma.Decimal(item.result.valueNumber)
                  : null,
              unit: item.result.unit || null,
              refLow:
                item.result.refLow !== undefined && item.result.refLow !== null
                  ? new Prisma.Decimal(item.result.refLow)
                  : null,
              refHigh:
                item.result.refHigh !== undefined && item.result.refHigh !== null
                  ? new Prisma.Decimal(item.result.refHigh)
                  : null,
              flag: item.result.flag || null,
              resultAt: item.result.resultAt,
              enteredByUserId: null,
              validatedAt: item.result.validatedAt || null,
              releasedAt: item.result.releasedAt || null
            }
          });
        }

        if ("study" in item && item.study) {
          const study = await tx.imagingStudy.create({
            data: {
              id: item.study.id,
              orderItemId: createdItem.id,
              orthancStudyId: item.study.orthancStudyId,
              studyInstanceUID: item.study.studyInstanceUID,
              modality: item.study.modality,
              receivedAt: item.study.receivedAt
            }
          });

          if ("report" in item && item.report) {
            await tx.imagingReport.create({
              data: {
                id: item.report.id,
                imagingStudyId: study.id,
                status: item.report.status,
                findings: item.report.findings || null,
                impression: item.report.impression || null,
                createdByUserId: null,
                signedByUserId: null,
                signedAt: item.report.signedAt || null,
                releasedAt: item.report.releasedAt || null
              }
            });
          }
        }
      }

      await tx.diagnosticOrder.update({
        where: { id: order.id },
        data: { totalAmount, status: order.status }
      });
    });
  }

  console.info("[seed] LabTest operativo (demo)");

  const labInventoryArea = await prisma.inventoryArea.upsert({
    where: { slug: "lab" },
    update: { name: "Laboratorio Clínico", isExternal: false },
    create: { id: "inv-area-lab", name: "Laboratorio Clínico", slug: "lab", isExternal: false, order: 1 }
  });

  const labPatients = [
    { id: "lab-pt-juan", firstName: "Juan", lastName: "Pérez", docId: "DPI-9001", phone: "50255551111", email: "juan.perez@test.gt" },
    { id: "lab-pt-maria", firstName: "María", lastName: "Gómez", docId: "DPI-9002", phone: "50255552222", email: "maria.gomez@test.gt" },
    { id: "lab-pt-carlos", firstName: "Carlos", lastName: "López", docId: "DPI-9003", phone: "50255553333", email: "carlos.lopez@test.gt" }
  ];

  const labPatientMap: Record<string, string> = {};
  for (const pt of labPatients) {
    const saved = await prisma.labPatient.upsert({
      where: { id: pt.id },
      update: { firstName: pt.firstName, lastName: pt.lastName, docId: pt.docId, phone: pt.phone, email: pt.email },
      create: { ...pt }
    });
    labPatientMap[pt.id] = saved.id;
  }

  await prisma.labTestSetting.upsert({
    where: { id: "labtest-default" },
    update: {
      defaultMessage: "Resultados listos. Gracias por confiar en StarMedical.",
      slaRoutineMin: 720,
      slaUrgentMin: 180,
      slaStatMin: 60,
      defaultChannel: LabMessageChannel.EMAIL,
      logsResetDaily: true,
      logsPrefixSpecimen: "LAB",
      logsPrefixReport: "RPT",
      workbenchAutoInProcess: false,
      templatesPreviewMode: "HTML",
      reportsDefaultRangeDays: 7
    },
    create: {
      id: "labtest-default",
      defaultMessage: "Resultados listos. Gracias por confiar en StarMedical.",
      slaRoutineMin: 720,
      slaUrgentMin: 180,
      slaStatMin: 60,
      defaultChannel: LabMessageChannel.EMAIL,
      logsResetDaily: true,
      logsPrefixSpecimen: "LAB",
      logsPrefixReport: "RPT",
      workbenchAutoInProcess: false,
      templatesPreviewMode: "HTML",
      reportsDefaultRangeDays: 7
    }
  });

  const labTemplates = [
    {
      id: "lab-tpl-standard",
      title: "Informe estándar StarMedical",
      area: LabArea.HEMATOLOGY,
      html:
        "<div style='font-family: Nunito Sans, sans-serif; padding:16px'><header style='border-bottom:4px solid #2e75ba; padding-bottom:8px; margin-bottom:12px'><h2 style='color:#2e75ba;margin:0;'>StarMedical Laboratorio Clínico</h2><p style='color:#4aa59c;margin:0;'>Reporte de laboratorio</p></header><p><strong>Paciente:</strong> {{patient.name}}</p><p><strong>Orden:</strong> {{order.code}}</p><div>{{results.table}}</div><footer style='margin-top:16px; color:#4aadf5'>Emitido por StarMedical ERP</footer></div>",
      isDefault: true
    }
  ];

  for (const tpl of labTemplates) {
    await prisma.labTemplate.upsert({
      where: { id: tpl.id },
      update: { title: tpl.title, area: tpl.area, html: tpl.html, isDefault: tpl.isDefault },
      create: tpl
    });
  }

  const labCatalogCategories = [
    { id: "lab-cat-hema", name: "Hematología", order: 1 },
    { id: "lab-cat-chem", name: "Química Clínica", order: 2 }
  ];

  const labCatalogSubcategories = [
    { id: "lab-sub-hema-cbc", categoryId: "lab-cat-hema", name: "Hemograma", order: 1 },
    { id: "lab-sub-chem-basic", categoryId: "lab-cat-chem", name: "Perfil básico", order: 1 }
  ];

  const labCatalogTests = [
    { id: "lab-test-hb", code: "HB", name: "Hemoglobina", area: LabArea.HEMATOLOGY, categoryId: "lab-cat-hema", subcategoryId: "lab-sub-hema-cbc", sampleTypeDefault: LabSampleType.BLOOD },
    { id: "lab-test-hto", code: "HTO", name: "Hematocrito", area: LabArea.HEMATOLOGY, categoryId: "lab-cat-hema", subcategoryId: "lab-sub-hema-cbc", sampleTypeDefault: LabSampleType.BLOOD },
    { id: "lab-test-glu", code: "GLU", name: "Glucosa", area: LabArea.CHEMISTRY, categoryId: "lab-cat-chem", subcategoryId: "lab-sub-chem-basic", sampleTypeDefault: LabSampleType.BLOOD },
    { id: "lab-test-bun", code: "BUN", name: "BUN", area: LabArea.CHEMISTRY, categoryId: "lab-cat-chem", subcategoryId: "lab-sub-chem-basic", sampleTypeDefault: LabSampleType.BLOOD },
    { id: "lab-test-crea", code: "CREA", name: "Creatinina", area: LabArea.CHEMISTRY, categoryId: "lab-cat-chem", subcategoryId: "lab-sub-chem-basic", sampleTypeDefault: LabSampleType.BLOOD }
  ];

  const catMap: Record<string, string> = {};
  for (const cat of labCatalogCategories) {
    const saved = await prisma.labTestCatalogCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name, order: cat.order, isActive: true },
      create: { ...cat, isActive: true }
    });
    catMap[cat.id] = saved.id;
  }

  const subcatMap: Record<string, string> = {};
  for (const sub of labCatalogSubcategories) {
    const categoryId = catMap[sub.categoryId] || sub.categoryId;
    const saved = await prisma.labTestCatalogSubcategory.upsert({
      where: { id: sub.id },
      update: { categoryId, name: sub.name, order: sub.order, isActive: true },
      create: { ...sub, categoryId, isActive: true }
    });
    subcatMap[sub.id] = saved.id;
  }

  for (const test of labCatalogTests) {
    await prisma.labTestCatalogTest.upsert({
      where: { id: test.id },
      update: {
        code: test.code,
        name: test.name,
        area: test.area,
        categoryId: catMap[test.categoryId] || null,
        subcategoryId: subcatMap[test.subcategoryId] || null,
        sampleTypeDefault: test.sampleTypeDefault,
        isActive: true
      },
      create: {
        ...test,
        categoryId: catMap[test.categoryId] || null,
        subcategoryId: subcatMap[test.subcategoryId] || null,
        isActive: true
      }
    });
  }

  const labTemplatesV2 = [
    {
      id: "lab-tpl2-hema",
      title: "Hematología Estándar",
      area: LabArea.HEMATOLOGY,
      headerHtml:
        "<div style='font-family: Nunito Sans, sans-serif; padding:12px'><h3 style='color:#2e75ba;margin:0;'>Reporte Hematología</h3><p style='margin:0;color:#4aa59c'>StarMedical</p></div>",
      footerHtml: "<div style='font-size:12px;color:#4aa59c;padding:12px'>Emitido por StarMedical ERP</div>",
      isDefault: true
    },
    {
      id: "lab-tpl2-chem",
      title: "Química Clínica Básica",
      area: LabArea.CHEMISTRY,
      headerHtml:
        "<div style='font-family: Nunito Sans, sans-serif; padding:12px'><h3 style='color:#2e75ba;margin:0;'>Reporte Química</h3><p style='margin:0;color:#4aa59c'>StarMedical</p></div>",
      footerHtml: "<div style='font-size:12px;color:#4aa59c;padding:12px'>Emitido por StarMedical ERP</div>",
      isDefault: true
    }
  ];

  const tplV2Map: Record<string, string> = {};
  for (const tpl of labTemplatesV2) {
    const saved = await prisma.labTemplateV2.upsert({
      where: { id: tpl.id },
      update: {
        title: tpl.title,
        area: tpl.area,
        headerHtml: tpl.headerHtml,
        footerHtml: tpl.footerHtml,
        isDefault: tpl.isDefault
      },
      create: { ...tpl }
    });
    tplV2Map[tpl.id] = saved.id;
  }

  const labTemplateFields = [
    {
      id: "lab-tpl2-hema-hb",
      templateId: "lab-tpl2-hema",
      key: "hb",
      label: "Hemoglobina",
      dataType: LabTemplateFieldDataType.NUMBER,
      unitDefault: "g/dL",
      refLowDefault: new Prisma.Decimal(12),
      refHighDefault: new Prisma.Decimal(16),
      order: 1
    },
    {
      id: "lab-tpl2-hema-hto",
      templateId: "lab-tpl2-hema",
      key: "hto",
      label: "Hematocrito",
      dataType: LabTemplateFieldDataType.NUMBER,
      unitDefault: "%",
      refLowDefault: new Prisma.Decimal(36),
      refHighDefault: new Prisma.Decimal(48),
      order: 2
    },
    {
      id: "lab-tpl2-chem-glu",
      templateId: "lab-tpl2-chem",
      key: "glu",
      label: "Glucosa",
      dataType: LabTemplateFieldDataType.NUMBER,
      unitDefault: "mg/dL",
      refLowDefault: new Prisma.Decimal(70),
      refHighDefault: new Prisma.Decimal(110),
      order: 1
    },
    {
      id: "lab-tpl2-chem-bun",
      templateId: "lab-tpl2-chem",
      key: "bun",
      label: "BUN",
      dataType: LabTemplateFieldDataType.NUMBER,
      unitDefault: "mg/dL",
      refLowDefault: new Prisma.Decimal(7),
      refHighDefault: new Prisma.Decimal(20),
      order: 2
    },
    {
      id: "lab-tpl2-chem-crea",
      templateId: "lab-tpl2-chem",
      key: "crea",
      label: "Creatinina",
      dataType: LabTemplateFieldDataType.NUMBER,
      unitDefault: "mg/dL",
      refLowDefault: new Prisma.Decimal(0.6),
      refHighDefault: new Prisma.Decimal(1.3),
      order: 3
    }
  ];

  for (const field of labTemplateFields) {
    const templateId = tplV2Map[field.templateId] || field.templateId;
    await prisma.labTemplateField.upsert({
      where: { id: field.id },
      update: {
        templateId,
        key: field.key,
        label: field.label,
        dataType: field.dataType,
        unitDefault: field.unitDefault || null,
        refLowDefault: field.refLowDefault || null,
        refHighDefault: field.refHighDefault || null,
        order: field.order,
        isActive: true
      },
      create: {
        ...field,
        templateId,
        isActive: true
      }
    });
  }

  const labInstruments = [
    { id: "lab-inst-hema", name: "Sysmex XP-300", area: LabArea.HEMATOLOGY, connectionStatus: LabInstrumentStatus.OFFLINE },
    { id: "lab-inst-chem", name: "Cobas C111", area: LabArea.CHEMISTRY, connectionStatus: LabInstrumentStatus.UNKNOWN }
  ];

  for (const inst of labInstruments) {
    await prisma.labInstrument.upsert({
      where: { id: inst.id },
      update: { name: inst.name, area: inst.area, connectionStatus: inst.connectionStatus, mappingJson: {} },
      create: { ...inst, mappingJson: {} }
    });
  }

  const labOrders: any[] = [
    {
      code: "LT-0001",
      labPatientId: labPatientMap["lab-pt-juan"],
      priority: LabTestPriority.ROUTINE,
      status: LabTestStatus.READY_FOR_COLLECTION,
      fastingRequired: true,
      fastingConfirmed: false,
      areaHint: LabArea.HEMATOLOGY,
      requirementsNotes: "Ayuno 8h",
      items: [
        { id: "lt-item-1", name: "Biometría hemática", area: LabArea.HEMATOLOGY, status: LabTestStatus.READY_FOR_COLLECTION }
      ],
      samples: [
        {
          id: "lt-sample-1",
          barcode: "LAB-BC-0001",
          type: LabSampleType.BLOOD,
          status: LabTestStatus.READY_FOR_COLLECTION,
          area: LabArea.HEMATOLOGY,
          itemIds: ["lt-item-1"]
        }
      ]
    },
    {
      code: "LT-0002",
      labPatientId: labPatientMap["lab-pt-maria"],
      priority: LabTestPriority.URGENT,
      status: LabTestStatus.IN_PROCESS,
      fastingRequired: true,
      fastingConfirmed: true,
      areaHint: LabArea.CHEMISTRY,
      requirementsNotes: "Paciente diabética",
      items: [
        { id: "lt-item-2", name: "Perfil metabólico", area: LabArea.CHEMISTRY, status: LabTestStatus.IN_PROCESS },
        { id: "lt-item-3", name: "Electrolitos séricos", area: LabArea.ELECTROLYTES, status: LabTestStatus.QUEUED }
      ],
      samples: [
        {
          id: "lt-sample-2",
          barcode: "LAB-BC-0002",
          type: LabSampleType.BLOOD,
          status: LabTestStatus.IN_PROCESS,
          area: LabArea.CHEMISTRY,
          itemIds: ["lt-item-2", "lt-item-3"]
        }
      ],
      results: [
        {
          id: "lt-res-2",
          itemId: "lt-item-2",
          valueText: "En proceso manual",
          status: LabTestStatus.IN_PROCESS
        }
      ]
    },
    {
      code: "LT-0003",
      labPatientId: labPatientMap["lab-pt-carlos"],
      priority: LabTestPriority.STAT,
      status: LabTestStatus.TECH_VALIDATED,
      fastingRequired: false,
      fastingConfirmed: null,
      areaHint: LabArea.URINE,
      items: [
        { id: "lt-item-4", name: "EGO completo", area: LabArea.URINE, status: LabTestStatus.TECH_VALIDATED }
      ],
      samples: [
        {
          id: "lt-sample-3",
          barcode: "LAB-BC-0003",
          type: LabSampleType.URINE,
          status: LabTestStatus.RESULT_CAPTURED,
          area: LabArea.URINE,
          itemIds: ["lt-item-4"]
        }
      ],
      results: [
        {
          id: "lt-res-3",
          itemId: "lt-item-4",
          valueText: "Proteínas (+), Glucosa (-)",
          status: LabTestStatus.TECH_VALIDATED,
          resultAt: new Date(),
          flag: LabResultFlag.NORMAL
        }
      ],
      messages: [
        {
          channel: LabMessageChannel.WHATSAPP,
          recipient: "50255553333",
          status: LabMessageStatus.SENT
        }
      ]
    }
  ];

  for (const order of labOrders) {
    const savedOrder = await prisma.labTestOrder.upsert({
      where: { code: order.code },
      update: {
        patientId: order.patientId,
        priority: order.priority,
        status: order.status,
        fastingRequired: order.fastingRequired,
        fastingConfirmed: order.fastingConfirmed,
        requirementsNotes: order.requirementsNotes || null,
        areaHint: order.areaHint
      },
      create: {
        code: order.code,
        patientId: order.patientId,
        priority: order.priority,
        status: order.status,
        fastingRequired: order.fastingRequired,
        fastingConfirmed: order.fastingConfirmed,
        requirementsNotes: order.requirementsNotes || null,
        areaHint: order.areaHint
      }
    });

    const itemMap: Record<string, string> = {};
    for (const item of order.items) {
      const savedItem = await prisma.labTestItem.upsert({
        where: { id: item.id },
        update: {
          orderId: savedOrder.id,
          name: item.name,
          area: item.area,
          status: item.status,
          priority: order.priority
        },
        create: {
          id: item.id,
          orderId: savedOrder.id,
          name: item.name,
          area: item.area,
          status: item.status,
          priority: order.priority
        }
      });
      itemMap[item.id] = savedItem.id;
    }

    if (order.samples) {
      for (const sample of order.samples) {
        const savedSample = await prisma.labSample.upsert({
          where: { id: sample.id },
          update: {
            orderId: savedOrder.id,
            barcode: sample.barcode,
            type: sample.type,
            status: sample.status,
            area: sample.area
          },
          create: {
            id: sample.id,
            orderId: savedOrder.id,
            barcode: sample.barcode,
            type: sample.type,
            status: sample.status,
            area: sample.area
          }
        });

        for (const itemId of sample.itemIds || []) {
          const mapped = itemMap[itemId];
          if (mapped) {
            await prisma.labTestItem.update({ where: { id: mapped }, data: { sampleId: savedSample.id } });
          }
        }
      }
    }

    if (order.results) {
      for (const res of order.results) {
        const mappedItemId = itemMap[res.itemId];
        if (!mappedItemId) continue;
        await prisma.labTestResult.upsert({
          where: { id: res.id },
          update: {
            itemId: mappedItemId,
            status: res.status || LabTestStatus.RESULT_CAPTURED,
            valueText: res.valueText || null,
            resultAt: res.resultAt || new Date(),
            flag: res.flag || null
          },
          create: {
            id: res.id,
            itemId: mappedItemId,
            status: res.status || LabTestStatus.RESULT_CAPTURED,
            valueText: res.valueText || null,
            resultAt: res.resultAt || new Date(),
            flag: res.flag || null
          }
        });
      }
    }

    if (order.messages) {
      for (const msg of order.messages) {
        await prisma.labMessageLog.create({
          data: {
            orderId: savedOrder.id,
            channel: msg.channel,
            recipient: msg.recipient,
            status: msg.status
          }
        });
      }
    }
  }

  const currentYear = new Date().getFullYear();
  await prisma.sequenceCounter
    .upsert({
      where: { key: `B2B_PROPOSAL_${currentYear}` },
      update: {},
      create: { key: `B2B_PROPOSAL_${currentYear}`, currentValue: 0 }
    })
    .catch((err) => {
      console.error("Seed sequence counter failed", err);
    });

  console.info("[seed] CIE-10 local catalog");
  try {
    for (const item of CIE10_LOCAL_SEED) {
      await prisma.icd10Code.upsert({
        where: { code: item.code },
        update: {
          title: item.title,
          chapter: item.chapter,
          chapterRange: item.chapterRange,
          level: item.level,
          parentCode: item.parentCode,
          source: item.source,
          isActive: true
        },
        create: {
          code: item.code,
          title: item.title,
          chapter: item.chapter,
          chapterRange: item.chapterRange,
          level: item.level,
          parentCode: item.parentCode,
          source: item.source,
          isActive: true
        }
      });
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.warn(`[seed] CIE-10 omitted (table unavailable): ${details}`);
  }

  console.info("[seed] completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
