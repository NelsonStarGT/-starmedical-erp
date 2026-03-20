import bcrypt from "bcryptjs";
import { getTenantSecurityPolicy } from "@/lib/config-central/security-policy";

const DEFAULT_SALT_ROUNDS = 10;

type PasswordPolicy = Awaited<ReturnType<typeof getTenantSecurityPolicy>>;

export function listPasswordPolicyViolations(password: string, policy: PasswordPolicy) {
  const issues: string[] = [];

  if (password.length < policy.passwordMinLength) {
    issues.push(`La contraseña debe tener al menos ${policy.passwordMinLength} caracteres.`);
  }
  if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    issues.push("Debe incluir al menos una mayúscula.");
  }
  if (policy.passwordRequireLowercase && !/[a-z]/.test(password)) {
    issues.push("Debe incluir al menos una minúscula.");
  }
  if (policy.passwordRequireNumber && !/[0-9]/.test(password)) {
    issues.push("Debe incluir al menos un número.");
  }
  if (policy.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    issues.push("Debe incluir al menos un símbolo.");
  }

  return issues;
}

export function assertPasswordPolicy(password: string, policy: PasswordPolicy) {
  const violations = listPasswordPolicyViolations(password, policy);
  if (violations.length > 0) {
    throw {
      status: 400,
      body: {
        error: "La contraseña no cumple la política vigente",
        details: { password: violations }
      }
    };
  }
}

export async function hashPassword(password: string, saltRounds = DEFAULT_SALT_ROUNDS) {
  return bcrypt.hash(password, saltRounds);
}

export async function hashPasswordForTenant(password: string, tenantId: unknown, saltRounds = DEFAULT_SALT_ROUNDS) {
  const policy = await getTenantSecurityPolicy(typeof tenantId === "string" && tenantId.trim() ? tenantId : "global");
  assertPasswordPolicy(password, policy);
  return hashPassword(password, saltRounds);
}

export async function validatePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
