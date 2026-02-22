import type { Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

export function decimalToNumberOrZero(value: Prisma.Decimal | number | string | null | undefined) {
  return decimalToNumber(value) ?? 0;
}

export function serializePlan(plan: any) {
  return {
    ...plan,
    priceMonthly: decimalToNumberOrZero(plan.priceMonthly),
    priceAnnual: decimalToNumberOrZero(plan.priceAnnual)
  };
}

export function serializeContract(contract: any) {
  return {
    ...contract,
    balance: decimalToNumberOrZero(contract.balance),
    priceLockedMonthly: decimalToNumber(contract.priceLockedMonthly),
    priceLockedAnnual: decimalToNumber(contract.priceLockedAnnual),
    MembershipPayment: Array.isArray(contract.MembershipPayment)
      ? contract.MembershipPayment.map((payment: any) => ({
          ...payment,
          amount: decimalToNumberOrZero(payment.amount)
        }))
      : contract.MembershipPayment
  };
}

export function serializePayment(payment: any) {
  return {
    ...payment,
    amount: decimalToNumberOrZero(payment.amount)
  };
}
