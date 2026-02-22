CREATE TABLE IF NOT EXISTS "PortalConfig" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "version" INTEGER NOT NULL DEFAULT 1,
  "patientPortalMenus" JSONB NOT NULL,
  "companyPortalMenus" JSONB NOT NULL,
  "support" JSONB NOT NULL,
  "auth" JSONB NOT NULL,
  "appointmentsRules" JSONB NOT NULL,
  "branding" JSONB NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortalConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PortalConfig_updatedAt_idx" ON "PortalConfig"("updatedAt");
CREATE INDEX IF NOT EXISTS "PortalConfig_updatedByUserId_idx" ON "PortalConfig"("updatedByUserId");

INSERT INTO "PortalConfig" (
  "id",
  "version",
  "patientPortalMenus",
  "companyPortalMenus",
  "support",
  "auth",
  "appointmentsRules",
  "branding"
) VALUES (
  'global',
  1,
  '[
    {"key":"dashboard","label":"Dashboard","path":"/portal/app","enabled":true,"order":10},
    {"key":"appointments","label":"Mis citas","path":"/portal/app/appointments","enabled":true,"order":20},
    {"key":"appointments_new","label":"Solicitar cita","path":"/portal/app/appointments/new","enabled":true,"order":30},
    {"key":"invoices","label":"Mis facturas","path":"/portal/app/invoices","enabled":true,"order":40},
    {"key":"results","label":"Mis resultados","path":"/portal/app/results","enabled":true,"order":50},
    {"key":"membership","label":"Mi membresía","path":"/portal/app/membership","enabled":true,"order":60},
    {"key":"profile","label":"Mi perfil","path":"/portal/app/profile","enabled":true,"order":70}
  ]'::jsonb,
  '[]'::jsonb,
  '{
    "phone":"7729-3636",
    "whatsappUrl":"https://wa.me/50277293636",
    "supportText":"Para editar tu información, escribe por WhatsApp o llama al 7729-3636.",
    "hours":"Lun-Vie 08:00-17:00",
    "showSupportCard":true
  }'::jsonb,
  '{
    "otpEnabled":true,
    "magicLinkEnabled":true,
    "otpLength":6,
    "otpTtlMinutes":10,
    "sessionAccessTtlMinutes":15,
    "sessionRefreshTtlHours":24
  }'::jsonb,
  '{
    "startHour":"08:00",
    "endHour":"17:00",
    "slotMinutes":30,
    "greenThreshold":0.6,
    "yellowThreshold":0.2,
    "requestLimitPerDay":10
  }'::jsonb,
  '{
    "logoUrl":null,
    "primary":"#4aa59c",
    "secondary":"#4aadf5",
    "corporate":"#2e75ba"
  }'::jsonb
)
ON CONFLICT ("id") DO NOTHING;
