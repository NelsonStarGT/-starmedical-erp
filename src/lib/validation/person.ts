import { z } from "zod";

export const dpiSchema = z
  .string()
  .trim()
  .regex(/^\d{13}$/, "DPI debe tener exactamente 13 dígitos");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Requerido")
  .max(120, "Muy largo")
  .regex(/^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ' -]+$/, "Solo letras y espacios");

export const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
  .refine((val) => {
    const d = new Date(val);
    const now = new Date();
    return !isNaN(d.getTime()) && d <= now;
  }, "Fecha en el futuro no permitida");

export const phoneGtSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "Teléfono debe tener 8 dígitos");

export const emailSchema = z
  .string()
  .trim()
  .email("Email inválido")
  .transform((v) => v.toLowerCase());

export const displayNameSchema = z.string().trim().min(1, "Nombre requerido");
