import { ClientCatalogType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { warnDevMissingRequiredDocsDelegate } from "@/lib/clients/requiredDocuments";
import { safeGetClientRulesConfig } from "@/lib/clients/rulesConfig";
import ClientCatalogManager from "@/components/clients/config/ClientCatalogManager";
import ClientRulesEditor from "@/components/clients/config/ClientRulesEditor";
import ClientRequiredDocumentsRulesEditor from "@/components/clients/config/ClientRequiredDocumentsRulesEditor";
import GeoCatalogManager from "@/components/clients/config/GeoCatalogManager";

type RequiredDocRuleRow = Prisma.ClientRequiredDocumentRuleGetPayload<{
  select: {
    id: true;
    clientType: true;
    documentTypeId: true;
    isRequired: true;
    requiresApproval: true;
    requiresExpiry: true;
    weight: true;
    isActive: true;
    documentType: { select: { name: true } };
  };
}>;

type RequiredDocRulesDelegate = {
  findMany?: (args: Prisma.ClientRequiredDocumentRuleFindManyArgs) => Promise<RequiredDocRuleRow[]>;
};

async function safeRequiredDocRulesFindMany(args: Prisma.ClientRequiredDocumentRuleFindManyArgs): Promise<RequiredDocRuleRow[]> {
  const delegate = (prisma as unknown as { clientRequiredDocumentRule?: RequiredDocRulesDelegate }).clientRequiredDocumentRule;
  if (!delegate?.findMany) {
    warnDevMissingRequiredDocsDelegate("clients.config.requiredDocs.rules.findMany");
    return [];
  }

  try {
    return await delegate.findMany(args);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("clients.config.requiredDocs.rules.findMany", error);
      return [];
    }
    throw error;
  }
}

export default async function ClientesConfiguracionPage() {
  const [catalogItems, rules, requiredDocumentRules] = await Promise.all([
    prisma.clientCatalogItem.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, type: true, name: true, description: true, isActive: true }
    }),
    safeGetClientRulesConfig("clients.config"),
    safeRequiredDocRulesFindMany({
      orderBy: [{ clientType: "asc" }, { documentType: { name: "asc" } }],
      select: {
        id: true,
        clientType: true,
        documentTypeId: true,
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: true,
        weight: true,
        isActive: true,
        documentType: { select: { name: true } }
      }
    })
  ]);

  const byType = (type: ClientCatalogType) => catalogItems.filter((item) => item.type === type);
  const effectiveRules = rules;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Clientes · Configuración</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Catálogos y reglas
        </h2>
        <p className="text-sm text-slate-600">
          Edita catálogos, desactiva items (soft delete) y define reglas operativas. No se permite borrar elementos en uso.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientCatalogManager title="Tipos de institución" type={ClientCatalogType.INSTITUTION_TYPE} items={byType(ClientCatalogType.INSTITUTION_TYPE)} />
        <ClientCatalogManager title="Sectores" type={ClientCatalogType.SECTOR} items={byType(ClientCatalogType.SECTOR)} />
        <ClientCatalogManager title="Estados de cliente" type={ClientCatalogType.CLIENT_STATUS} items={byType(ClientCatalogType.CLIENT_STATUS)} />
        <ClientCatalogManager title="Tipos de relación comercial" type={ClientCatalogType.RELATION_TYPE} items={byType(ClientCatalogType.RELATION_TYPE)} />
        <ClientCatalogManager title="Condiciones de pago" type={ClientCatalogType.PAYMENT_TERM} items={byType(ClientCatalogType.PAYMENT_TERM)} />
        <ClientCatalogManager title="Tipos de documento" type={ClientCatalogType.DOCUMENT_TYPE} items={byType(ClientCatalogType.DOCUMENT_TYPE)} />
      </div>

      <ClientRulesEditor
        initialAlertDays30={effectiveRules.alertDays30}
        initialAlertDays15={effectiveRules.alertDays15}
        initialAlertDays7={effectiveRules.alertDays7}
        initialHealthProfileWeight={effectiveRules.healthProfileWeight}
        initialHealthDocsWeight={effectiveRules.healthDocsWeight}
      />

      <ClientRequiredDocumentsRulesEditor
        rules={requiredDocumentRules.map((rule) => ({
          id: rule.id,
          clientType: rule.clientType,
          documentTypeId: rule.documentTypeId,
          documentTypeName: rule.documentType.name,
          isRequired: rule.isRequired,
          requiresApproval: rule.requiresApproval,
          requiresExpiry: rule.requiresExpiry,
          weight: rule.weight,
          isActive: rule.isActive
        }))}
        documentTypeOptions={byType(ClientCatalogType.DOCUMENT_TYPE).map((item) => ({
          id: item.id,
          name: item.name,
          isActive: item.isActive
        }))}
      />

      <GeoCatalogManager />
    </div>
  );
}
