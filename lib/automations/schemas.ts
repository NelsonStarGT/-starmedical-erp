import { z } from "zod";

export const automationCreateSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido"),
  moduleKey: z.string().trim().min(2, "Módulo requerido"),
  triggerType: z.string().trim().min(2, "Trigger requerido"),
  configJson: z.record(z.any()).optional(),
  isEnabled: z.boolean().optional()
});
