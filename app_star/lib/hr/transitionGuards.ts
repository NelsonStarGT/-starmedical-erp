export function ensureOnboardingNotActive(onboardingStatus: string) {
  if (onboardingStatus === "ACTIVE") {
    throw { status: 409, body: { error: "Onboarding ya completado" } };
  }
}

export function ensureCanSuspend(status: string) {
  if (status === "TERMINATED") throw { status: 409, body: { error: "No se puede suspender terminado" } };
  if (status === "SUSPENDED") throw { status: 409, body: { error: "Ya está suspendido" } };
}

export function ensureCanActivate(status: string) {
  if (status === "TERMINATED") throw { status: 409, body: { error: "No se puede activar terminado" } };
  if (status === "ACTIVE") throw { status: 409, body: { error: "Ya está activo" } };
}

export function ensureCanTerminate(status: string) {
  if (status === "TERMINATED") throw { status: 409, body: { error: "Ya está terminado" } };
}

export function ensureOnboardingForPayroll(onboardingStatus: string) {
  if (onboardingStatus !== "ACTIVE") {
    throw { status: 409, body: { error: "Empleado no elegible (onboarding incompleto)" } };
  }
}
