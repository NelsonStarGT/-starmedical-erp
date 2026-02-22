"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { isValidEmail } from "@/lib/utils";
import { Cliente } from "@/lib/types";

type QuickPatientData = {
  nombres: string;
  apellidos: string;
  celular: string;
  fechaNacimiento: string;
  sexo: "Masculino" | "Femenino" | "Otro";
  dpi?: string;
  correo?: string;
  empresaId?: number;
};

type Option = { id: number; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  empresas: Option[];
  onSave: (data: QuickPatientData) => void;
  successMessage?: string;
};

export function QuickPatientModal({ open, onClose, empresas, onSave, successMessage }: Props) {
  const [form, setForm] = useState<QuickPatientData>({
    nombres: "",
    apellidos: "",
    celular: "",
    fechaNacimiento: "",
    sexo: "Masculino"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nombres) errs.nombres = "Requerido";
    if (!form.apellidos) errs.apellidos = "Requerido";
    if (!form.celular) errs.celular = "Requerido";
    if (!form.fechaNacimiento) errs.fechaNacimiento = "Requerido";
    if (!form.sexo) errs.sexo = "Requerido";
    if (form.correo && !isValidEmail(form.correo)) errs.correo = "Correo inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo paciente rápido"
      footer={
        <div className="flex items-center justify-between">
          {successMessage && (
            <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              {successMessage}
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
            >
              Guardar paciente
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderInput("Nombres", "nombres", true)}
        {renderInput("Apellidos", "apellidos", true)}
        {renderInput("Celular", "celular", true)}
        {renderInput("Fecha de nacimiento", "fechaNacimiento", true, "date")}
        {renderSelect("Sexo", "sexo", ["Masculino", "Femenino", "Otro"])}
        {renderInput("DPI", "dpi")}
        {renderInput("Correo", "correo", false, "email")}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Empresa (opcional)</label>
          <select
            value={form.empresaId || ""}
            onChange={(e) => setForm({ ...form, empresaId: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Sin empresa</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );

  function renderInput(label: string, key: keyof QuickPatientData, required = false, type = "text") {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <input
          type={type}
          value={(form as any)[key] || ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          placeholder={label}
        />
        {required && errors[key as string] && (
          <p className="text-xs text-red-600">{errors[key as string]}</p>
        )}
      </div>
    );
  }

  function renderSelect(label: string, key: keyof QuickPatientData, options: string[]) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <select
          value={(form as any)[key] || ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">Selecciona</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {errors[key as string] && <p className="text-xs text-red-600">{errors[key as string]}</p>}
      </div>
    );
  }
}
