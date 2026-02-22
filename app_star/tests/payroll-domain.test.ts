import { test } from "node:test";
import assert from "node:assert/strict";
import { eligibleEmployees, hasAttendanceBlockers, snapshotCompensation } from "../lib/hr/payrollDomain";
import { requirePermission } from "../lib/rbac";

const employeeActive = { id: "e1", status: "ACTIVE" as const, terminationDate: null };
const employeeTerminated = { id: "e2", status: "TERMINATED" as const, terminationDate: "2024-12-01" };

test("eligible employees exclude terminated and require compensation for dependencia", () => {
  const employees = [employeeActive, employeeTerminated];
  const engagements = [
    { id: "eng1", employeeId: "e1", legalEntityId: "le1", employmentType: "DEPENDENCIA" as const, isPrimary: true, startDate: "2024-01-01" },
    { id: "eng2", employeeId: "e2", legalEntityId: "le1", employmentType: "DEPENDENCIA" as const, isPrimary: true, startDate: "2024-01-01" }
  ];
  const compensations = [{ id: "c1", engagementId: "eng1", isActive: true, effectiveFrom: "2024-01-01", baseSalary: 1000 }];

  const eligibles = eligibleEmployees(employees, engagements, compensations, "le1", "2024-02-01", "2024-02-28");
  assert.equal(eligibles.length, 1);
  assert.equal(eligibles[0].id, "e1");
});

test("attendance blockers detected when closeStatus not closed", () => {
  const records = [
    { employeeId: "e1", date: "2024-02-05", closeStatus: "OPEN" as const },
    { employeeId: "e1", date: "2024-02-06", closeStatus: "CLOSED" as const }
  ];
  assert.equal(hasAttendanceBlockers(records, "2024-02-01", "2024-02-28"), true);
});

test("compensation snapshot remains unchanged after mutation", () => {
  const comp = { id: "c1", engagementId: "eng1", isActive: true, effectiveFrom: "2024-01-01", baseSalary: 2000 };
  const snap = snapshotCompensation(comp);
  comp.baseSalary = 3000;
  assert.equal(snap.baseSalary, 2000);
});

test("publish/approve permissions enforced by catalog", () => {
  const user = { id: "u1", email: "a@b.com", roles: ["HR_USER"], permissions: ["HR:PAYROLL:READ"], deniedPermissions: [] };
  const approve = requirePermission(user as any, "HR:PAYROLL:APPROVE");
  assert.notEqual(approve.errorResponse, null);
});
