import pkg from "@prisma/client";
import type { HrEmployeeStatus as HrEmployeeStatusType } from "@prisma/client";

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
  HrEmploymentType,
  HrEmployeeStatus,
  HrEmployeeDocumentType,
  PayFrequency
} = pkg;

const prisma = new PrismaClient();

async function main() {
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

  // RRHH base
  const hrRoles = [
    { name: "ADMIN", description: "Administrador global" },
    { name: "HR_ADMIN", description: "RRHH - administración" },
    { name: "HR_USER", description: "RRHH - usuario" },
    { name: "VIEWER", description: "Solo lectura" }
  ];

  for (const role of hrRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role
    });
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
