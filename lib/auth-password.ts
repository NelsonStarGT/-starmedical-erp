import bcrypt from "bcryptjs";
import { getTenantSecurityPolicy } from "@/lib/config-central/security-policy";
import { assertPasswordPolicy, listPasswordPolicyViolations } from "@/lib/password-policy";
import { normalizeTenantId } from "@/lib/tenant";

const DEFAULT_SALT_ROUNDS = 10;

export async function hashPasswordForTenant(password: string, tenantId: unknown, saltRounds = DEFAULT_SALT_ROUNDS) {
  const policy = await getTenantSecurityPolicy(normalizeTenantId(tenantId));
  assertPasswordPolicy(password, policy);
  return hashPassword(password, saltRounds);
}

export async function hashPassword(password: string, saltRounds = DEFAULT_SALT_ROUNDS) {
  return bcrypt.hash(password, saltRounds);
}

export async function validatePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export { assertPasswordPolicy, listPasswordPolicyViolations };
