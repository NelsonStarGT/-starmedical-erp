import { Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | number | bigint | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function parseDecimal(raw: any, field = "amount") {
  const num = Number(raw);
  if (!Number.isFinite(num)) throw new Error(`${field} inválido`);
  return new Prisma.Decimal(num);
}

export function computeTotals(lines: Array<{ debit?: any; credit?: any }>) {
  let debit = new Prisma.Decimal(0);
  let credit = new Prisma.Decimal(0);
  for (const line of lines) {
    if (line.debit !== undefined) {
      debit = debit.add(parseDecimal(line.debit || 0));
    }
    if (line.credit !== undefined) {
      credit = credit.add(parseDecimal(line.credit || 0));
    }
  }
  return { debit, credit };
}

export function serializeAccount(account: any) {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
    parentId: account.parentId,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

export function serializeLine(line: any) {
  return {
    id: line.id,
    entryId: line.entryId,
    accountId: line.accountId,
    accountCode: line.account?.code,
    accountName: line.account?.name,
    debit: decimalToNumber(line.debit),
    credit: decimalToNumber(line.credit),
    memo: line.memo,
    entityType: line.entityType,
    entityId: line.entityId,
    createdAt: line.createdAt
  };
}

export function serializeEntry(entry: any) {
  return {
    id: entry.id,
    date: entry.date,
    reference: entry.reference,
    description: entry.description,
    branchId: entry.branchId,
    legalEntityId: entry.legalEntityId,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    createdById: entry.createdById,
    totalDebit: decimalToNumber(entry.totalDebit),
    totalCredit: decimalToNumber(entry.totalCredit),
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    lines: Array.isArray(entry.lines) ? entry.lines.map(serializeLine) : undefined
  };
}
