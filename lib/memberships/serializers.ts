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
  const durationPreset = plan?.durationPreset ?? plan?.MembershipDurationPreset ?? null;
  const category = plan?.category ?? plan?.MembershipPlanCategory ?? null;
  const benefitsRaw = Array.isArray(plan?.benefits)
    ? plan.benefits
    : Array.isArray(plan?.MembershipPlanBenefit)
      ? plan.MembershipPlanBenefit
      : [];
  const benefits = benefitsRaw.map((item: any) => ({
    ...item,
    benefitCatalog: item?.benefitCatalog ?? item?.MembershipBenefitCatalog ?? null,
    MembershipBenefitCatalog: item?.benefitCatalog ?? item?.MembershipBenefitCatalog ?? null
  }));

  return {
    ...plan,
    durationPreset,
    category,
    benefits,
    MembershipDurationPreset: durationPreset,
    MembershipPlanCategory: category,
    MembershipPlanBenefit: benefits,
    priceMonthly: decimalToNumberOrZero(plan.priceMonthly),
    priceAnnual: decimalToNumberOrZero(plan.priceAnnual)
  };
}

export function serializeContract(contract: any) {
  const owner = contract?.owner ?? contract?.ClientProfile ?? null;
  const plan = contract?.plan ?? contract?.MembershipPlan ?? null;
  const billingProfile = contract?.billingProfile ?? contract?.MembershipContractBillingProfile ?? null;
  const dependents = Array.isArray(contract?.dependents)
    ? contract.dependents
    : Array.isArray(contract?.MembershipDependent)
      ? contract.MembershipDependent
      : [];
  const paymentsRaw = Array.isArray(contract?.payments)
    ? contract.payments
    : Array.isArray(contract?.MembershipPayment)
      ? contract.MembershipPayment
      : [];
  const payments = paymentsRaw.map((payment: any) => ({
    ...payment,
    amount: decimalToNumberOrZero(payment.amount)
  }));

  return {
    ...contract,
    owner,
    plan,
    billingProfile,
    dependents,
    payments,
    ClientProfile: owner,
    MembershipPlan: plan,
    MembershipContractBillingProfile: billingProfile,
    MembershipDependent: dependents,
    MembershipPayment: payments,
    balance: decimalToNumberOrZero(contract.balance),
    priceLockedMonthly: decimalToNumber(contract.priceLockedMonthly),
    priceLockedAnnual: decimalToNumber(contract.priceLockedAnnual)
  };
}

export function serializePayment(payment: any) {
  return {
    ...payment,
    amount: decimalToNumberOrZero(payment.amount)
  };
}
