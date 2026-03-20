import { z } from "zod";

export const emailSchema = z.string().trim().email("Correo inválido").max(160);
export const nameSchema = z.string().trim().min(1, "Nombre requerido").max(120);
export const dpiSchema = z.string().trim().regex(/^\d{13}$/, "DPI inválido");
export const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida");
export const phoneGtSchema = z.string().trim().regex(/^[0-9]{8,15}$/, "Teléfono inválido");
export const displayNameSchema = z.string().trim().min(1).max(160);
