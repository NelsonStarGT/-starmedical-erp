type ResolveSecretOptions = {
  envKeys: string[];
  label: string;
  devFallback: string;
};

function firstNonEmpty(values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return null;
}

export function resolveRuntimeSecret(options: ResolveSecretOptions) {
  const configured = firstNonEmpty(options.envKeys.map((key) => process.env[key]));
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return options.devFallback;
  }

  throw new Error(
    `${options.label} no está configurado. Define ${options.envKeys.join(" o ")} antes de iniciar la app fuera de development.`
  );
}

export function getAuthSecret() {
  return resolveRuntimeSecret({
    envKeys: ["AUTH_SECRET"],
    label: "AUTH_SECRET",
    devFallback: "dev-star-secret"
  });
}

export function getClientRegistrationSecret() {
  return resolveRuntimeSecret({
    envKeys: ["CLIENT_REGISTRATION_TOKEN_SECRET", "PORTAL_AUTH_PEPPER", "APP_SECRET", "AUTH_SECRET"],
    label: "CLIENT_REGISTRATION_TOKEN_SECRET",
    devFallback: "dev-client-registration-secret"
  });
}

export function getPortalSigningSecret() {
  return resolveRuntimeSecret({
    envKeys: ["PORTAL_AUTH_PEPPER", "APP_SECRET", "AUTH_SECRET", "EMAIL_SECRET_KEY"],
    label: "PORTAL_AUTH_PEPPER",
    devFallback: "dev-star-portal-pepper"
  });
}

export function getApiKeyPepper() {
  return resolveRuntimeSecret({
    envKeys: ["API_KEY_PEPPER", "AUTH_SECRET"],
    label: "API_KEY_PEPPER",
    devFallback: "dev-star-api-key-pepper"
  });
}
