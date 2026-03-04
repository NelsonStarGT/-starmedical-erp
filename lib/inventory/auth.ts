import "server-only";

export {
  resolveInventoryAuth,
  roleFromAuthenticatedRequest,
  requirePermission,
  requireRoles,
  type InventoryAuthContext
} from "@/lib/inventory/authz";
