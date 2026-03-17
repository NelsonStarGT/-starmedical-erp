export type PasswordPolicyLike = {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
};

export function listPasswordPolicyViolations(password: string, policy: PasswordPolicyLike) {
  const issues: string[] = [];
  if (password.length < policy.passwordMinLength) {
    issues.push(`Minimo ${policy.passwordMinLength} caracteres.`);
  }
  if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    issues.push("Requiere al menos una mayuscula.");
  }
  if (policy.passwordRequireLowercase && !/[a-z]/.test(password)) {
    issues.push("Requiere al menos una minuscula.");
  }
  if (policy.passwordRequireNumber && !/\d/.test(password)) {
    issues.push("Requiere al menos un numero.");
  }
  if (policy.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    issues.push("Requiere al menos un simbolo.");
  }
  return issues;
}

export function assertPasswordPolicy(password: string, policy: PasswordPolicyLike) {
  const issues = listPasswordPolicyViolations(password, policy);
  if (issues.length > 0) {
    throw {
      status: 400,
      body: {
        error: "La contraseña no cumple la política de seguridad.",
        code: "PASSWORD_POLICY_FAILED",
        details: { password: issues }
      }
    };
  }
}
