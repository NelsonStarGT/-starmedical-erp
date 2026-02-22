import type { AttendanceCloseStatus, HrEmploymentType } from "@prisma/client";

export type EmployeeLite = { id: string; status: "ACTIVE" | "SUSPENDED" | "TERMINATED"; terminationDate?: string | null };
export type EngagementLite = {
  id: string;
  employeeId: string;
  legalEntityId: string;
  employmentType: HrEmploymentType;
  isPrimary?: boolean;
  startDate: string;
  endDate?: string | null;
};
export type CompensationLite = {
  id: string;
  engagementId: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  baseSalary?: number | null;
};
export type AttendanceLite = { employeeId: string; date: string; closeStatus: AttendanceCloseStatus };

function within(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export function eligibleEmployees(
  employees: EmployeeLite[],
  engagements: EngagementLite[],
  compensations: CompensationLite[],
  legalEntityId: string,
  periodStart: string,
  periodEnd: string
) {
  const engagementByEmp = new Map<string, EngagementLite>();
  engagements
    .filter(
      (eng) =>
        eng.legalEntityId === legalEntityId &&
        eng.isPrimary &&
        within(eng.startDate, "0000-01-01", periodEnd) &&
        (!eng.endDate || eng.endDate >= periodStart)
    )
    .forEach((eng) => engagementByEmp.set(eng.employeeId, eng));

  const compByEng = new Map<string, CompensationLite>();
  compensations
    .filter(
      (c) =>
        c.isActive &&
        within(c.effectiveFrom, "0000-01-01", periodEnd) &&
        (!c.effectiveTo || c.effectiveTo >= periodStart)
    )
    .forEach((c) => compByEng.set(c.engagementId, c));

  return employees.filter((emp) => {
    if (emp.status !== "ACTIVE") return false;
    if (emp.terminationDate) return false;
    const eng = engagementByEmp.get(emp.id);
    if (!eng) return false;
    if (eng.employmentType === "DEPENDENCIA" && !compByEng.get(eng.id)) return false;
    return true;
  });
}

export function hasAttendanceBlockers(records: AttendanceLite[], periodStart: string, periodEnd: string) {
  return records.some((rec) => within(rec.date, periodStart, periodEnd) && rec.closeStatus !== "CLOSED");
}

export function snapshotCompensation(comp: CompensationLite) {
  return JSON.parse(JSON.stringify(comp));
}
