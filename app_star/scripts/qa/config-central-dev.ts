import { spawnSync } from "node:child_process";
import process from "node:process";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production") {
  console.error("[FAIL] qa:config-central:dev está bloqueado en production. Usa STAR_ERP_SESSION explícito.");
  process.exit(1);
}

const authSecret = process.env.AUTH_SECRET || "dev-star-secret";

const payload = {
  id: "dev-config-admin",
  email: "dev.config@starmedical.local",
  name: "Dev Config Admin",
  roles: ["ADMIN"],
  permissions: [
    "SYSTEM:ADMIN",
    "CONFIG_BRANCH_READ",
    "CONFIG_BRANCH_WRITE",
    "CONFIG_SAT_READ",
    "CONFIG_SAT_WRITE",
    "CONFIG_THEME_READ",
    "CONFIG_THEME_WRITE",
    "CONFIG_EMAIL_READ",
    "CONFIG_EMAIL_WRITE",
    "CONFIG_API_READ",
    "CONFIG_API_WRITE",
    "CONFIG_BACKUP_READ",
    "CONFIG_BACKUP_WRITE"
  ],
  deniedPermissions: [],
  branchId: null,
  legalEntityId: null
};

const token = jwt.sign(payload, authSecret, { expiresIn: 60 * 60 });

const child = spawnSync("bash", ["scripts/qa/config-central.sh"], {
  stdio: "inherit",
  env: {
    ...process.env,
    STAR_ERP_SESSION: token
  }
});

if (typeof child.status === "number") {
  process.exit(child.status);
}

process.exit(1);
