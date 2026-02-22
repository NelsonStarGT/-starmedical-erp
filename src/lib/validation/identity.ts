import { z } from "zod";

export const dpiSchema = z.string().trim().regex(/^\d{13}$/, "DPI debe tener 13 dígitos");
export const nameSchema = z.string().trim().min(1, "Requerido").regex(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\\s'-]+$/, "Solo letras");
export const phoneSchema = z.string().trim().regex(/^\\+?\\d{8,15}$/, "Teléfono inválido");
export const emailSchema = z.string().trim().email("Email inválido");
export const birthDateSchema = z.coerce
  .date()
  .max(new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 14), "Debe ser mayor de 14 años");

export const userBaseSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional()
});

export const employeeIdentitySchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  dpi: dpiSchema.optional(),
  birthDate: birthDateSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: z.string().trim().min(1, "Dirección requerida").optional()
});
